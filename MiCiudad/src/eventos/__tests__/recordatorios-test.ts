// Dueño: C — Mapa y agenda
// "Avisarme": recordatorio local 60 min antes y aviso si un evento guardado se suspende o cancela.

import { Platform } from 'react-native';

import { cargarNotificaciones, hayPermisoNotificaciones, pedirPermisoNotificaciones } from '@/compartido/notificaciones';
import { leerIdsEventosGuardados } from '@/eventos/eventosDb';
import { agendarRecordatorio, MINUTOS_ANTES_RECORDATORIO, revisarCambiosDeEstado } from '@/eventos/recordatorios';
import { crearEvento } from '@/pruebas/fabricas';

jest.mock('@/compartido/notificaciones', () => ({
  CANAL_EVENTOS: 'eventos',
  cargarNotificaciones: jest.fn(),
  hayPermisoNotificaciones: jest.fn(),
  pedirPermisoNotificaciones: jest.fn(),
}));
jest.mock('@/eventos/eventosDb', () => ({ leerIdsEventosGuardados: jest.fn() }));

// Doble de expo-notifications con lo que usa recordatorios.ts.
const Notificaciones = {
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
};
type ModuloNotificaciones = NonNullable<Awaited<ReturnType<typeof cargarNotificaciones>>>;

const VIERNES_15_HS_COLON = new Date('2026-11-13T18:00:00Z').getTime();

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(VIERNES_15_HS_COLON);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.mocked(cargarNotificaciones).mockResolvedValue(Notificaciones as unknown as ModuloNotificaciones);
  jest.mocked(pedirPermisoNotificaciones).mockResolvedValue(true);
  jest.mocked(hayPermisoNotificaciones).mockResolvedValue(true);
  Notificaciones.scheduleNotificationAsync.mockResolvedValue('id');
  Notificaciones.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('agendarRecordatorio', () => {
  test('agenda el aviso 60 minutos antes del inicio', async () => {
    expect(MINUTOS_ANTES_RECORDATORIO).toBe(60);

    await expect(agendarRecordatorio(crearEvento({ id: 'evt-1' }))).resolves.toBe('agendado');

    // Primero cancela el anterior con el mismo id: tocar dos veces no duplica el aviso.
    expect(Notificaciones.cancelScheduledNotificationAsync).toHaveBeenCalledWith('recordatorio:evt-1');
    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'recordatorio:evt-1',
      content: { title: 'Recordatorio', body: 'En un rato empieza: Peña', data: { tipo: 'evento', id: 'evt-1' } },
      trigger: { type: 'date', date: new Date('2026-11-13T22:00:00Z') },
    });
  });

  test('si falta menos de una hora, suena a los 2 segundos', async () => {
    await agendarRecordatorio(crearEvento({ id: 'evt-2', inicio: '2026-11-13T18:30:00Z' }));

    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: { type: 'timeInterval', seconds: 2 } }),
    );
  });

  test('en Android usa el canal de eventos', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await agendarRecordatorio(crearEvento({ id: 'evt-3' }));

    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: expect.objectContaining({ channelId: 'eventos' }) }),
    );
  });

  test('sin permiso no agenda y lo informa', async () => {
    jest.mocked(pedirPermisoNotificaciones).mockResolvedValue(false);

    await expect(agendarRecordatorio(crearEvento({ id: 'evt-4' }))).resolves.toBe('sinPermiso');
    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('no agenda un evento que ya empezó o que no está programado', async () => {
    const yaEmpezo = crearEvento({ id: 'evt-5', inicio: '2026-11-13T17:00:00Z' });
    const suspendido = crearEvento({ id: 'evt-6', estado: 'suspendido' });

    await expect(agendarRecordatorio(yaEmpezo)).resolves.toBe('noCorresponde');
    await expect(agendarRecordatorio(suspendido)).resolves.toBe('noCorresponde');
    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('si no había un recordatorio anterior para cancelar, igual agenda', async () => {
    Notificaciones.cancelScheduledNotificationAsync.mockRejectedValue(new Error('no existe'));

    await expect(agendarRecordatorio(crearEvento({ id: 'evt-7' }))).resolves.toBe('agendado');
  });
});

describe('revisarCambiosDeEstado', () => {
  test('avisa una sola vez cuando un evento guardado pasa a cancelado', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-10']);
    const antes = crearEvento({ id: 'evt-10' });
    const ahora = crearEvento({ id: 'evt-10', estado: 'cancelado' });

    await revisarCambiosDeEstado([antes], [ahora]);
    await revisarCambiosDeEstado([antes], [ahora]); // la agenda y el detalle refrescan a la vez

    expect(Notificaciones.cancelScheduledNotificationAsync).toHaveBeenCalledWith('recordatorio:evt-10');
    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.objectContaining({ title: 'Se canceló Peña' }) }),
    );
  });

  test('si se suspende, el aviso lo dice', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-11']);

    await revisarCambiosDeEstado([crearEvento({ id: 'evt-11' })], [crearEvento({ id: 'evt-11', estado: 'suspendido' })]);

    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Se suspendió Peña', body: 'Quedó suspendido. El recordatorio ya no vale.' }),
      }),
    );
  });

  test('el aviso de suspensión no abre el cartel del permiso: si no hay permiso, no avisa', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-17']);
    jest.mocked(hayPermisoNotificaciones).mockResolvedValue(false);

    await revisarCambiosDeEstado([crearEvento({ id: 'evt-17' })], [crearEvento({ id: 'evt-17', estado: 'suspendido' })]);

    expect(pedirPermisoNotificaciones).not.toHaveBeenCalled();
    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('no avisa de eventos que la persona no guardó', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['otro']);

    await revisarCambiosDeEstado([crearEvento({ id: 'evt-12' })], [crearEvento({ id: 'evt-12', estado: 'cancelado' })]);

    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('no avisa si ya estaba cancelado antes', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-13']);
    const cancelado = crearEvento({ id: 'evt-13', estado: 'cancelado' });

    await revisarCambiosDeEstado([cancelado], [cancelado]);

    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('si un evento guardado suspendido vuelve a programado, el recordatorio vuelve sin pedir permiso', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-15']);

    await revisarCambiosDeEstado([crearEvento({ id: 'evt-15', estado: 'suspendido' })], [crearEvento({ id: 'evt-15' })]);

    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'recordatorio:evt-15' }),
    );
    // Refrescar la agenda no es un toque de la persona: no abre el cartel del permiso.
    expect(pedirPermisoNotificaciones).not.toHaveBeenCalled();
    expect(hayPermisoNotificaciones).toHaveBeenCalled();
  });

  test('si se reprograma y vuelve a suspenderse, avisa otra vez', async () => {
    jest.mocked(leerIdsEventosGuardados).mockResolvedValue(['evt-16']);
    const programado = crearEvento({ id: 'evt-16' });
    const suspendido = crearEvento({ id: 'evt-16', estado: 'suspendido' });

    await revisarCambiosDeEstado([programado], [suspendido]);
    await revisarCambiosDeEstado([suspendido], [programado]);
    await revisarCambiosDeEstado([programado], [suspendido]);

    const avisosDeSuspension = Notificaciones.scheduleNotificationAsync.mock.calls.filter(
      ([pedido]) => pedido.content.title === 'Se suspendió Peña',
    );
    expect(avisosDeSuspension).toHaveLength(2);
  });

  test('si no puede leer los guardados, no rompe', async () => {
    const consola = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(leerIdsEventosGuardados).mockRejectedValue(new Error('SQLite cerrado'));

    await expect(revisarCambiosDeEstado([], [crearEvento({ id: 'evt-14', estado: 'cancelado' })])).resolves.toBeUndefined();
    expect(consola).toHaveBeenCalled();
    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
