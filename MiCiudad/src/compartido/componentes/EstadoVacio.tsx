import { StyleSheet, Text, View } from 'react-native';

import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  mensaje: string;
};

// Lista sin resultados (req. 3). El texto lo pone cada pantalla
// ("No hay lugares", "No hay favoritos", etc.).

export function EstadoVacio({ mensaje }: Props) {
  const { colores } = useTema();

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
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
  },
  texto: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
