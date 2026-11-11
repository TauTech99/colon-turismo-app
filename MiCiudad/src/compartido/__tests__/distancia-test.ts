// Dueño: C — Mapa y agenda
// Distancia (Haversine) y el texto que ve el turista: "900 m" o "1,1 km".

import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { CENTRO_COLON } from '@/pruebas/fabricas';

const METROS_POR_GRADO = (Math.PI * 6_371_000) / 180;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

describe('distanciaMetros', () => {
  test('da 0 si los dos puntos son el mismo', () => {
    expect(distanciaMetros(CENTRO_COLON, CENTRO_COLON)).toBe(0);
  });

  test('un grado de latitud mide lo que dice la fórmula con el radio de la app', () => {
    const metros = distanciaMetros({ latitud: 0, longitud: 0 }, { latitud: 1, longitud: 0 });
    expect(metros).toBeCloseTo(METROS_POR_GRADO, 1);
  });

  test('da lo mismo de ida que de vuelta', () => {
    const termas = { latitud: -32.2009, longitud: -58.1556 };
    expect(distanciaMetros(CENTRO_COLON, termas)).toBeCloseTo(distanciaMetros(termas, CENTRO_COLON), 6);
  });

  test('a la latitud de Colón, un paso al este mide menos que uno al norte', () => {
    const paso = 0.001;
    const alNorte = distanciaMetros(CENTRO_COLON, { ...CENTRO_COLON, latitud: CENTRO_COLON.latitud + paso });
    const alEste = distanciaMetros(CENTRO_COLON, { ...CENTRO_COLON, longitud: CENTRO_COLON.longitud + paso });

    expect(alNorte).toBeCloseTo(METROS_POR_GRADO * paso, 1);
    expect(alEste).toBeCloseTo(alNorte * Math.cos(aRadianes(CENTRO_COLON.latitud)), 1);
  });
});

describe('formatearDistancia', () => {
  test.each([
    [0, '0 m'],
    [44, '44 m'],
    [44.4, '44 m'],
    [999.4, '999 m'],
  ])('menos de un kilómetro va en metros redondos: %p → %p', (metros, texto) => {
    expect(formatearDistancia(metros)).toBe(texto);
  });

  test.each([
    [1000, '1 km'],
    [1100, '1,1 km'],
    [1149, '1,1 km'],
    [1150, '1,2 km'],
    [12_345, '12,3 km'],
  ])('desde un kilómetro va en km con coma decimal: %p → %p', (metros, texto) => {
    expect(formatearDistancia(metros)).toBe(texto);
  });

  test('lo que redondea a 1000 m ya se muestra como "1 km"', () => {
    expect(formatearDistancia(999.6)).toBe('1 km');
  });
});
