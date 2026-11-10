// Dueño: D — Recorrido y audioguías
// Foto de visita adentro de la app. PRD: expo-camera (CameraView).
// No abre la cámara de Samsung: en el A14 eso mata la Activity.

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  visible: boolean;
  onFoto: (uri: string) => void;
  onCerrar: () => void;
};

// Tres ramas del permiso, igual que EscanerQR (cátedra U04.01).
// takePictureAsync como el slide de U04.T02. La uri queda en caché:
// guardarFotoVisita la copia a documentos.

export function CamaraFoto({ visible, onFoto, onCerrar }: Props) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [sacando, setSacando] = useState(false);

  async function disparar() {
    if (sacando) {
      return;
    }
    setSacando(true);
    try {
      const resultado = await camara.current?.takePictureAsync({ quality: 0.7 });
      if (!resultado?.uri) {
        return;
      }
      onFoto(resultado.uri);
      onCerrar();
    } catch (error) {
      console.error('[fotos] No se pudo sacar la foto', error);
    } finally {
      setSacando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      {!visible ? null : !permiso ? (
        <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
          <Text style={[estilos.mensaje, { color: colores.texto }]}>Preparando la cámara…</Text>
        </View>
      ) : !permiso.granted ? (
        <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
          <Text style={[estilos.mensaje, { color: colores.texto }]}>
            {permiso.canAskAgain !== false
              ? 'Necesitamos la cámara para la foto de tu visita. Si no querés, podés elegir una de la galería o registrar sin foto.'
              : 'Sin permiso de cámara. La app sigue: elegí una de la galería o registrá la visita sin foto. Si querés activarla, abrí Ajustes.'}
          </Text>
          {permiso.canAskAgain !== false ? (
            <Boton titulo="Dar permiso de cámara" onPress={() => void pedirPermiso()} />
          ) : (
            <Boton titulo="Abrir ajustes" onPress={() => void Linking.openSettings()} />
          )}
          <Boton titulo="Volver" variante="secundario" onPress={onCerrar} />
        </View>
      ) : (
        <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
          <CameraView ref={camara} style={estilos.camara} facing="back" />
          <View
            style={[
              estilos.banda,
              {
                backgroundColor: colores.fondo,
                paddingBottom: 16 + insets.bottom,
              },
            ]}
          >
            <Text style={[estilos.ayuda, { color: colores.texto }]}>
              Apuntá al lugar y sacá la foto. Queda en el teléfono.
            </Text>
            <Boton
              titulo={sacando ? 'Sacando…' : 'Sacar foto'}
              onPress={() => {
                void disparar();
              }}
              deshabilitado={sacando}
            />
            <Boton titulo="Cancelar" variante="secundario" onPress={onCerrar} />
          </View>
        </View>
      )}
    </Modal>
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
    gap: 12,
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
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
