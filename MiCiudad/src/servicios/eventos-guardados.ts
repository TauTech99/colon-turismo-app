// Dueño: C — Mapa y agenda
// Eventos guardados de esta cuenta. Quién es "yo" = Bearer.

import type { Respuesta } from '@/tipos/api';
import type { Evento } from '@/tipos/evento';

import { pedir } from './cliente';

export async function obtenerEventosGuardados(): Promise<Respuesta<Evento[]>> {
  return pedir<Evento[]>('/yo/eventos-guardados?porPagina=100');
}

export async function guardarEventoEnCuenta(eventoId: string): Promise<Respuesta<Evento>> {
  return pedir<Evento>(`/yo/eventos-guardados/${encodeURIComponent(eventoId)}`, {
    metodo: 'PUT',
  });
}

export async function quitarEventoDeLaCuenta(eventoId: string): Promise<Respuesta<null>> {
  return pedir<null>(`/yo/eventos-guardados/${encodeURIComponent(eventoId)}`, {
    metodo: 'DELETE',
  });
}
