// Reloj de Colón: horarios y agenda usan la hora de Colón.

import { claveDiaEnColon, comienzoDelDiaColon, relojEnColon, ZONA_COLON } from '@/compartido/zonaColon';

test('la zona es la de Buenos Aires (UTC-3, sin horario de verano)', () => {
  expect(ZONA_COLON).toBe('America/Argentina/Buenos_Aires');
});

describe('relojEnColon', () => {
  test('pasa la hora UTC a la hora de Colón: viernes 13/11 a las 19:30, la hora de la defensa', () => {
    expect(relojEnColon(new Date('2026-11-13T22:30:00Z'))).toEqual({
      anio: 2026,
      mes: 11,
      diaMes: 13,
      diaSemana: 5,
      horas: 19,
      minutos: 30,
    });
  });

  test('de noche usa el día de Colón aunque en UTC ya sea mañana', () => {
    expect(relojEnColon(new Date('2026-11-14T01:30:00Z'))).toMatchObject({
      diaMes: 13,
      diaSemana: 5,
      horas: 22,
      minutos: 30,
    });
  });

  test('la medianoche se informa como 0 h, no como 24', () => {
    expect(relojEnColon(new Date('2026-11-14T03:00:00Z'))).toMatchObject({
      diaMes: 14,
      diaSemana: 6,
      horas: 0,
      minutos: 0,
    });
  });
});

describe('claveDiaEnColon', () => {
  test('arma la clave AAAA-MM-DD con el día de Colón', () => {
    expect(claveDiaEnColon('2026-11-14T02:59:00Z')).toBe('2026-11-13');
    expect(claveDiaEnColon('2026-11-14T03:00:00Z')).toBe('2026-11-14');
  });

  test('acepta un Date además del texto ISO', () => {
    expect(claveDiaEnColon(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });
});

describe('comienzoDelDiaColon', () => {
  test('devuelve las 00:00 de Colón, que son las 03:00 UTC', () => {
    expect(comienzoDelDiaColon('2026-11-13').toISOString()).toBe('2026-11-13T03:00:00.000Z');
  });

  test('ida y vuelta con claveDiaEnColon da el mismo día', () => {
    expect(claveDiaEnColon(comienzoDelDiaColon('2026-12-31'))).toBe('2026-12-31');
  });
});
