// Dueño: C — Mapa y agenda
// Distancia (Haversine) y el texto que ve el turista: "900 m" o "1,1 km".

import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';

// Centro de Colón, aproximado. Alcanza para medir distancias cortas.
const CENTRO = { latitud: -32.2236, longitud: -58.1419 };

describe('distanciaMetros', () => {
  test('da 0 si los dos puntos son el mismo', () => {
    expect(distanciaMetros(CENTRO, CENTRO)).toBe(0);
  });

  test('un grado de latitud son unos 111,19 km', () => {
    // π · 6 371 000 / 180 = 111 194,93 m (el radio que usa la app)
    const metros = distanciaMetros({ latitud: 0, longitud: 0 }, { latitud: 1, longitud: 0 });
    expect(metros).toBeCloseTo(111_194.93, 1);
  });

  test('da lo mismo de ida que de vuelta', () => {
    const termas = { latitud: -32.2009, longitud: -58.1556 };
    expect(distanciaMetros(CENTRO, termas)).toBeCloseTo(distanciaMetros(termas, CENTRO), 6);
  });

  test('a la latitud de Colón, un paso al este mide menos que uno al norte', () => {
    // Los meridianos se juntan hacia el polo: el grado de longitud vale cos(lat) veces el de latitud.
    const alNorte = distanciaMetros(CENTRO, { ...CENTRO, latitud: CENTRO.latitud + 0.001 });
    const alEste = distanciaMetros(CENTRO, { ...CENTRO, longitud: CENTRO.longitud + 0.001 });

    expect(alNorte).toBeCloseTo(111.19, 1);
    expect(alEste).toBeCloseTo(94.1, 0);
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
});
