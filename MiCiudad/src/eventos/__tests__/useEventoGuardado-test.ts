// Dueño: C — Mapa y agenda
// Eventos guardados: el teléfono manda, y lo que se quitó sin red no vuelve a aparecer.

import Storage from 'expo-sqlite/kv-store';

import { hayRedAhora } from '@/compartido/useRed';
import { insertarEventoGuardado, leerEventosGuardados } from '@/eventos/eventosDb';
import { agendarRecordatorio } from '@/eventos/recordatorios';
import { sincronizarEventosGuardados } from '@/eventos/useEventoGuardado';
import { crearEvento } from '@/pruebas/fabricas';
import {
  guardarEventoEnCuenta,
  obtenerEventosGuardados,
  quitarEventoDeLaCuenta,
} from '@/servicios/eventos-guardados';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('@/compartido/useRed', () => ({ hayRedAhora: jest.fn() }));
jest.mock('@/compartido/consulta', () => ({ escribirConsulta: jest.fn(), invalidarConsultas: jest.fn() }));
jest.mock('@/cuenta/SesionContext', () => ({ useSesion: jest.fn() }));
jest.mock('@/eventos/recordatorios', () => ({ agendarRecordatorio: jest.fn(), cancelarRecordatorio: jest.fn() }));
jest.mock('@/eventos/eventosDb', () => ({
  borrarEventoGuardado: jest.fn(),
  insertarEventoGuardado: jest.fn(),
  leerEventoGuardado: jest.fn(),
  leerEventosGuardados: jest.fn(),
}));
jest.mock('@/servicios/eventos-guardados', () => ({
  guardarEventoEnCuenta: jest.fn(),
  obtenerEventosGuardados: jest.fn(),
  quitarEventoDeLaCuenta: jest.fn(),
}));

const USUARIO = 'usr-1';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(hayRedAhora).mockResolvedValue(true);
  jest.mocked(quitarEventoDeLaCuenta).mockResolvedValue({ datos: null, meta: null });
  jest.mocked(guardarEventoEnCuenta).mockResolvedValue({ datos: crearEvento(), meta: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('si quitaste el último evento guardado sin red, al volver la red no reaparece', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('1');
  jest.mocked(leerEventosGuardados).mockResolvedValue([]);
  jest.mocked(obtenerEventosGuardados).mockResolvedValue({ datos: [crearEvento({ id: 'evt-1' })], meta: null });

  await sincronizarEventosGuardados(USUARIO);

  expect(quitarEventoDeLaCuenta).toHaveBeenCalledWith('evt-1');
  expect(insertarEventoGuardado).not.toHaveBeenCalled();
});

test('en un teléfono que nunca sincronizó esa cuenta, copia los eventos guardados de la cuenta', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue(null);
  jest.mocked(leerEventosGuardados).mockResolvedValue([]);
  jest.mocked(obtenerEventosGuardados).mockResolvedValue({ datos: [crearEvento({ id: 'evt-1' })], meta: null });

  await sincronizarEventosGuardados(USUARIO);

  expect(insertarEventoGuardado).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: USUARIO, eventoId: 'evt-1' }));
  expect(quitarEventoDeLaCuenta).not.toHaveBeenCalled();
});

test('los eventos copiados de la cuenta también agendan su recordatorio, sin pedir permiso', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue(null);
  jest.mocked(leerEventosGuardados).mockResolvedValue([]);
  const feria = crearEvento({ id: 'evt-2' });
  jest.mocked(obtenerEventosGuardados).mockResolvedValue({ datos: [feria], meta: null });

  await sincronizarEventosGuardados(USUARIO);

  expect(agendarRecordatorio).toHaveBeenCalledWith(feria, { pedirPermiso: false });
});
