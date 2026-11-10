// Dueño: A — Cuenta y plataforma
// Colores, tipografía y tema de navegación (claro/oscuro/sistema).

import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { usePreferencias } from '@/cuenta/usePreferencias';

// Colores de alto contraste y tamaños grandes.
// Valeria: "se usa al sol y con una mano" y "si el teléfono tiene
// la letra agrandada, la app no se tiene que romper".
//
// La preferencia (claro / oscuro / sistema) vive en kv-store
// (usePreferencias). "sistema" sigue al teléfono.
//
// Claro: verde yatay sobre blanco cálido. Oscuro: azul noche con naranja.
// Todos los pares texto/fondo superan 4,5:1 y los íconos 3:1.

export interface Colores {
  fondo: string;
  // Campos de formulario / superficies un poco más altas que el fondo.
  fondoElevado: string;
  texto: string;
  textoSuave: string;
  primario: string;
  textoSobrePrimario: string;
  peligro: string;
  avisoFondo: string;
  avisoTexto: string;
  borde: string;
  // Franja del encabezado (y zona del status bar) y su texto.
  encabezado: string;
  textoSobreEncabezado: string;
  // Línea inferior del encabezado.
  bordeEncabezado: string;
  // Barra de pestañas de abajo (Mapa · Agenda · Recorrido · Yo).
  fondoBarra: string;
}

// Texto blanco sobre el color de categoría (chips / marcas).
// Evita color de categoría como letra sobre fondo oscuro (bajo contraste).
export const TEXTO_SOBRE_CATEGORIA = '#FFFFFF';

// Verde de "Abierto" (lista cercana y tarjeta del mapa).
// La paleta no tiene un color de éxito propio.
export function colorAbierto(oscuro: boolean): string {
  return oscuro ? '#34D399' : '#047857';
}

// Botones: principal lleno (uno por pantalla); secundario con borde
// BORDE_BOTON del color primario; enlace solo texto. Las cajas que no se
// tocan llevan BORDE_CAJA neutro.
export const BORDE_BOTON = 1.5;
export const BORDE_CAJA = 1;

// Estado "Suspendido" de un evento.
export function colorSuspendido(oscuro: boolean): string {
  return oscuro ? '#FBBF24' : '#B45309';
}

// Círculo del punto del usuario en el mapa.
export const COLOR_ACENTO = '#FF2D95';

export const coloresClaro: Colores = {
  fondo: '#F7F8F4',
  fondoElevado: '#FFFFFF',
  texto: '#141A15',
  textoSuave: '#4D5A50',
  primario: '#2F5D3A',
  textoSobrePrimario: '#FFFFFF',
  peligro: '#B91C1C',
  avisoFondo: '#FFFBEB',
  avisoTexto: '#92400E',
  borde: '#E0E4DC',
  encabezado: '#2F5D3A',
  textoSobreEncabezado: '#FFFFFF',
  bordeEncabezado: '#2F5D3A',
  fondoBarra: '#FFFFFF',
};

export const coloresOscuro: Colores = {
  fondo: '#070B18',
  fondoElevado: '#152038',
  texto: '#F7F4EE',
  textoSuave: '#B8C0D4',
  primario: '#FF8A3D',
  textoSobrePrimario: '#0A1024',
  peligro: '#FF453A',
  // avisoTexto también se usa suelto sobre tarjetas, no solo sobre avisoFondo.
  avisoFondo: '#2B230F',
  avisoTexto: '#F5D88A',
  borde: '#FFFFFF24',
  // Encabezado del color del cuerpo, separado por la línea inferior.
  encabezado: '#070B18',
  textoSobreEncabezado: '#FF8A3D',
  bordeEncabezado: '#FFFFFF24',
  fondoBarra: '#0D1528',
};

// Números en puntos lógicos. React Native los agranda solo
// cuando el usuario sube la letra del teléfono. No fijamos
// una fuente: usamos la del sistema.
export const tipografia = {
  titulo: 20,
  cuerpo: 15,
  boton: 15,
};

// Encabezado compartido por todas las pantallas (cambia con el tema).
export function crearOpcionesEncabezado(colores: Colores) {
  return {
    headerStyle: { backgroundColor: colores.encabezado },
    headerTintColor: colores.textoSobreEncabezado,
    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
  } as const;
}

export function useTema(): { colores: Colores; oscuro: boolean } {
  const esquema = useColorScheme();
  const { preferencias } = usePreferencias();

  const oscuro =
    preferencias.tema === 'oscuro' ||
    (preferencias.tema === 'sistema' && esquema === 'dark');
  const colores = oscuro ? coloresOscuro : coloresClaro;
  return { colores, oscuro };
}

// Tema de Expo Router / React Navigation (tabs y headers del Stack).
// Misma paleta que useTema: sin azul por defecto ni barra blanca en oscuro.
export function crearTemaNavegacion(colores: Colores, oscuro: boolean): Theme {
  const base = oscuro ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: oscuro,
    colors: {
      ...base.colors,
      primary: colores.primario,
      background: colores.fondo,
      // Headers del Stack/Tabs: el mismo color del encabezado del tema.
      card: colores.encabezado,
      text: colores.texto,
      border: colores.borde,
      notification: colores.peligro,
    },
  };
}
