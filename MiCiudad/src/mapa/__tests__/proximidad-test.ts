// Dueño: C — Mapa y agenda
// Aviso de proximidad: sin GPS colgado ni carteles de permiso inesperados.

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';

import { hayPermisoNotificaciones, pedirPermisoNotificaciones } from '@/compartido/notificaciones';
import { leerPreferenciasGuardadas, usePreferencias } from '@/cuenta/usePreferencias';
import { leerLugares } from '@/lugares/lugaresDb';
import { revisarProximidad, useProximidad } from '@/mapa/proximidad';
import { CENTRO_COLON, crearLugar } from '@/pruebas/fabricas';
import type { Preferencias } from '@/tipos/usuario';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn(), isAvailableAsync: jest.fn(), isTaskDefined: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('@/compartido/notificaciones', () => ({
  CANAL_EVENTOS: 'eventos',
  cargarNotificaciones: jest.fn(),
  hayPermisoNotificaciones: jest.fn(),
  pedirPermisoNotificaciones: jest.fn(),
}));
jest.mock('@/cuenta/usePreferencias', () => ({ leerPreferenciasGuardadas: jest.fn(), usePreferencias: jest.fn() }));
jest.mock('@/lugares/lugaresDb', () => ({ leerLugares: jest.fn() }));

const AVISO_PRENDIDO: Preferencias = {
  categoriasFavoritas: [],
  avisarProximidad: true,
  radioAvisoMetros: 250,
  tema: 'sistema',
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('si se apaga el aviso mientras arranca el GPS, la suscripción igual se corta', async () => {
  jest.mocked(usePreferencias).mockReturnValue({
    preferencias: AVISO_PRENDIDO,
    guardar: jest.fn(),
    aplicarDesdeServidor: jest.fn(),
  });
  jest.mocked(leerPreferenciasGuardadas).mockReturnValue({ ...AVISO_PRENDIDO, avisarProximidad: false });
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
  let entregarSuscripcion: (suscripcion: { remove: () => void }) => void = () => {};
  jest.mocked(Location.watchPositionAsync).mockReturnValue(
    new Promise((resolver) => {
      entregarSuscripcion = resolver;
    }) as never,
  );
  const suscripcion = { remove: jest.fn() };

  const { unmount } = await renderHook(() => useProximidad());
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
  await unmount();
  await act(async () => {
    entregarSuscripcion(suscripcion);
  });

  expect(suscripcion.remove).toHaveBeenCalled();
});

test('cerca de un lugar sin permiso de avisos, solo consulta: no abre el cartel del permiso', async () => {
  jest.mocked(leerPreferenciasGuardadas).mockReturnValue(AVISO_PRENDIDO);
  jest.mocked(leerLugares).mockResolvedValue([crearLugar({ coordenadas: CENTRO_COLON })]);
  jest.mocked(Storage.getItem).mockResolvedValue(null);
  jest.mocked(hayPermisoNotificaciones).mockResolvedValue(false);
  jest.mocked(pedirPermisoNotificaciones).mockResolvedValue(false);

  await revisarProximidad(CENTRO_COLON);

  expect(pedirPermisoNotificaciones).not.toHaveBeenCalled();
});
