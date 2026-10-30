// Dueño: A — Cuenta y plataforma
// Botón grande táctil; lo usan todas las pantallas.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BORDE_BOTON, tipografia, useTema } from '@/compartido/tema';

type Variante = 'principal' | 'secundario';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  deshabilitado?: boolean;
};

// Botón grande compartido. Principal: lleno. Secundario: borde del color
// principal sobre fondo de tarjeta (ver "Sistema de botones" en tema.ts).
// Sin altura fija: si la letra del teléfono está al máximo, crece.

export function Boton({ titulo, onPress, variante = 'principal', deshabilitado = false }: Props) {
  const { colores } = useTema();
  const esPrincipal = variante === 'principal';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitado}
      activeOpacity={0.7}
      style={[estilos.envoltorio, deshabilitado && estilos.deshabilitado]}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
    >
      <View
        style={[
          estilos.boton,
          {
            backgroundColor: esPrincipal ? colores.primario : colores.fondoElevado,
            // Secundario: borde del color principal (se lee como botón).
            borderColor: colores.primario,
          },
        ]}
      >
        <Text
          style={[
            estilos.texto,
            { color: esPrincipal ? colores.textoSobrePrimario : colores.primario },
          ]}
        >
          {titulo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  envoltorio: {
    alignSelf: 'stretch',
  },
  boton: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontSize: tipografia.boton,
    fontWeight: '700',
    textAlign: 'center',
  },
  deshabilitado: {
    opacity: 0.5,
  },
});
