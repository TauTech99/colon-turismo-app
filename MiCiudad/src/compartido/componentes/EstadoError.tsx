import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  mensaje: string;
  onReintentar?: () => void;
};

// Error visible (req. 3), casi siempre de red. "Reintentar" vuelve
// a llamar al servicio. Si no se pasa onReintentar, solo se ve el texto.

export function EstadoError({ mensaje, onReintentar }: Props) {
  const { colores } = useTema();

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[estilos.texto, { color: colores.peligro }]}>{mensaje}</Text>
      {onReintentar ? <Boton titulo="Reintentar" onPress={onReintentar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  texto: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
