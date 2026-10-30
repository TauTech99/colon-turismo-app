// Dueño: C — Mapa y agenda
// "Avisarme": recordatorio 60 min antes; cancela si suspendido/cancelado.

import { Platform } from 'react-native';

import {
  CANAL_EVENTOS,
  cargarNotificaciones,
  pedirPermisoNotificaciones,
} from '@/compartido/notificaciones';
import { leerIdsEventosGuardados } from '@/eventos/eventosDb';
import type { Evento } from '@/tipos/evento';

// Recordatorio local antes de que empiece, y aviso si pasó a
// cancelado o suspendido. PRD §7.3 y req. 6 (hecho real).
//
// El recordatorio puede sonar con la app cerrada.
// El aviso de suspensión/cancelación sale cuando la agenda o el
// detalle se actualizan con red (no hay push).

export const MINUTOS_ANTES_RECORDATORIO = 60;

const enElTelefono = Platform.OS === 'android' || Platform.OS === 'ios';

// La agenda y el detalle pueden refrescar a la vez. Sin esto,
// el mismo cambio dispararía dos avisos.
const avisosYaDisparados = new Set<string>();

function idRecordatorio(eventoId: string): string {
  return `recordatorio:${eventoId}`;
}

function canalSiAndroid(): string | undefined {
  return Platform.OS === 'android' ? CANAL_EVENTOS : undefined;
}

function esCanceladoOSuspendido(evento: Evento): boolean {
  return evento.estado === 'cancelado' || evento.estado === 'suspendido';
}

export async function cancelarRecordatorio(eventoId: string): Promise<void> {
  if (!enElTelefono) {
    return;
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(idRecordatorio(eventoId));
  } catch (error) {
    console.log('[recordatorios] No había recordatorio para cancelar', eventoId, error);
  }
}

// 'sinPermiso': el botón le avisa al turista que no va a sonar.
// 'noCorresponde': evento ya empezado, no programado o sin módulo.
export type ResultadoRecordatorio = 'agendado' | 'sinPermiso' | 'noCorresponde';

// Programa el aviso 60 minutos antes de `inicio`.
// Si ya falta menos, suena a los 2 segundos: igual es "antes de que empiece".
export async function agendarRecordatorio(evento: Evento): Promise<ResultadoRecordatorio> {
  if (!enElTelefono) {
    return 'noCorresponde';
  }

  if (evento.estado !== 'programado') {
    return 'noCorresponde';
  }

  const inicio = new Date(evento.inicio);
  const ahora = Date.now();
  if (inicio.getTime() <= ahora) {
    console.log('[recordatorios] El evento ya empezó. No se agenda recordatorio.');
    return 'noCorresponde';
  }

  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) {
    console.log('[recordatorios] Sin permiso. El evento quedó guardado igual.');
    return 'sinPermiso';
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return 'noCorresponde';
  }

  await cancelarRecordatorio(evento.id);

  const cuando = new Date(inicio.getTime() - MINUTOS_ANTES_RECORDATORIO * 60 * 1000);
  const faltaMenosDeUnaHora = cuando.getTime() <= ahora;
  const canal = canalSiAndroid();

  if (faltaMenosDeUnaHora) {
    await Notifications.scheduleNotificationAsync({
      identifier: idRecordatorio(evento.id),
      content: {
        title: 'Recordatorio',
        body: `En un rato empieza: ${evento.titulo}`,
        data: { tipo: 'evento', id: evento.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        ...(canal ? { channelId: canal } : {}),
      },
    });
    console.log(`[recordatorios] Agendado ${evento.id} en 2 segundos (falta menos de una hora)`);
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier: idRecordatorio(evento.id),
      content: {
        title: 'Recordatorio',
        body: `En un rato empieza: ${evento.titulo}`,
        data: { tipo: 'evento', id: evento.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: cuando,
        ...(canal ? { channelId: canal } : {}),
      },
    });
    console.log(`[recordatorios] Agendado ${evento.id} para ${cuando.toISOString()}`);
  }

  return 'agendado';
}

async function avisarCancelacionOSuspension(evento: Evento): Promise<void> {
  if (!enElTelefono) {
    return;
  }

  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) {
    console.log('[recordatorios] Sin permiso. No se pudo mostrar el aviso.');
    return;
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return;
  }

  const seSuspendio = evento.estado === 'suspendido';
  const titulo = seSuspendio ? `Se suspendió ${evento.titulo}` : `Se canceló ${evento.titulo}`;
  const cuerpo = seSuspendio
    ? 'Quedó suspendido. El recordatorio ya no vale.'
    : 'Este evento ya no se va a hacer. El recordatorio ya no vale.';

  const canal = canalSiAndroid();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      data: { tipo: 'evento', id: evento.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      ...(canal ? { channelId: canal } : {}),
    },
  });

  console.log(`[recordatorios] Aviso de ${evento.estado}: ${evento.id}`);
}

// Compara el estado que había en SQLite con el que acaba de llegar
// con red. Solo avisa si ESA persona lo había guardado, y solo
// la primera vez que pasa a cancelado o suspendido.
export async function revisarCambiosDeEstado(
  anteriores: Evento[],
  nuevos: Evento[],
): Promise<void> {
  let idsGuardados: string[];
  try {
    idsGuardados = await leerIdsEventosGuardados();
  } catch (error) {
    console.error('[recordatorios] No se pudieron leer los eventos guardados', error);
    return;
  }

  if (idsGuardados.length === 0) {
    return;
  }

  const guardados = new Set(idsGuardados);
  const porIdAnterior = new Map(anteriores.map((evento) => [evento.id, evento]));

  for (const nuevo of nuevos) {
    if (!guardados.has(nuevo.id)) {
      continue;
    }

    const anterior = porIdAnterior.get(nuevo.id);
    if (!anterior) {
      continue;
    }

    if (esCanceladoOSuspendido(nuevo) && !esCanceladoOSuspendido(anterior)) {
      if (avisosYaDisparados.has(nuevo.id)) {
        continue;
      }
      avisosYaDisparados.add(nuevo.id);
      await cancelarRecordatorio(nuevo.id);
      await avisarCancelacionOSuspension(nuevo);
    }
  }
}
