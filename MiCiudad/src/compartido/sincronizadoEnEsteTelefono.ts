// Marca en kv-store: esta cuenta ya sincronizó en este teléfono.
// Distingue "teléfono nuevo" (se copia lo de la cuenta) de "quitó todo sin red" (el teléfono manda).

import Storage from 'expo-sqlite/kv-store';

export type DatosSincronizables = 'favoritos' | 'eventosGuardados';

function clave(datos: DatosSincronizables, usuarioId: string): string {
  return `miciudad.sincronizado.${datos}.${usuarioId}`;
}

export async function yaSincronizoEnEsteTelefono(
  datos: DatosSincronizables,
  usuarioId: string,
): Promise<boolean> {
  try {
    return (await Storage.getItem(clave(datos, usuarioId))) !== null;
  } catch (error) {
    console.error('[sync] No se pudo leer la marca de sincronización', error);
    return false;
  }
}

export async function anotarSincronizadoEnEsteTelefono(
  datos: DatosSincronizables,
  usuarioId: string,
): Promise<void> {
  try {
    await Storage.setItem(clave(datos, usuarioId), '1');
  } catch (error) {
    console.error('[sync] No se pudo anotar la marca de sincronización', error);
  }
}
