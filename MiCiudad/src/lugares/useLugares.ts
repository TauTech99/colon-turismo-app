// Dueño: B — Lugares y datos
// Hook del listado: Query pide al servidor. SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { guardarLugares, leerLugares } from '@/lugares/lugaresDb';
import { ERROR_RED } from '@/servicios/cliente';
import { obtenerLugares, type FiltrosLugar } from '@/servicios/lugares';
import type { Lugar } from '@/tipos/lugar';

export type { FiltrosLugar };

// Misma clave en Mapa y Buscar: Query no pide dos veces.
// El filtro (categoría / texto) NO va en la clave: es en memoria.
export const CLAVE_LUGARES = ['lugares'] as const;

// Igual que la API: minúsculas, sin tildes, espacios colapsados.
// "colon" tiene que encontrar "Colón".
function textoBusqueda(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Función pura: misma entrada → misma salida. No habla con la red.
// El hook la usa cada vez que cambian la categoría o el texto.
export function filtrarLugares(lugares: Lugar[], filtros?: FiltrosLugar): Lugar[] {
  const categoriaId = filtros?.categoriaId ?? null;
  const busqueda = textoBusqueda(filtros?.busqueda);

  return lugares.filter((lugar) => {
    if (categoriaId && lugar.categoriaId !== categoriaId) {
      return false;
    }
    if (busqueda && !textoBusqueda(lugar.nombre).includes(busqueda)) {
      return false;
    }
    return true;
  });
}

// queryFn habla con el servicio, no con Axios. Si hay red, pide y
// guarda en SQLite. Si no hay (o falló) y había filas, se quedan esas.
async function pedirLugares(): Promise<Lugar[]> {
  const guardados = await leerLugares();
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
    console.log(`[cache] Sin red. Lugares en SQLite: ${guardados.length}`);
    return guardados;
  }

  const respuesta = await obtenerLugares();
  if ('error' in respuesta) {
    if (guardados.length > 0) {
      console.log('[cache] El servicio falló. Se muestran los lugares guardados.');
      return guardados;
    }
    throw new Error(respuesta.error.mensaje);
  }

  await guardarLugares(respuesta.datos);
  return respuesta.datos;
}

export function useLugares(filtros?: FiltrosLugar): {
  lugares: Lugar[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { online } = useRed();
  // SQLite primero, para que el mapa no espere a la API.
  const [desdeSqlite, setDesdeSqlite] = useState<Lugar[]>([]);

  useEffect(() => {
    let cancelado = false;

    leerLugares()
      .then((guardados) => {
        if (!cancelado && guardados.length > 0) {
          setDesdeSqlite(guardados);
        }
      })
      .catch((errorCapturado) => {
        console.error('[cache] No se pudieron leer los lugares', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const consulta = useQuery({
    queryKey: CLAVE_LUGARES,
    queryFn: pedirLugares,
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

  const categoriaId = filtros?.categoriaId ?? null;
  const busqueda = filtros?.busqueda ?? null;

  const lugares = useMemo(
    () => filtrarLugares(todos, { categoriaId, busqueda }),
    [todos, categoriaId, busqueda],
  );

  return { lugares, cargando, error, recargar };
}
