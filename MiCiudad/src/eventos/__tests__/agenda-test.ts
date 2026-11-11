// Dueño: C — Mapa y agenda
// Agenda: agrupar por día de Colón (R8 de la API) y los textos de duración, precio y estado.

import {
  agruparDesdeHoy,
  textoDuracion,
  textoEstado,
  textoHora,
  textoPrecioEvento,
} from '@/eventos/useEventos';
import { crearEvento } from '@/pruebas/fabricas';

// Solo se prueban las funciones puras: la capa de datos se reemplaza por dobles vacíos.
jest.mock('@/compartido/useRed', () => ({ hayRedAhora: jest.fn(), useRed: jest.fn() }));
jest.mock('@/eventos/eventosDb', () => ({
  guardarEvento: jest.fn(),
  guardarEventos: jest.fn(),
  leerEventoPorId: jest.fn(),
  leerEventos: jest.fn(),
}));
jest.mock('@/eventos/recordatorios', () => ({ revisarCambiosDeEstado: jest.fn() }));
jest.mock('@/servicios/cliente', () => ({
  ERROR_RED: { codigo: 'ERROR_RED', mensaje: 'No hay conexión. Probá de nuevo en un rato.' },
}));
jest.mock('@/servicios/eventos', () => ({ obtenerEventoPorId: jest.fn(), obtenerEventos: jest.fn() }));

const VIERNES_15_HS_COLON = new Date('2026-11-13T18:00:00Z');

function idsPorDia(dias: ReturnType<typeof agruparDesdeHoy>) {
  return dias.map((dia) => [dia.clave, dia.eventos.map((e) => e.id)]);
}

describe('agruparDesdeHoy', () => {
  test('agrupa por día de Colón y al de hoy lo titula "Hoy"', () => {
    const recital = crearEvento({ id: 'recital', inicio: '2026-11-13T23:00:00Z', fin: '2026-11-14T01:00:00Z' });
    const feria = crearEvento({ id: 'feria', inicio: '2026-11-15T13:00:00Z', fin: '2026-11-15T15:00:00Z' });

    const dias = agruparDesdeHoy([feria, recital], VIERNES_15_HS_COLON);

    expect(idsPorDia(dias)).toEqual([
      ['2026-11-13', ['recital']],
      ['2026-11-15', ['feria']],
    ]);
    expect(dias[0].titulo).toBe('Hoy');
    expect(dias[1].titulo).toMatch(/^Domingo,? 15 de noviembre$/);
  });

  test('un evento que cruza la medianoche aparece en los dos días (peña 21:00–02:00)', () => {
    const pena = crearEvento({ id: 'peña', inicio: '2026-11-14T00:00:00Z', fin: '2026-11-14T05:00:00Z' });

    expect(idsPorDia(agruparDesdeHoy([pena], VIERNES_15_HS_COLON))).toEqual([
      ['2026-11-13', ['peña']],
      ['2026-11-14', ['peña']],
    ]);
  });

  test('sin hora de fin cuenta hasta las 23:59 de su día (R8)', () => {
    const empezoHoy = crearEvento({ id: 'muestra', inicio: '2026-11-13T12:00:00Z', fin: null });
    const deAyer = crearEvento({ id: 'ayer', inicio: '2026-11-12T20:00:00Z', fin: null });

    expect(idsPorDia(agruparDesdeHoy([empezoHoy, deAyer], VIERNES_15_HS_COLON))).toEqual([['2026-11-13', ['muestra']]]);
  });

  test('lo que ya terminó no aparece, y terminar justo a las 00:00 de hoy tampoco cuenta', () => {
    const ayer = crearEvento({ id: 'ayer', inicio: '2026-11-12T22:00:00Z', fin: '2026-11-13T01:00:00Z' });
    const justoMedianoche = crearEvento({ id: 'justo', inicio: '2026-11-13T00:00:00Z', fin: '2026-11-13T03:00:00Z' });

    expect(agruparDesdeHoy([ayer, justoMedianoche], VIERNES_15_HS_COLON)).toEqual([]);
  });

  test('un evento de varios días que empezó antes arranca en "Hoy"', () => {
    const fiesta = crearEvento({ id: 'fiesta', inicio: '2026-11-11T13:00:00Z', fin: '2026-11-15T02:00:00Z' });

    expect(idsPorDia(agruparDesdeHoy([fiesta], VIERNES_15_HS_COLON))).toEqual([
      ['2026-11-13', ['fiesta']],
      ['2026-11-14', ['fiesta']],
    ]);
  });

  test('ordena los días y, dentro de cada día, por hora de inicio', () => {
    const manana = crearEvento({ id: 'mañana', inicio: '2026-11-14T13:00:00Z' });
    const tarde = crearEvento({ id: 'tarde', inicio: '2026-11-13T23:00:00Z' });
    const temprano = crearEvento({ id: 'temprano', inicio: '2026-11-13T13:00:00Z' });

    expect(idsPorDia(agruparDesdeHoy([manana, tarde, temprano], VIERNES_15_HS_COLON))).toEqual([
      ['2026-11-13', ['temprano', 'tarde']],
      ['2026-11-14', ['mañana']],
    ]);
  });

  test('un evento muy largo se muestra como mucho en 14 días', () => {
    const temporada = crearEvento({ id: 'temporada', inicio: '2026-11-13T13:00:00Z', fin: '2026-12-31T03:00:00Z' });

    const dias = agruparDesdeHoy([temporada], VIERNES_15_HS_COLON);

    expect(dias).toHaveLength(14);
    expect(dias[0].clave).toBe('2026-11-13');
    expect(dias[13].clave).toBe('2026-11-26');
  });
});

describe('textos de la agenda', () => {
  test('textoHora muestra la hora de Colón', () => {
    expect(textoHora('2026-11-13T22:30:00Z')).toBe('19:30');
  });

  test.each([
    [null, 'Sin hora de fin'],
    ['2026-11-13T23:00:00Z', 'Sin hora de fin'],
    ['2026-11-13T22:00:00Z', 'Sin hora de fin'],
    ['2026-11-13T23:45:00Z', '45 min'],
    ['2026-11-14T01:00:00Z', '2 h'],
    ['2026-11-14T01:30:00Z', '2 h 30 min'],
    ['2026-11-14T04:00:00Z', '5 h'],
  ])('textoDuracion con fin %p → %p', (fin, texto) => {
    expect(textoDuracion(crearEvento({ inicio: '2026-11-13T23:00:00Z', fin }))).toBe(texto);
  });

  test.each([
    [null, 'Precio no informado'],
    [0, 'Gratis'],
    [1500, '$ 1500'],
  ])('textoPrecioEvento(%p) → %p', (precio, texto) => {
    expect(textoPrecioEvento(precio)).toBe(texto);
  });

  test.each([
    ['programado', 'Programado'],
    ['suspendido', 'Suspendido'],
    ['cancelado', 'Cancelado'],
    ['finalizado', 'Finalizado'],
  ] as const)('textoEstado(%p) → %p', (estado, texto) => {
    expect(textoEstado(estado)).toBe(texto);
  });
});
