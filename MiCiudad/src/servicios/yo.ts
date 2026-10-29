// Dueño: A — Cuenta y plataforma
// GET/PATCH /yo. Quién es "yo" = Bearer.

import type { Respuesta } from '@/tipos/api';
import type { Preferencias, Usuario } from '@/tipos/usuario';

import { pedir } from './cliente';

export type CambioYo = {
  nombre?: string;
  avatarUrl?: string | null;
  preferencias?: Partial<Preferencias>;
};

export async function obtenerYo(): Promise<Respuesta<Usuario>> {
  return pedir<Usuario>('/yo');
}

export async function actualizarYo(cambio: CambioYo): Promise<Respuesta<Usuario>> {
  return pedir<Usuario>('/yo', {
    metodo: 'PATCH',
    cuerpo: cambio,
  });
}
