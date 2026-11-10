// Dueño: D — Recorrido y audioguías
// Cola offline: sube visitas con sincronizada:false al volver la red,
// y baja las de la cuenta que este teléfono no tiene.

import { registrarSincronizacion } from '@/compartido/ultimaSincronizacion';
import { hayRedAhora } from '@/compartido/useRed';
import { ERROR_RED } from '@/servicios/cliente';
import { enviarVisita, obtenerVisitas as obtenerVisitasDeLaCuenta } from '@/servicios/visitas';
import type { Visita } from '@/tipos/visita';

import {
  insertarVisita,
  leerVisitasPendientes,
  marcarSincronizada,
  obtenerVisitas,
} from './visitasDb';

// Cola offline del PRD §7.4: visitas con sincronizada: false.
// Se guardan frente al molino sin señal; se suben cuando hay red.
//
// Este archivo NO habla con la cámara ni con la UI. Solo lee
// pendientes, llama al servicio y marca las que salieron bien.
// Si el servicio falla, la fila queda en false (se reintenta).

// Evita dos bajadas a la vez. Al loguear, el layout (useSincronizacion)
// y Query (useVisitas) llaman esto juntos: sin lock, las dos insertan
// el mismo id y SQLite tira UNIQUE.
let bajando: Promise<number> | null = null;

// Evita dos subidas a la vez (layout + registrar al mismo tiempo).
let subiendo: Promise<void> | null = null;

// La otra mitad del sync (PRD §7.5: "que el recorrido siga si cambia de
// teléfono"). Trae las visitas de la cuenta y guarda en SQLite las que este
// teléfono no tiene. Las locales no se tocan: el teléfono manda en lo
// pendiente y en las fotos. Devuelve cuántas agregó (0 = nada nuevo).
export async function traerVisitasDeLaCuenta(usuarioId: string): Promise<number> {
  if (bajando) {
    return bajando;
  }

  bajando = (async () => {
    let hayRed = false;
    try {
      hayRed = await hayRedAhora();
    } catch {
      return 0;
    }
    if (!hayRed) {
      return 0;
    }

    const respuesta = await obtenerVisitasDeLaCuenta(usuarioId);
    if ('error' in respuesta) {
      console.log(`[cola] No se pudieron traer las visitas: ${respuesta.error.mensaje}`);
      return 0;
    }

    const locales = await obtenerVisitas(usuarioId);
    const yaEstan = new Set(locales.map((visita) => visita.id));
    let agregadas = 0;

    for (const remota of respuesta.datos) {
      if (yaEstan.has(remota.id)) {
        continue;
      }
      // Ya está en el servidor: llega subida. fotoUri queda como vino
      // (ruta del otro teléfono); la pantalla avisa si el archivo no está.
      await insertarVisita({ ...remota, sincronizada: true });
      agregadas += 1;
    }

    if (agregadas > 0) {
      console.log(`[cola] Bajadas ${agregadas} visita(s) de la cuenta`);
    }
    await registrarSincronizacion();
    return agregadas;
  })();

  try {
    return await bajando;
  } finally {
    bajando = null;
  }
}

export async function obtenerPendientes(usuarioId: string): Promise<Visita[]> {
  return leerVisitasPendientes(usuarioId);
}

// Sube una por una. Solo las de `usuarioId` (quien está logueado).
// Si no hay red de verdad, no llama al mock
// (el mock no sabe de Wi‑Fi y marcaría true por error).
export async function sincronizarPendientes(usuarioId: string | null | undefined): Promise<void> {
  if (!usuarioId) {
    return;
  }

  if (subiendo) {
    return subiendo;
  }

  subiendo = (async () => {
    let hayRed = false;
    try {
      hayRed = await hayRedAhora();
    } catch (error) {
      console.error('[cola] No se pudo saber si hay red', error);
      return;
    }

    if (!hayRed) {
      console.log('[cola] Sin red: las pendientes quedan en el teléfono');
      return;
    }

    const pendientes = await obtenerPendientes(usuarioId);
    if (pendientes.length === 0) {
      console.log('[cola] No hay visitas pendientes');
      // Con red y nada pendiente: está todo al día (Yo muestra la hora).
      await registrarSincronizacion();
      return;
    }

    console.log(`[cola] Subiendo ${pendientes.length} visita(s)…`);

    let todasSubidas = true;
    for (const visita of pendientes) {
      const respuesta = await enviarVisita(visita);

      if ('error' in respuesta) {
        // Queda en la cola. Si se cortó la red, las de atrás también
        // van a fallar en este intento. Si es otro error (lugar, foto,
        // 422), seguimos: esa fila se reintenta después.
        console.log(
          `[cola] No se pudo subir ${visita.id}: ${respuesta.error.mensaje}`,
        );
        todasSubidas = false;
        if (respuesta.error.codigo === ERROR_RED.codigo) {
          break;
        }
        continue;
      }

      await marcarSincronizada(visita.id);
    }

    if (todasSubidas) {
      await registrarSincronizacion();
    }
  })();

  try {
    await subiendo;
  } finally {
    subiendo = null;
  }
}
