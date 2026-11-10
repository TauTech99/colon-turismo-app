// Dueño: B — Lugares y datos
// En la ficha: ¿este lugar tiene cartel QR? Si no, que no lo busquen.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { BORDE_CAJA, tipografia, useTema } from '@/compartido/tema';

type Props = {
  codigoQr: string | null;
};

export function AvisoQrLugar({ codigoQr }: Props) {
  const { colores } = useTema();
  const tieneCartel = codigoQr !== null;

  const titulo = tieneCartel ? 'Hay un cartel con QR' : 'Acá no hay cartel QR';
  const texto = tieneCartel
    ? 'Lo vas a ver en el lugar. Escanealo para dejar constancia de que viniste.'
    : 'No hace falta recorrerlo buscándolo. Registrá la visita a mano o con Estoy acá, si estás cerca.';
  const icono = tieneCartel ? 'qr-code-outline' : 'hand-left-outline';

  return (
    <View
      style={[
        estilos.bloque,
        { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${titulo}. ${texto}`}
    >
      <View style={estilos.fila}>
        <Ionicons name={icono} size={22} color={colores.primario} />
        <Text style={[estilos.titulo, { color: colores.texto }]}>{titulo}</Text>
      </View>
      <Text style={[estilos.texto, { color: colores.textoSuave }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: BORDE_CAJA,
    gap: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  texto: {
    fontSize: tipografia.cuerpo,
  },
});
