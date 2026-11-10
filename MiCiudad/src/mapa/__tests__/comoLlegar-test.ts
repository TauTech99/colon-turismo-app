// Dueño: C — Mapa y agenda
// "Cómo llegar": abre Google Maps en Android y Apple Maps en iPhone, a pie o en auto.

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { abrirComoLlegar } from '@/mapa/comoLlegar';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

const DESTINO = { latitud: -32.2236, longitud: -58.1419 };
const abrirUrl = jest.mocked(Linking.openURL);

beforeEach(() => {
  abrirUrl.mockReset();
  abrirUrl.mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('en Android abre Google Maps', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  test('a pie', async () => {
    await abrirComoLlegar(DESTINO, 'pie');
    expect(abrirUrl).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=-32.2236,-58.1419&travelmode=walking',
    );
  });

  test('en auto', async () => {
    await abrirComoLlegar(DESTINO, 'auto');
    expect(abrirUrl).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=-32.2236,-58.1419&travelmode=driving',
    );
  });
});

describe('en iPhone abre Apple Maps', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  test('a pie (dirflg=w)', async () => {
    await abrirComoLlegar(DESTINO, 'pie');
    expect(abrirUrl).toHaveBeenCalledWith('http://maps.apple.com/?daddr=-32.2236,-58.1419&dirflg=w');
  });

  test('en auto (dirflg=d)', async () => {
    await abrirComoLlegar(DESTINO, 'auto');
    expect(abrirUrl).toHaveBeenCalledWith('http://maps.apple.com/?daddr=-32.2236,-58.1419&dirflg=d');
  });
});

test('si el teléfono no puede abrir el mapa, la pantalla no se rompe', async () => {
  const consola = jest.spyOn(console, 'error').mockImplementation(() => {});
  abrirUrl.mockRejectedValueOnce(new Error('No hay app de mapas'));

  await expect(abrirComoLlegar(DESTINO, 'pie')).resolves.toBeUndefined();
  expect(consola).toHaveBeenCalled();
});
