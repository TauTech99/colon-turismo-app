// Dueño: D — Recorrido y audioguías
// Caso feo del PRD: lugar sin audioguía. Texto claro, no un vacío.

import { StyleSheet, Text, View } from 'react-native';

import { BORDE_CAJA, tipografia, useTema } from '@/compartido/tema';

// El PRD pide mocks con lugares sin audioguía. Si no mostramos nada,
// parece que la app falló. Un aviso fijo dice "todavía no hay".
export function SinAudioguia() {
  const { colores } = useTema();

  return (
    <View
      style={[
        estilos.bloque,
        { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
      ]}
      accessibilityRole="text"
      accessibilityLabel="Todavía sin audioguía"
    >
      <Text style={[estilos.titulo, { color: colores.texto }]}>Audioguía</Text>
      <Text style={[estilos.texto, { color: colores.textoSuave }]}>
        Todavía sin audioguía.
      </Text>
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
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  texto: {
    fontSize: tipografia.cuerpo,
  },
});
