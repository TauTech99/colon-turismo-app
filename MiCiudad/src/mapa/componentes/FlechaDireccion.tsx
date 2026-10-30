// Dueño: C — Mapa y agenda
// Flecha que apunta al lugar (magnetómetro + GPS).

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  grados: number;
  nombreLugar: string;
};

// Flecha que gira para apuntar al lugar. "Arriba" en el ícono
// es el frente del teléfono. Va en el detalle (PRD §7.2).
export function FlechaDireccion({ grados, nombreLugar }: Props) {
  const { colores } = useTema();

  return (
    <View
      style={[
        estilos.bloque,
        { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Flecha hacia ${nombreLugar}`}
    >
      <View
        style={[
          estilos.brujula,
          { borderColor: colores.borde, backgroundColor: `${colores.primario}14` },
        ]}
      >
        <Text style={[estilos.norte, { color: colores.primario }]}>N</Text>
        <View style={{ transform: [{ rotate: `${grados}deg` }] }}>
          <Ionicons name="navigate" size={42} color={colores.primario} />
        </View>
      </View>
      <View style={estilos.textos}>
        <Text style={[estilos.antetitulo, { color: colores.textoSuave }]}>
          Desde tu ubicación
        </Text>
        <Text style={[estilos.texto, { color: colores.texto }]}>Seguí la flecha</Text>
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
          Sostené el teléfono de frente. La dirección se ajusta mientras girás.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    gap: 14,
  },
  brujula: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  norte: {
    position: 'absolute',
    top: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  textos: {
    flex: 1,
    gap: 3,
  },
  antetitulo: {
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  texto: {
    fontSize: tipografia.cuerpo + 1,
    fontWeight: '700',
  },
  ayuda: {
    fontSize: tipografia.cuerpo - 2,
    lineHeight: 18,
  },
});
