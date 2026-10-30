// Dueño: A — Cuenta y plataforma
// Fecha de la última sincronización con el servidor (kv-store). Yo la muestra.

import Storage from 'expo-sqlite/kv-store';

// Se anota cuando la cola de visitas termina sin errores o cuando
// favoritos habla bien con el servicio. Es del teléfono, no de la cuenta:
// por eso va en kv-store y no en Preferencias (que es el tipo del PRD).
const CLAVE = 'miciudad.ultimaSincronizacion';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export async function registrarSincronizacion(): Promise<void> {
  try {
    await Storage.setItem(CLAVE, new Date().toISOString());
  } catch (error) {
    console.error('[sync] No se pudo anotar la hora', error);
  }
}

export function leerUltimaSincronizacion(): Date | null {
  try {
    const guardada = Storage.getItemSync(CLAVE);
    if (!guardada) {
      return null;
    }
    const fecha = new Date(guardada);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  } catch {
    return null;
  }
}

// "hoy 14:32", "ayer 18:05" o "12 oct 09:10". Meses a mano, como en el recorrido.
export function textoMomento(fecha: Date, ahora: Date = new Date()): string {
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (mismoDia(fecha, ahora)) {
    return `hoy ${hora}`;
  }
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (mismoDia(fecha, ayer)) {
    return `ayer ${hora}`;
  }
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${hora}`;
}
