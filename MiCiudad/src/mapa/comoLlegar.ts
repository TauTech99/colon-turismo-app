// Dueño: C — Mapa y agenda
// Abre Maps del teléfono (pie / auto).

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { Coordenadas } from '@/tipos/lugar';

// A pie o en auto: el PRD §7.2 pide las dos. La flecha está en useBrujula.
export type ModoViaje = 'pie' | 'auto';

function armarUrlMapa(destino: Coordenadas, modo: ModoViaje): string {
  const lat = destino.latitud;
  const lng = destino.longitud;

  if (Platform.OS === 'ios') {
    const dirflg = modo === 'pie' ? 'w' : 'd';
    return `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=${dirflg}`;
  }

  const viaje = modo === 'pie' ? 'walking' : 'driving';
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${viaje}`;
}

// Abre la app de mapas del teléfono (Google Maps en Android,
// Apple Maps en iPhone). No instala nada: usa expo-linking,
// que ya está en el proyecto. Checklist PRD §15: app nativa.
// No hace falta tener el GPS de nuestra app: Maps usa el suyo.
export async function abrirComoLlegar(
  destino: Coordenadas,
  modo: ModoViaje,
): Promise<void> {
  const url = armarUrlMapa(destino, modo);

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('[comoLlegar] No se pudo abrir el mapa', error);
  }
}
