// Dueño: C — Mapa y agenda
// Botón Avisarme: si guardar o quitar falla, la persona se entera.

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useSesion } from '@/cuenta/SesionContext';
import { BotonAvisarme } from '@/eventos/componentes/BotonAvisarme';
import { useEventoGuardado } from '@/eventos/useEventoGuardado';
import { crearEvento } from '@/pruebas/fabricas';

jest.mock('@react-native-vector-icons/ionicons', () => ({ Ionicons: () => null }));
jest.mock('@/compartido/tema', () => ({
  BORDE_BOTON: 2,
  tipografia: { boton: 16 },
  useTema: () => ({ colores: { primario: '#0b6e79', fondoElevado: '#ffffff', textoSobrePrimario: '#ffffff' } }),
}));
jest.mock('@/cuenta/SesionContext', () => ({ useSesion: jest.fn() }));
jest.mock('@/eventos/useEventoGuardado', () => ({ useEventoGuardado: jest.fn() }));

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(useSesion).mockReturnValue({ exigirCuenta: async () => true } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('si no se pudo guardar el aviso, se lo dice a la persona', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(useEventoGuardado).mockReturnValue({
    estaGuardado: false,
    cargando: false,
    guardar: jest.fn().mockRejectedValue(new Error('SQLite ocupado')),
    quitar: jest.fn(),
  });

  await render(<BotonAvisarme evento={crearEvento()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Avisarme cuando empiece' }));

  await waitFor(() => expect(alerta).toHaveBeenCalledWith('No se pudo actualizar el aviso', expect.any(String)));
});
