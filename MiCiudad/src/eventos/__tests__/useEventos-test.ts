// Dueño: C — Mapa y agenda
// useEventos y useEvento: SQLite es la copia offline y TanStack Query pide al servidor cuando hay red.

import { renderHook, waitFor } from '@testing-library/react-native';

import { hayRedAhora, useRed } from '@/compartido/useRed';
import { guardarEvento, guardarEventos, leerEventoPorId, leerEventos } from '@/eventos/eventosDb';
import { revisarCambiosDeEstado } from '@/eventos/recordatorios';
import { useEvento, useEventos } from '@/eventos/useEventos';
import { crearEnvoltorioConsulta } from '@/pruebas/consulta';
import { crearEvento } from '@/pruebas/fabricas';
import { obtenerEventoPorId, obtenerEventos } from '@/servicios/eventos';
import type { Evento } from '@/tipos/evento';

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

const SIN_CONEXION = 'No hay conexión. Probá de nuevo en un rato.';

function enUnRato(horas: number): string {
  return new Date(Date.now() + horas * 3_600_000).toISOString();
}

function eventoDeHoy(datos: Partial<Evento> = {}): Evento {
  return crearEvento({ inicio: enUnRato(2), fin: enUnRato(3), ...datos });
}

function idsEnLaAgenda(dias: { eventos: Evento[] }[]): string[] {
  return [...new Set(dias.flatMap((dia) => dia.eventos.map((e) => e.id)))];
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(useRed).mockReturnValue({ online: true });
  jest.mocked(guardarEventos).mockResolvedValue(undefined);
  jest.mocked(guardarEvento).mockResolvedValue(undefined);
  jest.mocked(revisarCambiosDeEstado).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useEventos (agenda)', () => {
  test('sin red muestra lo que quedó guardado en SQLite', async () => {
    jest.mocked(useRed).mockReturnValue({ online: false });
    jest.mocked(hayRedAhora).mockResolvedValue(false);
    jest.mocked(leerEventos).mockResolvedValue([eventoDeHoy({ id: 'evt-1' })]);

    const { result } = await renderHook(() => useEventos(), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(idsEnLaAgenda(result.current.dias)).toEqual(['evt-1']));
    expect(result.current.error).toBeNull();
    expect(obtenerEventos).not.toHaveBeenCalled();
  });

  test('sin red y sin nada guardado avisa que no hay conexión', async () => {
    jest.mocked(hayRedAhora).mockResolvedValue(false);
    jest.mocked(leerEventos).mockResolvedValue([]);

    const { result } = await renderHook(() => useEventos(), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(result.current.error).toBe(SIN_CONEXION));
    expect(result.current.dias).toEqual([]);
    expect(result.current.cargando).toBe(false);
  });

  test('con red pide al servidor, guarda en SQLite y revisa cambios de estado', async () => {
    const guardado = eventoDeHoy({ id: 'evt-1' });
    const actualizado = { ...guardado, titulo: 'Peña actualizada' };
    jest.mocked(hayRedAhora).mockResolvedValue(true);
    jest.mocked(leerEventos).mockResolvedValue([guardado]);
    jest.mocked(obtenerEventos).mockResolvedValue({ datos: [actualizado], meta: null });

    const { result } = await renderHook(() => useEventos(), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(result.current.dias[0]?.eventos[0]?.titulo).toBe('Peña actualizada'));
    expect(revisarCambiosDeEstado).toHaveBeenCalledWith([guardado], [actualizado]);
    expect(guardarEventos).toHaveBeenCalledWith([actualizado]);
  });

  test('si el servidor falla, sigue mostrando la copia de SQLite', async () => {
    jest.mocked(hayRedAhora).mockResolvedValue(true);
    jest.mocked(leerEventos).mockResolvedValue([eventoDeHoy({ id: 'evt-1' })]);
    jest.mocked(obtenerEventos).mockResolvedValue({ error: { codigo: 'ERROR_SERVIDOR', mensaje: 'La API respondió 500.' } });

    const { result } = await renderHook(() => useEventos(), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(obtenerEventos).toHaveBeenCalled());
    await waitFor(() => expect(idsEnLaAgenda(result.current.dias)).toEqual(['evt-1']));
    expect(result.current.error).toBeNull();
    expect(guardarEventos).not.toHaveBeenCalled();
  });
});

describe('useEvento (detalle)', () => {
  test('sin red abre el evento si la agenda ya lo había guardado', async () => {
    jest.mocked(hayRedAhora).mockResolvedValue(false);
    jest.mocked(leerEventoPorId).mockResolvedValue(eventoDeHoy({ id: 'evt-1' }));

    const { result } = await renderHook(() => useEvento('evt-1'), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(result.current.evento?.id).toBe('evt-1'));
    expect(result.current.error).toBeNull();
    expect(obtenerEventoPorId).not.toHaveBeenCalled();
  });

  test('si el servidor dice que no existe, no muestra la copia vieja', async () => {
    jest.mocked(hayRedAhora).mockResolvedValue(true);
    jest.mocked(leerEventoPorId).mockResolvedValue(eventoDeHoy({ id: 'evt-1' }));
    jest.mocked(obtenerEventoPorId).mockResolvedValue({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'No existe ese evento.' } });

    const { result } = await renderHook(() => useEvento('evt-1'), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(result.current.error).toBe('No existe ese evento.'));
    expect(result.current.evento).toBeNull();
  });

  test('si lo que falla es la red, muestra la copia guardada', async () => {
    jest.mocked(hayRedAhora).mockResolvedValue(true);
    jest.mocked(leerEventoPorId).mockResolvedValue(eventoDeHoy({ id: 'evt-1' }));
    jest.mocked(obtenerEventoPorId).mockResolvedValue({ error: { codigo: 'ERROR_RED', mensaje: SIN_CONEXION } });

    const { result } = await renderHook(() => useEvento('evt-1'), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(obtenerEventoPorId).toHaveBeenCalledWith('evt-1'));
    await waitFor(() => expect(result.current.evento?.id).toBe('evt-1'));
    expect(result.current.error).toBeNull();
  });

  test('con red trae la versión nueva y la guarda', async () => {
    const guardado = eventoDeHoy({ id: 'evt-1' });
    const nuevo = { ...guardado, titulo: 'Peña (cambió el lugar)' };
    jest.mocked(hayRedAhora).mockResolvedValue(true);
    jest.mocked(leerEventoPorId).mockResolvedValue(guardado);
    jest.mocked(obtenerEventoPorId).mockResolvedValue({ datos: nuevo, meta: null });

    const { result } = await renderHook(() => useEvento('evt-1'), { wrapper: crearEnvoltorioConsulta() });

    await waitFor(() => expect(result.current.evento?.titulo).toBe('Peña (cambió el lugar)'));
    expect(revisarCambiosDeEstado).toHaveBeenCalledWith([guardado], [nuevo]);
    expect(guardarEvento).toHaveBeenCalledWith(nuevo);
  });

  test('sin id avisa que no existe y no pide nada', async () => {
    const { result } = await renderHook(() => useEvento(''), { wrapper: crearEnvoltorioConsulta() });

    expect(result.current.error).toBe('No existe ese evento.');
    expect(result.current.cargando).toBe(false);
    expect(leerEventoPorId).not.toHaveBeenCalled();
    expect(obtenerEventoPorId).not.toHaveBeenCalled();
  });
});
