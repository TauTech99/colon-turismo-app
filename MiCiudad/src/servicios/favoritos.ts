// Dueño: A — Cuenta y plataforma
// Favoritos de esta cuenta. Quién es "yo" = Bearer. No se manda usuarioId.

import type { Respuesta } from '@/tipos/api';
import type { Favorito } from '@/tipos/favorito';

import { pedir } from './cliente';

// `_usuarioId` queda en la firma: el hook lo pasa. La API no lo usa.
export async function obtenerFavoritos(_usuarioId: string): Promise<Respuesta<Favorito[]>> {
  return pedir<Favorito[]>('/yo/favoritos?porPagina=100');
}

export async function agregarFavorito(
  _usuarioId: string,
  lugarId: string,
): Promise<Respuesta<Favorito>> {
  return pedir<Favorito>(`/yo/favoritos/${encodeURIComponent(lugarId)}`, {
    metodo: 'PUT',
  });
}

export async function quitarFavorito(
  _usuarioId: string,
  lugarId: string,
): Promise<Respuesta<null>> {
  return pedir<null>(`/yo/favoritos/${encodeURIComponent(lugarId)}`, {
    metodo: 'DELETE',
  });
}
