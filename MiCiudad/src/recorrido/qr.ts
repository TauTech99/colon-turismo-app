// Dueño: D — Recorrido y audioguías
// Texto del cartel COLON:<id> → lugar. Con red usa GET /lugares/qr/:codigo.

import { hayRedAhora } from '@/compartido/useRed';
import { guardarLugar, leerLugarPorId } from '@/lugares/lugaresDb';
import { obtenerLugarPorQr } from '@/servicios/lugares';
import type { Lugar } from '@/tipos/lugar';

const PREFIJO = 'COLON:';

export type ResultadoQr =
  | { ok: true; lugar: Lugar }
  | { ok: false; motivo: 'invalido' | 'no-encontrado' }
  | { ok: false; motivo: 'inactivo'; nombre: string }
  | { ok: false; motivo: 'sin-cartel'; nombre: string };

// Función pura: no habla con la cámara ni con SQLite.
// "COLON:lug-004" → "lug-004". WhatsApp / menú → null.
export function parsearQr(texto: string): string | null {
  const limpio = texto.trim();

  if (!limpio.startsWith(PREFIJO)) {
    return null;
  }

  const lugarId = limpio.slice(PREFIJO.length).trim();
  if (lugarId === '') {
    return null;
  }

  return lugarId;
}

// Cámara o tipeo: acepta "COLON:lug-004" o "lug-004".
// Solo se completa el prefijo si lo que queda parece un id de lugar.
// Un QR ajeno (link de WhatsApp, menú) sigue sin prefijo → "invalido".
function codigoCompleto(texto: string): string {
  const limpio = texto.trim();
  if (limpio.toUpperCase().startsWith(PREFIJO)) {
    return `${PREFIJO}${limpio.slice(PREFIJO.length).trim()}`;
  }
  if (/^lug-[A-Za-z0-9_-]+$/i.test(limpio)) {
    return `${PREFIJO}${limpio}`;
  }
  return limpio;
}

export async function resolverLugarDesdeQr(texto: string): Promise<ResultadoQr> {
  const codigo = codigoCompleto(texto);
  const lugarId = parsearQr(codigo);
  if (!lugarId) {
    return { ok: false, motivo: 'invalido' };
  }

  let hayRed = false;
  try {
    hayRed = await hayRedAhora();
  } catch {
    hayRed = false;
  }

  if (hayRed) {
    const respuesta = await obtenerLugarPorQr(codigo);
    if (!('error' in respuesta)) {
      await guardarLugar(respuesta.datos);
      if (!respuesta.datos.activo) {
        return { ok: false, motivo: 'inactivo', nombre: respuesta.datos.nombre };
      }
      return { ok: true, lugar: respuesta.datos };
    }
  }

  // Sin red o la API no lo reconoció: el catálogo del teléfono.
  // codigoQr null = no hay cartel (igual que la API: QR_NO_RECONOCIDO).
  const local = await leerLugarPorId(lugarId);
  if (!local) {
    return { ok: false, motivo: 'no-encontrado' };
  }
  if (!local.activo) {
    return { ok: false, motivo: 'inactivo', nombre: local.nombre };
  }
  if (local.codigoQr === null) {
    return { ok: false, motivo: 'sin-cartel', nombre: local.nombre };
  }
  return { ok: true, lugar: local };
}
