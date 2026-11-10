// Dueño: C — Mapa y agenda
// Brújula: rumbo del teléfono, ángulo hacia el lugar y cuánto girar la flecha.

import { anguloHaciaLugar, rotacionFlecha, rumboDelTelefono } from '@/mapa/rumbo';

// Centro de Colón, aproximado.
const CENTRO = { latitud: -32.2236, longitud: -58.1419 };

describe('rumboDelTelefono (magnetómetro → grados)', () => {
  test.each([
    // x, y (μT) → rumbo
    [0, 30, 0],
    [-30, 0, 90],
    [0, -30, 180],
    [30, 0, 270],
  ])('x=%p, y=%p → %p°', (x, y, rumbo) => {
    expect(rumboDelTelefono(x, y)).toBeCloseTo(rumbo, 6);
  });

  test('siempre da un ángulo entre 0 y 360', () => {
    for (const [x, y] of [
      [12, -7],
      [-0.5, -40],
      [33, 33],
      [-18, 2],
    ]) {
      const rumbo = rumboDelTelefono(x, y);
      expect(rumbo).toBeGreaterThanOrEqual(0);
      expect(rumbo).toBeLessThan(360);
    }
  });
});

describe('anguloHaciaLugar', () => {
  test.each([
    ['norte', { latitud: CENTRO.latitud + 0.01, longitud: CENTRO.longitud }, 0],
    ['este', { latitud: CENTRO.latitud, longitud: CENTRO.longitud + 0.01 }, 90],
    ['sur', { latitud: CENTRO.latitud - 0.01, longitud: CENTRO.longitud }, 180],
    ['oeste', { latitud: CENTRO.latitud, longitud: CENTRO.longitud - 0.01 }, 270],
  ])('un lugar al %s da %p°', (_nombre, lugar, angulo) => {
    expect(anguloHaciaLugar(CENTRO, lugar)).toBeCloseTo(angulo, 1);
  });
});

describe('rotacionFlecha', () => {
  test('lugar al norte y teléfono mirando al norte: la flecha no gira', () => {
    expect(rotacionFlecha(0, 0)).toBe(0);
  });

  test('lugar al este y teléfono al norte: la flecha apunta a la derecha', () => {
    expect(rotacionFlecha(90, 0)).toBe(90);
  });

  test('si el teléfono gira hacia el lugar, la flecha vuelve a apuntar arriba', () => {
    expect(rotacionFlecha(90, 90)).toBe(0);
  });

  test('cruza el norte sin dar valores negativos', () => {
    expect(rotacionFlecha(10, 350)).toBe(20);
    expect(rotacionFlecha(350, 10)).toBe(340);
  });
});
