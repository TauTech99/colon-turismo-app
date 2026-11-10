// Dueño: B — Lugares y datos
// Ping técnico: ¿el teléfono llega a la API? No trae lugares.

import type { Respuesta, Salud } from '@/tipos/api';

import { pedir } from './cliente';

export async function pedirSalud(): Promise<Respuesta<Salud>> {
  return pedir<Salud>('/salud');
}

// Lo llama el layout al arrancar. El resultado se ve en la consola de Metro.
export async function pingSalud(): Promise<void> {
  const respuesta = await pedirSalud();

  if ('error' in respuesta) {
    console.log('[salud] No llegó', respuesta.error);
    return;
  }

  console.log('[salud] OK', respuesta.datos);
}
