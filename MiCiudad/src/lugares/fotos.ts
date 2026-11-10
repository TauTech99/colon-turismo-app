// Dueño: B — Lugares y datos
// Fotos de los lugares (ficha y tarjetas del listado).
// Camino vivo: URL http(s) de la API. expo-image las cachea en disco.

import type { ImageSource } from 'expo-image';

export function fuenteFoto(url: string): ImageSource | null {
  const archivo = url.split('/').pop();
  if (!archivo) {
    return null;
  }
  return /^https?:\/\//.test(url) ? { uri: url, cacheKey: url } : null;
}
