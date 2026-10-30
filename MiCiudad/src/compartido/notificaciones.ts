// Dueño: A — Cuenta y plataforma
// Canal y permisos compartidos (recordatorios C + proximidad C).
// El toque del aviso abre la ficha (lugar o evento).

import { useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

// Permiso + canal de Android. Lo usan el recordatorio y el aviso de
// cancelación de eventos, y el aviso de proximidad.
//
// Notificación local = la programa ESTE teléfono. No es push
// (nadie le pega al teléfono dormido desde un servidor).
//
// Expo Go en Android (SDK 53+): importar expo-notifications al
// arrancar crashea. Acá el paquete se importa recién cuando hace falta,
// y en Expo Go Android no se importa.

export const CANAL_EVENTOS = 'eventos';

const enElTelefono = Platform.OS === 'android' || Platform.OS === 'ios';

type ModuloNotificaciones = typeof import('expo-notifications');

let promesaModulo: Promise<ModuloNotificaciones | null> | null = null;
let handlerConfigurado = false;

export function notificacionesEnEsteEntorno(): boolean {
  if (!enElTelefono) {
    return false;
  }
  // Expo Go Android: el módulo tira error al cargarse.
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return false;
  }
  return true;
}

export async function cargarNotificaciones(): Promise<ModuloNotificaciones | null> {
  if (!notificacionesEnEsteEntorno()) {
    return null;
  }

  if (!promesaModulo) {
    promesaModulo = import('expo-notifications').catch((error) => {
      console.log('[notificaciones] No disponibles en este entorno', error);
      return null;
    });
  }

  return promesaModulo;
}

export async function configurarNotificaciones(): Promise<void> {
  if (!notificacionesEnEsteEntorno() || handlerConfigurado) {
    return;
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return;
  }

  // Con la app abierta, Expo no muestra el aviso salvo que
  // digamos acá "sí, mostralo". Con la app cerrada lo muestra el sistema.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigurado = true;
}

export async function hayPermisoNotificaciones(): Promise<boolean> {
  if (!notificacionesEnEsteEntorno()) {
    return false;
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return false;
  }

  try {
    const actual = await Notifications.getPermissionsAsync();
    return actual.granted;
  } catch (error) {
    console.error('[notificaciones] No se pudo consultar el permiso', error);
    return false;
  }
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (!notificacionesEnEsteEntorno()) {
    return false;
  }

  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      // Android 8+: sin canal no aparece el aviso.
      // Android 13+: el diálogo de permiso aparece después de crear el canal.
      await Notifications.setNotificationChannelAsync(CANAL_EVENTOS, {
        name: 'Eventos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) {
      return true;
    }

    const pedido = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return pedido.granted;
  } catch (error) {
    console.error('[notificaciones] No se pudo pedir el permiso', error);
    return false;
  }
}

// Papelito escondido en el aviso. El turista no lo ve.
export type DestinoAviso = {
  tipo: 'lugar' | 'evento';
  id: string;
};

function leerDestino(data: unknown): DestinoAviso | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const dato = data as Record<string, unknown>;
  if ((dato.tipo !== 'lugar' && dato.tipo !== 'evento') || typeof dato.id !== 'string') {
    return null;
  }
  if (dato.id === '') {
    return null;
  }
  return { tipo: dato.tipo, id: dato.id };
}

function idDeRespuesta(respuesta: { notification: { request: { identifier: string } } }): string {
  return respuesta.notification.request.identifier;
}

// App abierta o recién arrancada por un toque: lee el papelito y abre la ficha.
export function useAbrirDesdeAviso(): void {
  const router = useRouter();
  const yaAbierto = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let suscripcion: { remove: () => void } | null = null;

    function abrir(data: unknown, identificador: string, esperar: boolean) {
      const destino = leerDestino(data);
      if (!destino || yaAbierto.current === identificador) {
        return;
      }
      yaAbierto.current = identificador;

      const ir = () => {
        if (destino.tipo === 'lugar') {
          router.push({ pathname: '/lugar/[id]', params: { id: destino.id } });
        } else {
          router.push({ pathname: '/evento/[id]', params: { id: destino.id } });
        }
        console.log(`[notificaciones] Toque → ${destino.tipo}/${destino.id}`);
      };

      // App cerrada: el Stack todavía no está listo. Un toque tardío no espera.
      if (esperar) {
        setTimeout(ir, 300);
      } else {
        ir();
      }
    }

    void (async () => {
      const Notifications = await cargarNotificaciones();
      if (!Notifications || cancelado) {
        return;
      }

      const ultima = await Notifications.getLastNotificationResponseAsync();
      if (ultima && !cancelado) {
        abrir(ultima.notification.request.content.data, idDeRespuesta(ultima), true);
        await Notifications.clearLastNotificationResponseAsync();
      }

      suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
        abrir(respuesta.notification.request.content.data, idDeRespuesta(respuesta), false);
      });
    })();

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [router]);
}
