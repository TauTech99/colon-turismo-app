import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  mensaje?: string;
};

// Lo que se ve mientras la pantalla espera al servicio (req. 3).

export function EstadoCarga({ mensaje = 'Cargando…' }: Props) {
  const { colores } = useTema();

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      <ActivityIndicator size="large" color={colores.primario} />
      <Text style={[estilos.texto, { color: colores.texto }]}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  texto: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
