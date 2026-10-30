// Dueño: C — Mapa y agenda
// Agenda por día + detalle. Query pide al servidor. SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { claveDiaEnColon, comienzoDelDiaColon, ZONA_COLON } from '@/compartido/zonaColon';
import { guardarEvento, guardarEventos, leerEventoPorId, leerEventos } from '@/eventos/eventosDb';
import { revisarCambiosDeEstado } from '@/eventos/recordatorios';
import { ERROR_RED } from '@/servicios/cliente';
import { obtenerEventoPorId, obtenerEventos } from '@/servicios/eventos';
import type { EstadoEvento, Evento } from '@/tipos/evento';

export type DiaAgenda = {
  clave: string;
  titulo: string;
  eventos: Evento[];
};

export { claveDiaEnColon };

export function textoHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA_COLON,
  });
}

export function textoFechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA_COLON,
  });
}

function tituloDia(clave: string, hoy: string): string {
  if (clave === hoy) {
    return 'Hoy';
  }
  const fecha = new Date(`${clave}T12:00:00-03:00`);
  const largo = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA_COLON,
  });
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

// R8 de la API: sin `fin`, el evento cuenta hasta las 23:59 del día de `inicio`.
function finEfectivoEvento(evento: Evento): Date {
  if (evento.fin !== null) {
    return new Date(evento.fin);
  }
  return new Date(`${claveDiaEnColon(evento.inicio)}T23:59:59-03:00`);
}

function siguienteDiaColon(clave: string): string {
  const inicio = comienzoDelDiaColon(clave);
  return claveDiaEnColon(new Date(inicio.getTime() + 24 * 60 * 60 * 1000));
}

// Función pura: misma lista → mismos grupos. El hook la usa para
// armar la agenda. Un evento que cruza medianoche aparece en cada
// día que toca (R8: peña 21:00–02:00, viernes y sábado).
export function agruparDesdeHoy(eventos: Evento[], ahora: Date = new Date()): DiaAgenda[] {
  const hoy = claveDiaEnColon(ahora);
  const comienzoHoy = comienzoDelDiaColon(hoy);
  const porDia = new Map<string, Evento[]>();

  for (const evento of eventos) {
    const inicio = new Date(evento.inicio);
    const fin = finEfectivoEvento(evento);
    // Terminó antes de hoy, o justo a las 00:00: no cuenta hoy (misma R8).
    if (fin.getTime() <= comienzoHoy.getTime()) {
      continue;
    }

    let clave = inicio.getTime() < comienzoHoy.getTime() ? hoy : claveDiaEnColon(evento.inicio);
    for (let i = 0; i < 14; i += 1) {
      const desde = comienzoDelDiaColon(clave);
      const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
      const seSuperpone = inicio.getTime() < hasta.getTime() && fin.getTime() > desde.getTime();
      if (!seSuperpone) {
        break;
      }
      const lista = porDia.get(clave) ?? [];
      lista.push(evento);
      porDia.set(clave, lista);
      clave = siguienteDiaColon(clave);
    }
  }

  return [...porDia.keys()]
    .sort()
    .map((clave) => {
      const lista = (porDia.get(clave) ?? [])
        .slice()
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      return {
        clave,
        titulo: tituloDia(clave, hoy),
        eventos: lista,
      };
    });
}

// PRD §7.3: "cuánto dura". Si no hay `fin`, no se inventa.
export function textoDuracion(evento: Evento): string {
  if (evento.fin === null) {
    return 'Sin hora de fin';
  }

  const minutos = Math.round(
    (new Date(evento.fin).getTime() - new Date(evento.inicio).getTime()) / 60000,
  );
  if (minutos <= 0) {
    return 'Sin hora de fin';
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) {
    return `${resto} min`;
  }
  if (resto === 0) {
    return `${horas} h`;
  }
  return `${horas} h ${resto} min`;
}

// Interfaz: precio 0 = gratis, null = no aplica.
export function textoPrecioEvento(precio: number | null): string {
  if (precio === null) {
    return 'Precio no informado';
  }
  if (precio === 0) {
    return 'Gratis';
  }
  return `$ ${precio}`;
}

export function textoEstado(estado: EstadoEvento): string {
  if (estado === 'programado') {
    return 'Programado';
  }
  if (estado === 'suspendido') {
    return 'Suspendido';
  }
  if (estado === 'cancelado') {
    return 'Cancelado';
  }
  return 'Finalizado';
}

// Misma clave en Agenda: Query no pide dos veces si hay más de una pantalla.
export const CLAVE_EVENTOS = ['eventos'] as const;
export const claveEvento = (id: string) => ['evento', id] as const;

// queryFn habla con el servicio, no con Axios. Si hay red, pide y
// guarda en SQLite. Si no hay (o falló) y había filas, se quedan esas.
async function pedirEventos(): Promise<Evento[]> {
  const guardados = await leerEventos();
  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[cache] No se pudo saber si hay red', errorRed);
  }

  if (!hayRed) {
    if (guardados.length === 0) {
      throw new Error(ERROR_RED.mensaje);
    }
    console.log(`[cache] Sin red. Eventos en SQLite: ${guardados.length}`);
    return guardados;
  }

  const respuesta = await obtenerEventos();
  if ('error' in respuesta) {
    if (guardados.length > 0) {
      console.log('[cache] El servicio falló. Se muestran los eventos guardados.');
      return guardados;
    }
    throw new Error(respuesta.error.mensaje);
  }

  await revisarCambiosDeEstado(guardados, respuesta.datos);
  await guardarEventos(respuesta.datos);
  return respuesta.datos;
}

// Si la Agenda ya guardó la lista, el detalle abre sin red.
// "No existe" no muestra una copia vieja. Un error de red sí.
async function pedirEvento(id: string): Promise<Evento> {
  const guardado = await leerEventoPorId(id);
  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[cache] No se pudo saber si hay red', errorRed);
  }

  if (!hayRed) {
    if (!guardado) {
      throw new Error(ERROR_RED.mensaje);
    }
    console.log(`[cache] Sin red. Evento ${id} leído de SQLite.`);
    return guardado;
  }

  const respuesta = await obtenerEventoPorId(id);
  if ('error' in respuesta) {
    if (respuesta.error.codigo === 'ERROR_RED' && guardado) {
      console.log(`[cache] El servicio falló. Se muestra el evento guardado ${id}.`);
      return guardado;
    }
    throw new Error(respuesta.error.mensaje);
  }

  await revisarCambiosDeEstado(guardado ? [guardado] : [], [respuesta.datos]);
  await guardarEvento(respuesta.datos);
  return respuesta.datos;
}

export function useEventos(): {
  dias: DiaAgenda[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { online } = useRed();
  // SQLite primero, para que la agenda no espere a la API.
  const [desdeSqlite, setDesdeSqlite] = useState<Evento[]>([]);

  useEffect(() => {
    let cancelado = false;

    leerEventos()
      .then((guardados) => {
        if (!cancelado && guardados.length > 0) {
          setDesdeSqlite(guardados);
        }
      })
      .catch((errorCapturado) => {
        console.error('[cache] No se pudieron leer los eventos', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const consulta = useQuery({
    queryKey: CLAVE_EVENTOS,
    queryFn: pedirEventos,
    placeholderData: desdeSqlite.length > 0 ? desdeSqlite : undefined,
  });

  // Si vuelve la red, Query pide de nuevo. El ref evita un doble
  // pedido al montar (online ya viene true).
  const veniaOnline = useRef(online);
  useEffect(() => {
    if (online && !veniaOnline.current) {
      void consulta.refetch();
    }
    veniaOnline.current = online;
  }, [online, consulta.refetch]);

  const todos = consulta.data ?? [];
  const cargando = consulta.isPending && todos.length === 0;
  const error = consulta.isError && todos.length === 0 ? consulta.error.message : null;

  async function recargar() {
    await consulta.refetch();
  }

  const dias = useMemo(() => agruparDesdeHoy(todos), [todos]);

  return { dias, cargando, error, recargar };
}

export function useEvento(id: string): {
  evento: Evento | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { online } = useRed();
  const [desdeSqlite, setDesdeSqlite] = useState<Evento | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDesdeSqlite(null);
    if (!id) {
      return;
    }

    leerEventoPorId(id)
      .then((guardado) => {
        if (!cancelado && guardado) {
          setDesdeSqlite(guardado);
        }
      })
      .catch((errorCapturado) => {
        console.error('[cache] No se pudo leer el evento', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  const consulta = useQuery({
    queryKey: claveEvento(id),
    queryFn: () => pedirEvento(id),
    enabled: id.length > 0,
    placeholderData: desdeSqlite ?? undefined,
  });

  const veniaOnline = useRef(online);
  useEffect(() => {
    if (id.length > 0 && online && !veniaOnline.current) {
      void consulta.refetch();
    }
    veniaOnline.current = online;
  }, [online, consulta.refetch, id]);

  // Si Query falló (p. ej. "no existe"), no dejamos la copia de SQLite.
  // El error de red no llega acá: pedirEvento ya devolvió lo guardado.
  const evento = consulta.isError ? null : (consulta.data ?? null);
  const cargando = id.length > 0 && consulta.isPending && !evento;
  const error = !id
    ? 'No existe ese evento.'
    : consulta.isError
      ? consulta.error.message
      : null;

  async function recargar() {
    await consulta.refetch();
  }

  return { evento, cargando, error, recargar };
}
