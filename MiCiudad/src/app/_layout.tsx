// Dueño: A — Cuenta y plataforma
// Stack raíz: sesión, tema, preferencias, banner sin red.
// Arranca SQLite (B), proximidad (C) y sync de visitas (D).

import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// PRIMERO entre los imports de la app: al cargar proximidad.ts se
// importa expo-task-manager (registra el headless "expo-task-manager"
// en AppRegistry) y corre defineTask("miciudad.proximidad").
// Tiene que ir arriba: si el nativo dispara un update de GPS al abrir
// y JS todavía no registró, Metro tira WARN "No task registered for
// key expo-task-manager". Ese key NO es miciudad.proximidad.
import { useProximidad } from '@/mapa/proximidad';
import { BannerSinConexion } from '@/compartido/componentes/BannerSinConexion';
import { ProveedorConsulta } from '@/compartido/consulta';
import { abrirBase } from '@/compartido/db';
import { configurarNotificaciones, useAbrirDesdeAviso } from '@/compartido/notificaciones';
import { pingSalud } from '@/servicios/salud';
import { crearOpcionesEncabezado, crearTemaNavegacion, useTema } from '@/compartido/tema';
import { useRed } from '@/compartido/useRed';
import { ProveedorPreferencias } from '@/cuenta/usePreferencias';
import { ProveedorSesion } from '@/cuenta/SesionContext';
import { RecuperarVisitaTrasCamara } from '@/recorrido/componentes/RecuperarVisitaTrasCamara';
import { useSincronizacion } from '@/recorrido/useSincronizacion';

export default function LayoutRaiz() {
  // B abre la base acá porque tiene que existir apenas arranca la app.
  useEffect(() => {
    abrirBase().catch((error) => {
      console.error('[db] No se pudo abrir la base', error);
    });
    // En Expo Go Android no carga expo-notifications (SDK 53+).
    void configurarNotificaciones();
    // Tubo HTTP: ¿llega /salud? El catálogo sigue en mock.
    void pingSalud();
  }, []);

  // Query afuera: cualquier pantalla puede usar useQuery.
  // Preferencias envuelve el resto: useTema lee el tema de kv-store.
  return (
    <ProveedorConsulta>
      <ProveedorPreferencias>
        <ProveedorSesion>
          <ContenidoConTema />
        </ProveedorSesion>
      </ProveedorPreferencias>
    </ProveedorConsulta>
  );
}

function ContenidoConTema() {
  const { colores, oscuro } = useTema();
  const temaNavegacion = crearTemaNavegacion(colores, oscuro);
  // defineTask vive en proximidad.ts (alcance global).
  // El hook lee el switch de Yo y arranca o para la tarea.
  useProximidad();
  // D: al volver la red, sube visitas con sincronizada: false.
  useSincronizacion();
  // Toque de un aviso → ficha del lugar o del evento.
  useAbrirDesdeAviso();
  const { online } = useRed();
  const insets = useSafeAreaInsets();
  // Sin red, el banner ya tapa la barra de estado: los encabezados
  // de abajo no tienen que reservar ese espacio otra vez.
  const insetsPantallas = online ? insets : { ...insets, top: 0 };

  return (
    <ThemeProvider value={temaNavegacion}>
      <View style={{ flex: 1 }}>
        {/* El encabezado pinta también el status bar: verde yatay en claro y
            azul noche en oscuro. Los dos son oscuros: íconos claros. */}
        <StatusBar style="light" />
        <BannerSinConexion />
        <RecuperarVisitaTrasCamara />
        <SafeAreaInsetsContext.Provider value={insetsPantallas}>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                ...crearOpcionesEncabezado(colores),
                contentStyle: { backgroundColor: colores.fondo },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
              <Stack.Screen name="lugar/[id]" options={{ title: 'Lugar' }} />
              <Stack.Screen name="evento/[id]" options={{ title: 'Evento' }} />
              <Stack.Screen
                name="escanear"
                options={{ title: 'Escanear QR', presentation: 'modal' }}
              />
              <Stack.Screen name="visita/nueva" options={{ title: 'Nueva visita' }} />
            </Stack>
          </View>
        </SafeAreaInsetsContext.Provider>
      </View>
    </ThemeProvider>
  );
}
