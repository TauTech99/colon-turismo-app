// Dueño: C — Mapa y agenda
// Aviso "Estás cerca de…" (1 por lugar y por día). Lee prefs de A.

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Storage from 'expo-sqlite/kv-store';

import { distanciaMetros } from '@/compartido/distancia';
import { claveDiaEnColon } from '@/compartido/zonaColon';
import {
  CANAL_EVENTOS,
  cargarNotificaciones,
  hayPermisoNotificaciones,
  pedirPermisoNotificaciones,
} from '@/compartido/notificaciones';
import { leerPreferenciasGuardadas, usePreferencias } from '@/cuenta/usePreferencias';
import { leerLugares } from '@/lugares/lugaresDb';
import type { Coordenadas } from '@/tipos/lugar';

// Aviso al entrar al radio de un lugar activo. Req. 6 + PRD §9:
// un aviso por lugar y por día. Respeta avisarProximidad y
// radioAvisoMetros (las guarda A en Yo; C solo las lee).
//
// Puede sonar con la app cerrada → esta tarea
// + permiso "siempre". Si lo niegan, la app sigue.
// No se prioriza contra el recordatorio de eventos.
// Este radio NO es el de "estuve" (100 m fijos, en BotonRegistrarVisita).

export const NOMBRE_TAREA_PROXIMIDAD = 'miciudad.proximidad';

const CLAVE_AVISOS = 'miciudad.avisosProximidad';

const enElTelefono = Platform.OS === 'android' || Platform.OS === 'ios';

// lugarId → "2026-09-28" (día local). kv-store
// guarda el último aviso por lugar.
type AvisosPorLugar = Record<string, string>;

type CuerpoTareaUbicacion = {
  locations?: Location.LocationObject[];
};

// defineTask TIENE que correr al cargar este módulo (alcance global),
// lo antes posible. Si queda abajo del archivo, en un arranque en frío
// o un reload de Metro el nativo puede mandar un update de GPS ANTES
// de que JS registre la tarea → WARN / aviso perdido.
// Docs Expo SDK 57 TaskManager + Location: "top-level scope" /
// "during initialization phase". No va en useEffect ni en un botón.
//
// Nota sobre el WARN "No task registered for key expo-task-manager":
// esa key NO es miciudad.proximidad. Es un headless de React Native
// que registra el propio paquete expo-task-manager al importarlo
// (AppRegistry.registerHeadlessTask), para que Android no pause los
// timers JS en segundo plano. Si el nativo arranca ese headless antes
// de que este import corra, Metro muestra ese WARN. Por eso este
// módulo se importa arriba de todo en _layout.tsx.
if (enElTelefono) {
  TaskManager.defineTask(NOMBRE_TAREA_PROXIMIDAD, async ({ data, error }) => {
    if (error) {
      console.error('[proximidad] Error en la tarea', error);
      return;
    }

    const locations = (data as CuerpoTareaUbicacion).locations;
    if (!locations || locations.length === 0) {
      return;
    }

    const ultima = locations[locations.length - 1];
    // revisarProximidad está más abajo (function declaration = hoisted).
    await revisarProximidad({
      latitud: ultima.coords.latitude,
      longitud: ultima.coords.longitude,
    });
  });
}

function canalSiAndroid(): string | undefined {
  return Platform.OS === 'android' ? CANAL_EVENTOS : undefined;
}

export function fechaLocalHoy(ahora: Date = new Date()): string {
  return claveDiaEnColon(ahora);
}

async function leerAvisos(): Promise<AvisosPorLugar> {
  try {
    const crudo = await Storage.getItem(CLAVE_AVISOS);
    if (!crudo) {
      return {};
    }
    const dato: unknown = JSON.parse(crudo);
    if (typeof dato !== 'object' || dato === null || Array.isArray(dato)) {
      return {};
    }
    const avisos: AvisosPorLugar = {};
    for (const [lugarId, dia] of Object.entries(dato)) {
      if (typeof dia === 'string') {
        avisos[lugarId] = dia;
      }
    }
    return avisos;
  } catch (error) {
    console.error('[proximidad] No se pudieron leer los avisos', error);
    return {};
  }
}

async function guardarAvisos(avisos: AvisosPorLugar): Promise<void> {
  try {
    await Storage.setItem(CLAVE_AVISOS, JSON.stringify(avisos));
  } catch (error) {
    console.error('[proximidad] No se pudieron guardar los avisos', error);
  }
}

function soloLosDeHoy(avisos: AvisosPorLugar, hoy: string): AvisosPorLugar {
  const vivos: AvisosPorLugar = {};
  for (const [lugarId, dia] of Object.entries(avisos)) {
    if (dia === hoy) {
      vivos[lugarId] = dia;
    }
  }
  return vivos;
}

async function mostrarAvisoProximidad(lugarId: string, nombre: string): Promise<void> {
  const Notifications = await cargarNotificaciones();
  if (!Notifications) {
    return;
  }

  const canal = canalSiAndroid();
  await Notifications.scheduleNotificationAsync({
    identifier: `proximidad:${lugarId}`,
    content: {
      title: 'Estás cerca',
      body: `Estás cerca de ${nombre}`,
      data: { tipo: 'lugar', id: lugarId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      ...(canal ? { channelId: canal } : {}),
    },
  });
}

// Si dos lecturas del GPS llegan juntas, la segunda espera.
// Así no se mandan dos avisos del mismo lugar el mismo segundo.
let colaRevision: Promise<void> = Promise.resolve();

// ¿Hay un lugar activo dentro del radio de Yo? → un aviso por lugar y por día.
// Respeta avisarProximidad / radioAvisoMetros (prefs de A).
export function revisarProximidad(coordenadas: Coordenadas): Promise<void> {
  const trabajo = colaRevision.then(
    () => revisarProximidadAhora(coordenadas),
    () => revisarProximidadAhora(coordenadas),
  );
  colaRevision = trabajo.then(
    () => undefined,
    () => undefined,
  );
  return trabajo;
}

async function revisarProximidadAhora(coordenadas: Coordenadas): Promise<void> {
  if (!enElTelefono) {
    return;
  }

  const prefs = leerPreferenciasGuardadas();
  if (!prefs.avisarProximidad) {
    return;
  }

  const radio = prefs.radioAvisoMetros;
  const hoy = fechaLocalHoy();

  let lugares;
  try {
    lugares = await leerLugares();
  } catch (error) {
    console.error('[proximidad] No se pudieron leer los lugares', error);
    return;
  }

  const avisos = soloLosDeHoy(await leerAvisos(), hoy);
  let cambio = false;

  for (const lugar of lugares) {
    if (!lugar.activo) {
      continue;
    }
    if (avisos[lugar.id] === hoy) {
      continue;
    }

    const metros = distanciaMetros(coordenadas, lugar.coordenadas);
    if (metros > radio) {
      continue;
    }

    const permitido = await pedirPermisoNotificaciones();
    if (!permitido) {
      console.log('[proximidad] Sin permiso de avisos. No se muestra.');
      return;
    }

    await mostrarAvisoProximidad(lugar.id, lugar.nombre);
    avisos[lugar.id] = hoy;
    cambio = true;
    console.log(`[proximidad] Aviso de ${lugar.id} (${Math.round(metros)} m, radio ${radio})`);
  }

  if (cambio) {
    await guardarAvisos(avisos);
  }
}

async function hayPermisoSiempre(): Promise<boolean> {
  const actual = await Location.getBackgroundPermissionsAsync();
  return actual.status === Location.PermissionStatus.GRANTED;
}

export type ResultadoPermisoProximidad = 'siempre' | 'soloAbierta' | 'sinGps' | 'sinAvisos';

// Lo llama Yo cuando el turista PRENDE el switch. Acá sí se pide
// “siempre”. Al arrancar la app solo se consulta, no se molesta.
export async function pedirPermisosAlPrenderAviso(): Promise<ResultadoPermisoProximidad> {
  if (!enElTelefono) {
    return 'soloAbierta';
  }

  const enUso = await Location.requestForegroundPermissionsAsync();
  if (enUso.status !== Location.PermissionStatus.GRANTED) {
    return 'sinGps';
  }

  const avisos = await pedirPermisoNotificaciones();
  if (!avisos) {
    return 'sinAvisos';
  }

  if (await hayPermisoSiempre()) {
    return 'siempre';
  }

  const actual = await Location.getBackgroundPermissionsAsync();
  // Ya dijo que no: el sistema no vuelve a preguntar. Yo le explica.
  if (actual.status === Location.PermissionStatus.DENIED) {
    return 'soloAbierta';
  }

  const pedido = await Location.requestBackgroundPermissionsAsync();
  return pedido.status === Location.PermissionStatus.GRANTED ? 'siempre' : 'soloAbierta';
}

// Apaga la tarea de fondo (switch de Yo en off, o sin permiso).
export async function detenerProximidad(): Promise<void> {
  if (!enElTelefono) {
    return;
  }

  try {
    const andando = await Location.hasStartedLocationUpdatesAsync(NOMBRE_TAREA_PROXIMIDAD);
    if (andando) {
      await Location.stopLocationUpdatesAsync(NOMBRE_TAREA_PROXIMIDAD);
      console.log('[proximidad] Tarea de fondo detenida');
    }
  } catch (error) {
    console.log('[proximidad] No había tarea de fondo que detener', error);
  }
}

// Registra la tarea de ubicación en segundo plano si el switch de Yo está on.
export async function iniciarProximidad(): Promise<void> {
  if (!enElTelefono) {
    return;
  }

  const prefs = leerPreferenciasGuardadas();
  if (!prefs.avisarProximidad) {
    await detenerProximidad();
    return;
  }

  try {
    const enUso = await Location.getForegroundPermissionsAsync();
    if (enUso.status !== Location.PermissionStatus.GRANTED) {
      console.log('[proximidad] Sin GPS en uso. No se avisa. El mapa sigue.');
      await detenerProximidad();
      return;
    }

    const notificaciones = await hayPermisoNotificaciones();
    if (!notificaciones) {
      console.log('[proximidad] Sin permiso de avisos. No se arranca la tarea.');
      return;
    }

    const siempre = await hayPermisoSiempre();
    if (!siempre) {
      console.log('[proximidad] Sin permiso "siempre". Solo se avisa con la app abierta.');
    }

    // La tarea de fondo pide “siempre”. Si no lo dio, solo watch con la app abierta.
    const hayTarea = await TaskManager.isAvailableAsync();
    if (hayTarea && siempre) {
      // Defensa: no arrancar updates si defineTask no corrió (carrera / Fast Refresh).
      if (!TaskManager.isTaskDefined(NOMBRE_TAREA_PROXIMIDAD)) {
        console.error(
          '[proximidad] defineTask no está. No se arranca la tarea de fondo.',
        );
      } else {
        const andando = await Location.hasStartedLocationUpdatesAsync(
          NOMBRE_TAREA_PROXIMIDAD,
        );
        if (!andando) {
          await Location.startLocationUpdatesAsync(NOMBRE_TAREA_PROXIMIDAD, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
            timeInterval: 15_000,
            // Android: sin este aviso persistente el sistema corta el GPS
            // al mandar la app atrás. NO es el aviso de proximidad.
            foregroundService: {
              notificationTitle: 'Mi Ciudad Colón',
              notificationBody: 'Te avisamos si te acercás a un lugar.',
              killServiceOnDestroy: false,
            },
          });
          console.log('[proximidad] Tarea de fondo arrancada');
        }
      }
    } else if (!hayTarea) {
      console.log('[proximidad] TaskManager no está (Expo Go). Solo con la app abierta.');
    }

    const actual = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await revisarProximidad({
      latitud: actual.coords.latitude,
      longitud: actual.coords.longitude,
    });
  } catch (error) {
    console.error('[proximidad] No se pudo iniciar', error);
  }
}

// Arranca o para según el switch de Yo. Se llama desde el layout
// (adentro de ProveedorPreferencias) para que apagar el switch
// corte la tarea aunque no estén en el mapa.
export function useProximidad(): void {
  const { preferencias } = usePreferencias();

  useEffect(() => {
    if (!enElTelefono) {
      return;
    }

    if (!preferencias.avisarProximidad) {
      void detenerProximidad();
      return;
    }

    void iniciarProximidad();

    let suscripcion: Location.LocationSubscription | null = null;
    let cancelado = false;

    // Expo Go (sobre todo Android) no corre la tarea de fondo.
    // Con la app abierta igual se puede probar simulando GPS.
    void (async () => {
      const permiso = await Location.getForegroundPermissionsAsync();
      if (cancelado || permiso.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      // Con la app abierta: sirve en Expo Go (ahí no hay fondo de verdad).
      // El tope de un aviso por lugar y por día evita el duplicado
      // si también corre la tarea.
      suscripcion = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 15_000,
        },
        (posicion) => {
          void revisarProximidad({
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
          });
        },
      );
    })();

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [preferencias.avisarProximidad]);
}
