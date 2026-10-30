// Dueño: A — Cuenta y plataforma
// Hook: marcar/desmarcar favorito + lista del usuario.
// Query pide al servidor. SQLite sigue de copia offline.

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { escribirConsulta, invalidarConsultas } from '@/compartido/consulta';
import { registrarSincronizacion } from '@/compartido/ultimaSincronizacion';
import { hayRedAhora, useRed } from '@/compartido/useRed';
import { agregarFavorito, obtenerFavoritos, quitarFavorito } from '@/servicios/favoritos';
import type { Favorito } from '@/tipos/favorito';

import {
  borrarFavorito,
  guardarFavorito,
  leerFavorito,
  leerFavoritos,
  reemplazarFavoritos,
} from './favoritosDb';
import { useSesion } from './SesionContext';

// 1) Lee SQLite de ESTE usuario y, si hay filas, las muestra ya.
// 2) Si hay red y la tabla está vacía, copia lo del servicio
//    (Lucía trae 2 del mock: Molino y Playa Norte).
// 3) Si hay red y YA hay filas, el teléfono manda: se sube lo que
//    se marcó sin señal y se saca del mock lo que se destildó.
// 4) Sin red: solo SQLite. No se pide cuenta para mirar el mapa;
//    este hook se usa en Yo / la estrella, que sí llaman exigirCuenta.

function fechaIsoAhora(): string {
  return new Date().toISOString();
}

async function subirDiferencias(
  usuarioId: string,
  locales: Favorito[],
  remotos: Favorito[],
): Promise<void> {
  const idsLocales = new Set(locales.map((favorito) => favorito.lugarId));
  const idsRemotos = new Set(remotos.map((favorito) => favorito.lugarId));

  for (const remoto of remotos) {
    if (!idsLocales.has(remoto.lugarId)) {
      await quitarFavorito(usuarioId, remoto.lugarId);
    }
  }

  for (const local of locales) {
    if (!idsRemotos.has(local.lugarId)) {
      await agregarFavorito(usuarioId, local.lugarId);
    }
  }
}

export async function traerFavoritos(
  usuarioId: string,
): Promise<{ favoritos: Favorito[]; error: string | null }> {
  const locales = await leerFavoritos(usuarioId);

  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch (errorRed) {
    console.error('[favoritos] No se pudo saber si hay red', errorRed);
  }

  if (!hayRed) {
    console.log(`[favoritos] Sin red. Filas en SQLite: ${locales.length}`);
    return { favoritos: locales, error: null };
  }

  const respuesta = await obtenerFavoritos(usuarioId);
  if ('error' in respuesta) {
    if (locales.length > 0) {
      console.log('[favoritos] El servicio falló. Se muestran los guardados.');
      return { favoritos: locales, error: null };
    }
    return { favoritos: [], error: respuesta.error.mensaje };
  }

  if (locales.length === 0) {
    await reemplazarFavoritos(usuarioId, respuesta.datos);
    await registrarSincronizacion();
    return { favoritos: respuesta.datos, error: null };
  }

  await subirDiferencias(usuarioId, locales, respuesta.datos);
  await registrarSincronizacion();
  return { favoritos: locales, error: null };
}

export const claveFavoritos = (usuarioId: string) => ['favoritos', usuarioId] as const;

async function pedirFavoritos(usuarioId: string): Promise<Favorito[]> {
  const resultado = await traerFavoritos(usuarioId);
  if (resultado.error && resultado.favoritos.length === 0) {
    throw new Error(resultado.error);
  }
  return resultado.favoritos;
}

export function useFavoritos(): {
  favoritos: Favorito[];
  cargando: boolean;
  error: string | null;
  esFavorito: (lugarId: string) => boolean;
  alternar: (lugarId: string) => Promise<void>;
  recargar: () => Promise<void>;
  refrescarLocal: () => Promise<void>;
} {
  const { usuario } = useSesion();
  const { online } = useRed();
  const usuarioId = usuario?.id ?? null;
  const [desdeSqlite, setDesdeSqlite] = useState<Favorito[]>([]);

  useEffect(() => {
    let cancelado = false;
    setDesdeSqlite([]);
    if (!usuarioId) {
      return;
    }

    leerFavoritos(usuarioId)
      .then((guardados) => {
        if (!cancelado && guardados.length > 0) {
          setDesdeSqlite(guardados);
        }
      })
      .catch((errorCapturado) => {
        console.error('[favoritos] No se pudieron leer', errorCapturado);
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const consulta = useQuery({
    queryKey: usuarioId ? claveFavoritos(usuarioId) : ['favoritos', 'sin-sesion'],
    queryFn: () => pedirFavoritos(usuarioId as string),
    enabled: Boolean(usuarioId),
    placeholderData: desdeSqlite.length > 0 ? desdeSqlite : undefined,
  });

  const veniaOnline = useRef(online);
  useEffect(() => {
    if (usuarioId && online && !veniaOnline.current) {
      void consulta.refetch();
    }
    veniaOnline.current = online;
  }, [online, consulta.refetch, usuarioId]);

  const favoritos = usuarioId ? (consulta.data ?? []) : [];
  const cargando = Boolean(usuarioId) && consulta.isPending && favoritos.length === 0;
  const error =
    consulta.isError && favoritos.length === 0 ? consulta.error.message : null;

  async function recargar() {
    if (!usuarioId) {
      return;
    }
    await consulta.refetch();
  }

  // Al volver a la lista: lee SQLite otra vez (la estrella ya escribió).
  // No pone spinner ni llama al servicio.
  async function refrescarLocal() {
    if (!usuarioId) {
      return;
    }
    const locales = await leerFavoritos(usuarioId);
    escribirConsulta(claveFavoritos(usuarioId), locales);
  }

  function esFavorito(lugarId: string): boolean {
    return favoritos.some((favorito) => favorito.lugarId === lugarId);
  }

  // Un toque: prende o apaga. Primero SQLite (se ve al toque y
  // anda sin red). Después, si hay señal, se lo cuenta al servicio.
  // Query se entera: escribirConsulta + invalidateQueries.
  async function alternar(lugarId: string): Promise<void> {
    if (!usuarioId) {
      return;
    }

    const clave = claveFavoritos(usuarioId);
    const yaEsta = await leerFavorito(usuarioId, lugarId);

    if (yaEsta) {
      await borrarFavorito(usuarioId, lugarId);
      escribirConsulta(
        clave,
        favoritos.filter((favorito) => favorito.lugarId !== lugarId),
      );

      if (await hayRedAhora()) {
        const respuesta = await quitarFavorito(usuarioId, lugarId);
        if ('error' in respuesta) {
          console.log('[favoritos] El servicio no pudo quitar. Quedó en SQLite.');
        }
      }
      await invalidarConsultas(clave);
      return;
    }

    const nuevo: Favorito = {
      id: `fav-${Date.now()}`,
      usuarioId,
      lugarId,
      creadoEn: fechaIsoAhora(),
    };
    await guardarFavorito(nuevo);
    escribirConsulta(clave, [nuevo, ...favoritos]);

    if (await hayRedAhora()) {
      const respuesta = await agregarFavorito(usuarioId, lugarId);
      if ('error' in respuesta) {
        console.log('[favoritos] El servicio no pudo agregar. Quedó en SQLite.');
      }
    }
    await invalidarConsultas(clave);
  }

  return {
    favoritos,
    cargando,
    error,
    esFavorito,
    alternar,
    recargar,
    refrescarLocal,
  };
}
