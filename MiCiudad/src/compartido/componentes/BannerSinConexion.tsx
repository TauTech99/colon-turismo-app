// Dueño: A — Cuenta y plataforma
// Aviso global cuando no hay red (datos guardados).

import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tipografia, useTema } from '@/compartido/tema';
import { useRed } from '@/compartido/useRed';

// Franja de toda la app. Si hay red, no se dibuja nada.
// El texto avisa que la app sigue con lo guardado (PRD §9).

export function BannerSinConexion() {
  const { online } = useRed();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();

  if (online) {
    return null;
  }

  return (
    <View
      style={[
        estilos.franja,
        {
          backgroundColor: colores.avisoFondo,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <Text style={[estilos.texto, { color: colores.avisoTexto }]}>
        Sin conexión — mostrando datos guardados
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  texto: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
    textAlign: 'center',
  },
});
