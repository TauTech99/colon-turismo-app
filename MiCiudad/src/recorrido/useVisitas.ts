// Dueño: D — Recorrido y audioguías
// Lista de visitas de esta cuenta. Query pide al servidor.
// SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { useSesion } from '@/cuenta/SesionContext';
import { traerVisitasDeLaCuenta } from '@/recorrido/colaVisitas';
import { obtenerVisitas } from '@/recorrido/visitasDb';
import type { Visita } from '@/tipos/visita';

// Misma clave que useRegistrarVisita invalida. Recorrido y Yo escuchan.
export const claveVisitas = (usuarioId: string) => ['visitas', usuarioId] as const;

// 1) Lee SQLite de ESTE usuario y, si hay filas, las muestra ya.
// 2) Si hay red, baja las de la cuenta que este teléfono no tiene
//    (cambio de teléfono).
// 3) Sin red: solo SQLite.
async function pedirVisitas(usuarioId: string): Promise<Visita[]> {
  const locales = await obtenerVisitas(usuarioId);

  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[visitas] No se pudo saber si hay red', errorRed);
  }

  if (!hayRed) {
    console.log(`[cache] Sin red. Visitas en SQLite: ${locales.length}`);
    return locales;
  }

  try {
    const agregadas = await traerVisitasDeLaCuenta(usuarioId);
    if (agregadas > 0) {
      const actualizadas = await obtenerVisitas(usuarioId);
      console.log(`[cache] Visitas leídas: ${actualizadas.length}`);
      return actualizadas;
    }
  } catch (errorCuenta) {
    console.error('[visitas] No se pudieron traer las de la cuenta', errorCuenta);
  }

  console.log(`[cache] Visitas leídas: ${locales.length}`);
  return locales;
}

export function useVisitas(): {
  visitas: Visita[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
} {
  const { usuario } = useSesion();
  const { online } = useRed();
  const usuarioId = usuario?.id ?? null;
  const [desdeSqlite, setDesdeSqlite] = useState<Visita[]>([]);

  useEffect(() => {
    let cancelado = false;
    setDesdeSqlite([]);
    if (!usuarioId) {
      return;
    }

    obtenerVisitas(usuarioId)
      .then((guardadas) => {
        if (!cancelado && guardadas.length > 0) {
          setDesdeSqlite(guardadas);
        }
      })
      .catch((errorCapturado) => {
        console.error('[visitas] No se pudieron leer', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const consulta = useQuery({
    queryKey: usuarioId ? claveVisitas(usuarioId) : ['visitas', 'sin-sesion'],
    queryFn: () => pedirVisitas(usuarioId as string),
    enabled: Boolean(usuarioId),
    placeholderData: desdeSqlite.length > 0 ? desdeSqlite : undefined,
  });

  // Si vuelve la red, Query pide de nuevo. El ref evita un doble
  // pedido al montar (online ya viene true).
  const veniaOnline = useRef(online);
  useEffect(() => {
    if (usuarioId && online && !veniaOnline.current) {
      void consulta.refetch();
    }
    veniaOnline.current = online;
  }, [online, consulta.refetch, usuarioId]);

  const visitas = usuarioId ? (consulta.data ?? []) : [];
  const cargando = Boolean(usuarioId) && consulta.isPending && visitas.length === 0;
  const error =
    consulta.isError && visitas.length === 0 ? consulta.error.message : null;

  const recargar = useCallback(async () => {
    if (!usuarioId) {
      return;
    }
    await consulta.refetch();
  }, [usuarioId, consulta.refetch]);

  return { visitas, cargando, error, recargar };
}
