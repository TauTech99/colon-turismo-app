// Dueño: C — Mapa y agenda
// obtenerEventos / obtenerEventoPorId. Público: no hace falta login.

import type { Respuesta } from '@/tipos/api';
import type { Evento } from '@/tipos/evento';

import { pedir } from './cliente';

// Sin fecha: la API manda desde hoy, sin tope. Las pantallas no importan mocks/.
export async function obtenerEventos(): Promise<Respuesta<Evento[]>> {
  return pedir<Evento[]>('/eventos?porPagina=100');
}

export async function obtenerEventoPorId(id: string): Promise<Respuesta<Evento>> {
  return pedir<Evento>(`/eventos/${encodeURIComponent(id)}`);
}
