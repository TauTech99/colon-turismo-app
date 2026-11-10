// Dueño: B — Lugares y datos
// Hook de un lugar por id (detalle + piezas de otros roles).
// Query pide al servidor. SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { guardarLugar, leerLugarPorId } from '@/lugares/lugaresDb';
import { ERROR_RED } from '@/servicios/cliente';
import { obtenerLugarPorId } from '@/servicios/lugares';
import type { Lugar } from '@/tipos/lugar';

export const claveLugar = (id: string) => ['lugar', id] as const;

// queryFn habla con el servicio, no con Axios. Si Buscar ya guardó el
// catálogo, el detalle abre sin red. "No existe" no muestra una copia vieja.
// Un error de red sí: si ya estaba guardado, se muestra igual.
async function pedirLugar(id: string): Promise<Lugar> {
  const guardado = await leerLugarPorId(id);
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
    console.log(`[cache] Sin red. Lugar ${id} leído de SQLite.`);
    return guardado;
  }

  const respuesta = await obtenerLugarPorId(id);
  if ('error' in respuesta) {
    if (respuesta.error.codigo === 'ERROR_RED' && guardado) {
      console.log(`[cache] El servicio falló. Se muestra el lugar guardado ${id}.`);
      return guardado;
    }
    throw new Error(respuesta.error.mensaje);
  }

  await guardarLugar(respuesta.datos);
  return respuesta.datos;
}

export function useLugar(id: string): {
  lugar: Lugar | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { online } = useRed();
  // El id va con el lugar: al cambiar de ficha no usamos el caché viejo.
  // Así no hace falta setDesdeSqlite(null) en el efecto (warning de React 19).
  const [desdeSqlite, setDesdeSqlite] = useState<{ id: string; lugar: Lugar } | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelado = false;
    leerLugarPorId(id)
      .then((guardado) => {
        if (!cancelado && guardado) {
          setDesdeSqlite({ id, lugar: guardado });
        }
      })
      .catch((errorCapturado) => {
        console.error('[cache] No se pudo leer el lugar', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  const consulta = useQuery({
    queryKey: claveLugar(id),
    queryFn: () => pedirLugar(id),
    enabled: id.length > 0,
    placeholderData: desdeSqlite?.id === id ? desdeSqlite.lugar : undefined,
  });
  const recargarConsulta = consulta.refetch;

  const veniaOnline = useRef(online);
  useEffect(() => {
    if (id.length > 0 && online && !veniaOnline.current) {
      void recargarConsulta();
    }
    veniaOnline.current = online;
  }, [online, recargarConsulta, id]);

  // Si Query falló (p. ej. "no existe"), no dejamos la copia de SQLite.
  // El error de red no llega acá: pedirLugar ya devolvió lo guardado.
  const lugar = consulta.isError ? null : (consulta.data ?? null);
  const cargando = id.length > 0 && consulta.isPending && !lugar;
  const error = !id
    ? 'No existe ese lugar.'
    : consulta.isError
      ? consulta.error.message
      : null;

  async function recargar() {
    await recargarConsulta();
  }

  return { lugar, cargando, error, recargar };
}
