// Dueño: D — Recorrido y audioguías
// Cámara + resolverLugarDesdeQr (GET /lugares/qr). QR ajeno: mensaje.

import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';
import { resolverLugarDesdeQr } from '@/recorrido/qr';
import type { Lugar } from '@/tipos/lugar';

type Props = {
  // false = la pantalla está guardando o ya terminó: no leer más códigos.
  activo: boolean;
  // Lugar listo para registrar (formato OK + existe en el catálogo).
  onLugarListo: (lugar: Lugar) => void;
  // true = va dentro de un recuadro (visita/registrar), no a pantalla
  // completa: no reserva lugar para la barra de Android.
  enCaja?: boolean;
};

// Cámara leyendo solo QR. Si el código es ajeno, roto o de un id
// que no existe: mensaje claro y se sigue escaneando (Req §7.4).
// No se cuelga: el try/catch envuelve el parseo y la búsqueda.

export function EscanerQR({ activo, onLugarListo, enCaja = false }: Props) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  // Bloqueo corto para que el mismo QR no dispare 20 veces seguidas
  // (la cámara llama onBarcodeScanned muchas veces por segundo).
  const [procesando, setProcesando] = useState(false);
  const bloqueadoRef = useRef(false);

  function liberarBloqueo() {
    bloqueadoRef.current = false;
    setProcesando(false);
  }

  async function alEscanear(resultado: BarcodeScanningResult) {
    if (!activo || bloqueadoRef.current || procesando) {
      return;
    }

    bloqueadoRef.current = true;
    setProcesando(true);

    try {
      const leido = await resolverLugarDesdeQr(resultado.data);

      if (!leido.ok && leido.motivo === 'invalido') {
        Alert.alert(
          'Código no reconocido',
          'Ese QR no es de Mi Ciudad Colón. Buscá el cartel con el código del lugar.',
          [{ text: 'Seguir escaneando', onPress: liberarBloqueo }],
          { cancelable: true, onDismiss: liberarBloqueo },
        );
        return;
      }

      if (!leido.ok && leido.motivo === 'no-encontrado') {
        Alert.alert(
          'Lugar no encontrado',
          'El código parece de Colón, pero no está en el catálogo. Abrí Buscar una vez con conexión o escaneá otro cartel.',
          [{ text: 'Seguir escaneando', onPress: liberarBloqueo }],
          { cancelable: true, onDismiss: liberarBloqueo },
        );
        return;
      }

      if (!leido.ok && leido.motivo === 'inactivo') {
        Alert.alert(
          'Lugar cerrado',
          `${leido.nombre} ya no forma parte de la guía. Escaneá otro cartel.`,
          [{ text: 'Seguir escaneando', onPress: liberarBloqueo }],
          { cancelable: true, onDismiss: liberarBloqueo },
        );
        return;
      }

      if (!leido.ok && leido.motivo === 'sin-cartel') {
        Alert.alert(
          'Este lugar no tiene cartel QR',
          `${leido.nombre} no tiene cartel. Registrá la visita a mano o con Estoy acá.`,
          [{ text: 'Seguir escaneando', onPress: liberarBloqueo }],
          { cancelable: true, onDismiss: liberarBloqueo },
        );
        return;
      }

      // Éxito: la pantalla registra. No liberamos acá: activo
      // pasa a false mientras guarda (evita doble visita).
      // Si el guardado falla, escanear.tsx remonta este componente
      // con otra key y el bloqueo arranca limpio.
      onLugarListo(leido.lugar);
    } catch (error) {
      console.error('[qr] Falló al leer el código', error);
      Alert.alert(
        'No se pudo leer',
        'Hubo un problema al interpretar el código. La app sigue: podés intentar de nuevo.',
        [{ text: 'Seguir escaneando', onPress: liberarBloqueo }],
        { cancelable: true, onDismiss: liberarBloqueo },
      );
    }
  }

  if (!permiso) {
    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={[estilos.mensaje, { color: colores.texto }]}>Preparando la cámara…</Text>
      </View>
    );
  }

  if (!permiso.granted) {
    // canAskAgain false = el SO ya no muestra el cartel; hay que ir a Ajustes.
    const puedePedirDeNuevo = permiso.canAskAgain !== false;
    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={[estilos.mensaje, { color: colores.texto }]}>
          {puedePedirDeNuevo
            ? 'Necesitamos la cámara para leer el QR del cartel.'
            : 'Sin permiso de cámara. La app sigue: podés registrar la visita “A mano” desde la ficha del lugar.'}
        </Text>
        {puedePedirDeNuevo ? (
          <Boton titulo="Dar permiso de cámara" onPress={() => void pedirPermiso()} />
        ) : (
          <Boton titulo="Abrir ajustes" onPress={() => void Linking.openSettings()} />
        )}
        <Boton
          titulo="Volver"
          variante="secundario"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <CameraView
        style={estilos.camara}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={activo && !procesando ? alEscanear : undefined}
      />
      <View
        style={[
          estilos.banda,
          {
            backgroundColor: colores.fondo,
            // Con letra grande el texto crece: sin esto queda bajo los botones de Android.
            paddingBottom: 16 + (enCaja ? 0 : insets.bottom),
          },
        ]}
      >
        <Text style={[estilos.ayuda, { color: colores.texto }]}>
          Apuntá al QR del cartel (empieza con COLON:).
        </Text>
        {procesando ? (
          <Text style={[estilos.estado, { color: colores.textoSuave }]}>Leyendo…</Text>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  camara: {
    flex: 1,
  },
  banda: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
    textAlign: 'center',
  },
  estado: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  mensaje: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
