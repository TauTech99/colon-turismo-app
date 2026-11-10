// Dueño: B — Lugares y datos
// obtenerCategorias. Público: no hace falta login.

import type { Respuesta } from '@/tipos/api';
import type { Categoria } from '@/tipos/categoria';

import { pedir } from './cliente';

export async function obtenerCategorias(): Promise<Respuesta<Categoria[]>> {
  return pedir<Categoria[]>('/categorias');
}
