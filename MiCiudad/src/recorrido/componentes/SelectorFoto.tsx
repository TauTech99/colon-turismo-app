import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BORDE_BOTON, tipografia, useTema } from '@/compartido/tema';
import {
  borrarBorradorVisita,
  guardarBorradorVisita,
  guardarUriEnBorrador,
} from '@/recorrido/borradorVisita';
import { CamaraFoto } from '@/recorrido/componentes/CamaraFoto';

type Props = {
  lugarId: string;
  // Uri temporal (caché) o null si todavía no eligió.
  uri: string | null;
  onCambiar: (uri: string | null) => void;
};

// Cámara: expo-camera (CameraView), adentro de la app (PRD).
// Galería: expo-image-picker. El borrador es por si Android mata
// la Activity al abrir la galería (poca RAM).

export function SelectorFoto({ lugarId, uri, onCambiar }: Props) {
  const { colores } = useTema();
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  async function aplicarFoto(uriNueva: string) {
    await guardarUriEnBorrador(uriNueva);
    onCambiar(uriNueva);
  }

  async function elegirDeGaleria() {
    await guardarBorradorVisita(lugarId);

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      await borrarBorradorVisita();
      Alert.alert(
        'Sin galería',
        'No diste permiso para ver tus fotos. Podés sacar una con la cámara o registrar la visita sin foto.',
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      await aplicarFoto(resultado.assets[0].uri);
      return;
    }

    if (resultado.canceled) {
      await borrarBorradorVisita();
    }
  }

  async function quitarFoto() {
    await borrarBorradorVisita();
    onCambiar(null);
  }

  return (
    <View style={estilos.bloque}>
      <Text style={[estilos.titulo, { color: colores.texto }]}>Foto (opcional)</Text>
      <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
        Sacá una en el lugar o elegí una de la galería. Queda en el teléfono.
      </Text>

      {uri ? (
        <View style={estilos.vistaPrevia}>
          <Image source={{ uri }} style={estilos.imagen} contentFit="cover" />
          <Pressable
            onPress={() => {
              void quitarFoto();
            }}
            accessibilityRole="button"
            accessibilityLabel="Quitar foto"
            style={[estilos.botonChico, { borderColor: colores.peligro }]}
          >
            <Text style={[estilos.textoBotonChico, { color: colores.peligro }]}>Quitar foto</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={estilos.fila}>
        <Pressable
          onPress={() => {
            setCamaraAbierta(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Sacar foto con la cámara"
          style={[
            estilos.boton,
            { borderColor: colores.primario, backgroundColor: colores.fondoElevado },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.primario }]}>Cámara</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void elegirDeGaleria();
          }}
          accessibilityRole="button"
          accessibilityLabel="Elegir foto de la galería"
          style={[
            estilos.boton,
            { borderColor: colores.primario, backgroundColor: colores.fondoElevado },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.primario }]}>Galería</Text>
        </Pressable>
      </View>

      <CamaraFoto
        visible={camaraAbierta}
        onCerrar={() => setCamaraAbierta(false)}
        onFoto={(uriNueva) => {
          void aplicarFoto(uriNueva);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: 10,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
  },
  fila: {
    flexDirection: 'row',
    gap: 12,
  },
  boton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textoBoton: {
    fontSize: tipografia.boton,
    fontWeight: '700',
  },
  vistaPrevia: {
    gap: 8,
  },
  imagen: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  botonChico: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
  },
  textoBotonChico: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
});
