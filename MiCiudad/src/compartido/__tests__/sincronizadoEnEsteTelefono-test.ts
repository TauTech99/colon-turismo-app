// Marca de "esta cuenta ya sincronizó en este teléfono".

import Storage from 'expo-sqlite/kv-store';

import {
  anotarSincronizadoEnEsteTelefono,
  yaSincronizoEnEsteTelefono,
} from '@/compartido/sincronizadoEnEsteTelefono';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('sin marca, la cuenta nunca sincronizó en este teléfono', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue(null);

  await expect(yaSincronizoEnEsteTelefono('favoritos', 'usr-1')).resolves.toBe(false);
});

test('la marca es por tipo de dato y por cuenta', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('1');

  await expect(yaSincronizoEnEsteTelefono('eventosGuardados', 'usr-2')).resolves.toBe(true);
  expect(Storage.getItem).toHaveBeenCalledWith('miciudad.sincronizado.eventosGuardados.usr-2');
});

test('anotar deja la marca de esa cuenta', async () => {
  await anotarSincronizadoEnEsteTelefono('favoritos', 'usr-1');

  expect(Storage.setItem).toHaveBeenCalledWith('miciudad.sincronizado.favoritos.usr-1', '1');
});

test('si kv-store falla, se comporta como un teléfono nuevo y no rompe', async () => {
  jest.mocked(Storage.getItem).mockRejectedValue(new Error('kv-store cerrado'));
  jest.mocked(Storage.setItem).mockRejectedValue(new Error('kv-store cerrado'));

  await expect(yaSincronizoEnEsteTelefono('favoritos', 'usr-1')).resolves.toBe(false);
  await expect(anotarSincronizadoEnEsteTelefono('favoritos', 'usr-1')).resolves.toBeUndefined();
});
