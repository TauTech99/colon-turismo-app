// Dueño: B — Lugares y datos
// obtenerLugares / obtenerLugarPorId. Público: no hace falta login.

import type { Respuesta } from '@/tipos/api';
import type { Lugar } from '@/tipos/lugar';

import { pedir } from './cliente';

// Lo que se puede pedir al listado. No está en el PRD (no es una entidad):
// es el "cómo preguntar" de esta función. El hook no lo manda: pide todo
// y filtra en el teléfono (categoría y texto, letra a letra).
export type FiltrosLugar = {
  categoriaId?: string | null;
  busqueda?: string | null;
};

// porPagina=500: la API manda 20 si no se pide. El catálogo tiene 27.
// `_filtros` queda en la firma (contrato del servicio).
export async function obtenerLugares(_filtros?: FiltrosLugar): Promise<Respuesta<Lugar[]>> {
  return pedir<Lugar[]>('/lugares?porPagina=500');
}

export async function obtenerLugarPorId(id: string): Promise<Respuesta<Lugar>> {
  return pedir<Lugar>(`/lugares/${encodeURIComponent(id)}`);
}

// El texto entero del cartel, no el id. Ejemplo: COLON:lug-004 → COLON%3Alug-004.
export async function obtenerLugarPorQr(codigo: string): Promise<Respuesta<Lugar>> {
  return pedir<Lugar>(`/lugares/qr/${encodeURIComponent(codigo)}`);
}
