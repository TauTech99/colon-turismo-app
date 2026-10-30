// Dueño: C — Mapa y agenda
// Distancia en metros (Haversine) + texto legible. Funciones puras.

import type { Coordenadas } from '@/tipos/lugar';

// Radio de la Tierra en metros. Sirve para pasar el ángulo
// de la fórmula de Haversine a una distancia real.
const RADIO_TIERRA_METROS = 6_371_000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// Metros en línea recta entre dos puntos (latitud / longitud).
// Es una función pura: mismos números → mismo resultado.
// No pide GPS ni importa mocks.
// La usan el mapa, Cerca tuyo y el detalle (PRD §7.2).
export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const latA = aRadianes(a.latitud);
  const latB = aRadianes(b.latitud);
  const deltaLat = aRadianes(b.latitud - a.latitud);
  const deltaLng = aRadianes(b.longitud - a.longitud);

  const seno =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const angulo = 2 * Math.atan2(Math.sqrt(seno), Math.sqrt(1 - seno));
  return RADIO_TIERRA_METROS * angulo;
}

// Texto para la UI, en español: "900 m" o "1,1 km".
// La coma es el decimal de Valeria (wireframe §8.1).
export function formatearDistancia(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }

  const km = Math.round((metros / 1000) * 10) / 10;
  return `${String(km).replace('.', ',')} km`;
}
