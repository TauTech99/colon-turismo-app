// Dueño: C — Mapa y agenda
// GPS + permisos. Si niegan, el mapa sigue sin "vos estás acá".

import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';

import type { Coordenadas } from '@/tipos/lugar';

export type EstadoPermiso = 'concedido' | 'denegado' | 'pendiente';

// Contrato: coordenadas null si niegan el permiso.
// Solo pide ubicación EN USO (primer plano). El permiso "siempre"
// lo pide src/mapa/proximidad.ts, no este hook.
//
// Si el turista niega y después activa en Ajustes, al volver a la app
// (AppState active) volvemos a consultar el permiso sin pull-to-refresh.

export function useUbicacion(): {
  coordenadas: Coordenadas | null;
  permiso: EstadoPermiso;
} {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [permiso, setPermiso] = useState<EstadoPermiso>('pendiente');

  useEffect(() => {
    let cancelado = false;
    // Evita pedir el cartel dos veces seguidas al montar + primer "active".
    let estadoApp: AppStateStatus = AppState.currentState;

    // Última conocida (rápida) y, si se puede, una lectura nueva.
    // Si el GPS está frío o los servicios tardan (típico al cerrar el
    // cartel de permiso), no tiramos error rojo: el mapa sigue.
    async function leerCoordenadas() {
      try {
        const ultima = await Location.getLastKnownPositionAsync();
        if (!cancelado && ultima) {
          setCoordenadas({
            latitud: ultima.coords.latitude,
            longitud: ultima.coords.longitude,
          });
        }
      } catch {
        // Sin caché del sistema: igual intentamos la lectura actual.
      }

      try {
        const serviciosOn = await Location.hasServicesEnabledAsync();
        if (!serviciosOn) {
          console.log('[ubicacion] Servicios de ubicación apagados; el mapa sigue');
          return;
        }

        const actual = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelado) {
          return;
        }

        setCoordenadas({
          latitud: actual.coords.latitude,
          longitud: actual.coords.longitude,
        });
      } catch (error) {
        // "Current location is unavailable" al abrir / al volver del diálogo.
        // Reintento corto: el chipset a veces tarda 1–2 s después del permiso.
        console.log(
          '[ubicacion] GPS actual no disponible; reintento en 2 s',
          error,
        );
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelado) {
          return;
        }
        try {
          const reintento = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (cancelado) {
            return;
          }
          setCoordenadas({
            latitud: reintento.coords.latitude,
            longitud: reintento.coords.longitude,
          });
        } catch (segundoError) {
          console.log(
            '[ubicacion] GPS sigue sin respuesta; se usa la última conocida si hay',
            segundoError,
          );
        }
      }
    }

    // Primera vez: puede mostrar el cartel del sistema.
    async function pedirAlAbrir() {
      try {
        const respuesta = await Location.requestForegroundPermissionsAsync();
        if (cancelado) {
          return;
        }

        if (respuesta.status !== Location.PermissionStatus.GRANTED) {
          setPermiso('denegado');
          setCoordenadas(null);
          return;
        }

        setPermiso('concedido');
        // Última conocida (rápida) y después lectura fina.
        await leerCoordenadas();
      } catch (error) {
        console.log('[ubicacion] No se pudo leer la ubicación', error);
      }
    }

    // Al volver de Ajustes / del diálogo de permiso: solo consulta, sin cartel.
    async function alVolverAlFrente() {
      try {
        const actual = await Location.getForegroundPermissionsAsync();
        if (cancelado) {
          return;
        }

        if (actual.status !== Location.PermissionStatus.GRANTED) {
          setPermiso('denegado');
          setCoordenadas(null);
          return;
        }

        setPermiso('concedido');
        await leerCoordenadas();
      } catch (error) {
        console.log('[ubicacion] No se pudo actualizar al volver', error);
      }
    }

    void pedirAlAbrir();

    const sub = AppState.addEventListener('change', (siguiente) => {
      const volvioAlFrente =
        estadoApp.match(/inactive|background/) && siguiente === 'active';
      estadoApp = siguiente;
      if (volvioAlFrente) {
        void alVolverAlFrente();
      }
    });

    return () => {
      cancelado = true;
      sub.remove();
    };
  }, []);

  return { coordenadas, permiso };
}
