// Dueño: B — Lugares y datos
// Distintivo de lugar accesible (listado, mapa y ficha).

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

// Azul del símbolo internacional de accesibilidad: se lee igual en claro y oscuro.
const AZUL_ACCESIBLE = '#1D4ED8';

type Props = {
  tamano?: number;
};

export function IconoAccesible({ tamano = 22 }: Props) {
  return (
    <View
      style={[
        estilos.caja,
        { width: tamano, height: tamano, borderRadius: Math.round(tamano * 0.25) },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Lugar accesible"
    >
      <Ionicons name="accessibility" size={Math.round(tamano * 0.72)} color="#FFFFFF" />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    backgroundColor: AZUL_ACCESIBLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
