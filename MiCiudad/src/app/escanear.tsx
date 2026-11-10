// Dueño: D — Recorrido y audioguías
// Modal: cámara lee QR COLON:<id> y registra visita.

import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { EscanerQR } from '@/recorrido/componentes/EscanerQR';
import { useRegistrarVisita } from '@/recorrido/useRegistrarVisita';
import type { Lugar } from '@/tipos/lugar';

// Modal: cámara leyendo el QR del cartel.
// Registra al toque de un COLON:válido, sin foto ni nota
// (fotoUri/nota null). No abre visita/nueva (eso es el manual del 21).
// No es “Estoy acá” GPS (23) ni la cola/sync (24).

export default function PantallaEscanear() {
  const { colores } = useTema();
  const { exigirCuenta, cargando: cargandoSesion, token, cuentaDesbloqueada } = useSesion();
  const { registrar, guardando } = useRegistrarVisita();

  const [cuentaOk, setCuentaOk] = useState(false);
  // false mientras se guarda o ya se cerró el flujo: la cámara no lee más.
  const [escuchando, setEscuchando] = useState(true);
  // Si falla el guardado y se reintenta, sube la key: EscanerQR
  // se remonta y su bloqueo interno arranca limpio.
  const [claveEscaner, setClaveEscaner] = useState(0);

  // Pedir cuenta una sola vez, igual que visita/nueva.
  useEffect(() => {
    if (cargandoSesion) {
      return;
    }

    let vivo = true;
    void (async () => {
      if (token && cuentaDesbloqueada) {
        if (vivo) {
          setCuentaOk(true);
        }
        return;
      }

      const puede = await exigirCuenta();
      if (!vivo) {
        return;
      }
      if (!puede) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
        return;
      }
      setCuentaOk(true);
    })();

    return () => {
      vivo = false;
    };
    // Intencional: solo cuando terminó de cargar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [cargandoSesion]);

  async function alLugarListo(lugar: Lugar) {
    if (guardando || !escuchando) {
      return;
    }

    setEscuchando(false);

    const visita = await registrar({
      lugarId: lugar.id,
      origen: 'qr',
      uriFotoTemporal: null,
      nota: null,
    });

    if (!visita) {
      Alert.alert('No se pudo guardar', 'Probá de nuevo con el mismo cartel.', [
        {
          text: 'Seguir escaneando',
          onPress: () => {
            setClaveEscaner((n) => n + 1);
            setEscuchando(true);
          },
        },
        {
          text: 'Cerrar',
          style: 'cancel',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(
      'Visita guardada',
      `Quedó registrada en ${lugar.nombre}. La vas a ver en Mi recorrido más adelante.`,
      [
        {
          text: 'Listo',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/lugar/${lugar.id}`);
            }
          },
        },
      ],
    );
  }

  if (!cuentaOk) {
    return (
      <>
        <Stack.Screen options={{ title: 'Escanear QR' }} />
        <EstadoCarga mensaje="Comprobando cuenta…" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Escanear QR' }} />
      <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
        <EscanerQR
          key={claveEscaner}
          activo={escuchando && !guardando}
          onLugarListo={alLugarListo}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
});
