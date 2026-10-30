// Dueño: C — Mapa y agenda
// Estado de un evento guardado (toggle Avisarme). Local + API.
// Query pide al servidor. SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { escribirConsulta, invalidarConsultas } from '@/compartido/consulta';
import { hayRedAhora } from '@/compartido/useRed';
import { useSesion } from '@/cuenta/SesionContext';
import {
  borrarEventoGuardado,
  insertarEventoGuardado,
  leerEventoGuardado,
  leerEventosGuardados,
} from '@/eventos/eventosDb';
import {
  agendarRecordatorio,
  cancelarRecordatorio,
  type ResultadoRecordatorio,
} from '@/eventos/recordatorios';
import {
  guardarEventoEnCuenta,
  obtenerEventosGuardados,
  quitarEventoDeLaCuenta,
} from '@/servicios/eventos-guardados';
import type { Evento } from '@/tipos/evento';

// Guardar / quitar un evento de "avisame".
// Mirar la agenda no pide cuenta. Guardar sí: el botón llama
// exigirCuenta() antes.
//
// Primero SQLite (se ve al toque y anda sin red). Si hay señal,
// se lo cuenta a GET/PUT/DELETE /yo/eventos-guardados.

function fechaIsoAhora(): string {
  return new Date().toISOString();
}

function filaLocal(usuarioId: string, eventoId: string) {
  return {
    id: `eg-${usuarioId}-${eventoId}`,
    usuarioId,
    eventoId,
    creadoEn: fechaIsoAhora(),
  };
}

// El teléfono manda: sube lo que se guardó sin señal y saca
// de la API lo que se destildó acá. Si este teléfono no tenía
// ninguno, copia los de la cuenta (otro celular).
export async function sincronizarEventosGuardados(usuarioId: string): Promise<void> {
  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[eventos] No se pudo saber si hay red', errorRed);
    return;
  }

  if (!hayRed) {
    return;
  }

  const respuesta = await obtenerEventosGuardados();
  if ('error' in respuesta) {
    console.log('[eventos] No se pudieron traer los guardados', respuesta.error);
    return;
  }

  const locales = await leerEventosGuardados(usuarioId);
  const idsLocales = new Set(locales.map((fila) => fila.eventoId));
  const idsRemotos = new Set(respuesta.datos.map((evento) => evento.id));

  if (locales.length === 0) {
    for (const evento of respuesta.datos) {
      await insertarEventoGuardado(filaLocal(usuarioId, evento.id));
    }
    return;
  }

  for (const remoto of respuesta.datos) {
    if (!idsLocales.has(remoto.id)) {
      await quitarEventoDeLaCuenta(remoto.id);
    }
  }

  for (const local of locales) {
    if (!idsRemotos.has(local.eventoId)) {
      await guardarEventoEnCuenta(local.eventoId);
    }
  }
}

export const claveEventoGuardado = (usuarioId: string, eventoId: string) =>
  ['evento-guardado', usuarioId, eventoId] as const;

async function pedirEventoGuardado(usuarioId: string, eventoId: string): Promise<boolean> {
  await sincronizarEventosGuardados(usuarioId);
  const actualizada = await leerEventoGuardado(usuarioId, eventoId);
  return actualizada !== null;
}

export function useEventoGuardado(eventoId: string): {
  estaGuardado: boolean;
  cargando: boolean;
  guardar: (evento: Evento) => Promise<ResultadoRecordatorio>;
  quitar: () => Promise<void>;
} {
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  const [desdeSqlite, setDesdeSqlite] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDesdeSqlite(null);
    if (!usuarioId || !eventoId) {
      return;
    }

    leerEventoGuardado(usuarioId, eventoId)
      .then((fila) => {
        if (!cancelado) {
          setDesdeSqlite(fila !== null);
        }
      })
      .catch((error) => {
        console.error('[eventos] No se pudo leer si está guardado', error);
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioId, eventoId]);

  const consulta = useQuery({
    queryKey:
      usuarioId && eventoId
        ? claveEventoGuardado(usuarioId, eventoId)
        : ['evento-guardado', 'sin-sesion'],
    queryFn: () => pedirEventoGuardado(usuarioId as string, eventoId),
    enabled: Boolean(usuarioId) && Boolean(eventoId),
    placeholderData: desdeSqlite ?? undefined,
  });

  const estaGuardado = consulta.data ?? false;
  const cargando =
    Boolean(usuarioId) && Boolean(eventoId) && consulta.isPending && desdeSqlite === null;

  async function guardar(evento: Evento): Promise<ResultadoRecordatorio> {
    if (!usuarioId) {
      return 'noCorresponde';
    }

    const clave = claveEventoGuardado(usuarioId, evento.id);
    await insertarEventoGuardado(filaLocal(usuarioId, evento.id));
    escribirConsulta(clave, true);

    if (await hayRedAhora()) {
      const respuesta = await guardarEventoEnCuenta(evento.id);
      if ('error' in respuesta) {
        console.log('[eventos] El servicio no pudo guardar. Quedó en SQLite.');
      }
    }

    await invalidarConsultas(clave);
    return agendarRecordatorio(evento);
  }

  async function quitar(): Promise<void> {
    if (!usuarioId) {
      return;
    }

    const clave = claveEventoGuardado(usuarioId, eventoId);
    await borrarEventoGuardado(usuarioId, eventoId);
    escribirConsulta(clave, false);
    await cancelarRecordatorio(eventoId);

    if (await hayRedAhora()) {
      const respuesta = await quitarEventoDeLaCuenta(eventoId);
      if ('error' in respuesta) {
        console.log('[eventos] El servicio no pudo quitar. Quedó en SQLite.');
      }
    }
    await invalidarConsultas(clave);
  }

  return { estaGuardado, cargando, guardar, quitar };
}
