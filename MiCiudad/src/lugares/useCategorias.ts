// Dueño: B — Lugares y datos
// Hook de categorías (Buscar y mapa).
// Query pide al servidor. SQLite sigue de copia offline (Palmar sin señal).

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { guardarCategorias, leerCategorias } from '@/lugares/lugaresDb';
import { ERROR_RED } from '@/servicios/cliente';
import { obtenerCategorias } from '@/servicios/categorias';
import type { Categoria } from '@/tipos/categoria';

// Misma clave en Mapa, Buscar, ficha y Yo: Query no pide 4 veces.
export const CLAVE_CATEGORIAS = ['categorias'] as const;

// queryFn habla con el servicio, no con Axios. Si hay red, pide y
// guarda en SQLite. Si no hay (o falló) y había filas, se quedan esas.
async function pedirCategorias(): Promise<Categoria[]> {
  const guardadas = await leerCategorias();
  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[cache] No se pudo saber si hay red', errorRed);
  }

  if (!hayRed) {
    if (guardadas.length === 0) {
      throw new Error(ERROR_RED.mensaje);
    }
    console.log(`[cache] Sin red. Categorías en SQLite: ${guardadas.length}`);
    return guardadas;
  }

  const respuesta = await obtenerCategorias();
  if ('error' in respuesta) {
    if (guardadas.length > 0) {
      console.log('[cache] El servicio falló. Se muestran las categorías guardadas.');
      return guardadas;
    }
    throw new Error(respuesta.error.mensaje);
  }

  const ordenadas = [...respuesta.datos].sort((a, b) => a.orden - b.orden);
  await guardarCategorias(ordenadas);
  return ordenadas;
}

export function useCategorias(): {
  categorias: Categoria[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { online } = useRed();
  // SQLite primero, para que los chips no esperen a la API.
  const [desdeSqlite, setDesdeSqlite] = useState<Categoria[]>([]);

  useEffect(() => {
    let cancelado = false;

    leerCategorias()
      .then((guardadas) => {
        if (!cancelado && guardadas.length > 0) {
          setDesdeSqlite(guardadas);
        }
      })
      .catch((errorCapturado) => {
        console.error('[cache] No se pudieron leer las categorías', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const consulta = useQuery({
    queryKey: CLAVE_CATEGORIAS,
    queryFn: pedirCategorias,
    placeholderData: desdeSqlite.length > 0 ? desdeSqlite : undefined,
  });
  const recargarConsulta = consulta.refetch;

  // Si vuelve la red, Query pide de nuevo. El ref evita un doble
  // pedido al montar (online ya viene true).
  const veniaOnline = useRef(online);
  useEffect(() => {
    if (online && !veniaOnline.current) {
      void recargarConsulta();
    }
    veniaOnline.current = online;
  }, [online, recargarConsulta]);

  const categorias = consulta.data ?? [];
  const cargando = consulta.isPending && categorias.length === 0;
  const error =
    consulta.isError && categorias.length === 0 ? consulta.error.message : null;

  async function recargar() {
    await recargarConsulta();
  }

  return { categorias, cargando, error, recargar };
}
