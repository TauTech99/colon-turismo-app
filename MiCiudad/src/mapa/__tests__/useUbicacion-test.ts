// Dueño: C — Mapa y agenda
// GPS + permisos: si rechazan el cartel de precisión de ubicación, no se pide de nuevo sin parar.

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AppState, type AppStateStatus } from 'react-native';

import { useUbicacion } from '@/mapa/useUbicacion';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const PLAZA = { coords: { latitude: -32.2236, longitude: -58.1427 } } as Location.LocationObject;
const RECHAZADO = new Error('Location request failed due to unsatisfied device settings');

// La app pasa al fondo y vuelve, como cuando se cierra el cartel del sistema.
let avisarCambio: (estado: AppStateStatus) => void = () => {};

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  // En el mock de react-native, currentState no es el texto que tiene en el teléfono.
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, alCambiar) => {
    avisarCambio = alCambiar as (estado: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  const concedido = { status: 'granted' } as Location.LocationPermissionResponse;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(concedido);
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(concedido);
  jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(PLAZA);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('si rechazan la precisión de ubicación, no se vuelve a pedir y queda la última conocida', async () => {
  jest.mocked(Location.getCurrentPositionAsync).mockRejectedValue(RECHAZADO);

  const { result } = await renderHook(() => useUbicacion());
  await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1));

  // Cerrar el cartel deja la app de nuevo en primer plano.
  await act(async () => {
    avisarCambio('background');
    avisarCambio('active');
  });
  await waitFor(() => expect(Location.getForegroundPermissionsAsync).toHaveBeenCalled());

  expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  expect(result.current.coordenadas).toEqual({ latitud: -32.2236, longitud: -58.1427 });
  expect(result.current.permiso).toBe('concedido');
});

test('con el GPS andando, toma la lectura nueva', async () => {
  const termas = { coords: { latitude: -32.2135, longitude: -58.1455 } } as Location.LocationObject;
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(termas);

  const { result } = await renderHook(() => useUbicacion());

  await waitFor(() => expect(result.current.coordenadas).toEqual({ latitud: -32.2135, longitud: -58.1455 }));
});
