// Dueño: B — Lugares y datos
// Ícono de categoría: blanco dentro de un círculo del color de la categoría.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { TEXTO_SOBRE_CATEGORIA } from '@/compartido/tema';

type Props = {
  icono: string;
  color: string;
  // Diámetro del círculo en puntos.
  tamano?: number;
};

// Igual que en "Cerca tuyo": se distingue en claro y en oscuro.
export function IconoCategoria({ icono, color, tamano = 20 }: Props) {
  return (
    <View
      style={[
        estilos.circulo,
        { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: color },
      ]}
      accessible={false}
    >
      <Ionicons
        name={icono as IoniconsIconName}
        size={Math.round(tamano * 0.6)}
        color={TEXTO_SOBRE_CATEGORIA}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
