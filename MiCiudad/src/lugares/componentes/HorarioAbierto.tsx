// Dueño: B — Lugares y datos
// UI de abierto/cerrado usando horarios.ts.

import { StyleSheet, Text, View } from 'react-native';

import { colorAbierto, tipografia, useTema } from '@/compartido/tema';
import { estadoCorto, renglonesHorario, textoEstadoHorario } from '@/lugares/horarios';
import type { Lugar } from '@/tipos/lugar';

type Props = {
  lugar: Lugar;
};

// El renglón del wireframe más la grilla de la semana.
// Recalcula con new Date() cada vez que se dibuja (al abrir o al volver).
export function HorarioAbierto({ lugar }: Props) {
  const { colores, oscuro } = useTema();
  const ahora = new Date();
  const estado = textoEstadoHorario(lugar, ahora);
  const renglones = renglonesHorario(lugar, ahora);
  // Mismos colores que TextoEstado en las tarjetas: verde abierto, rojo cerrado.
  const corto = estadoCorto(lugar, ahora);
  const color = corto === 'abierto' ? colorAbierto(oscuro) : colores.peligro;

  return (
    <View style={estilos.bloque}>
      <Text style={[estilos.estado, { color }]}>
        {estado}
      </Text>
      {renglones.map((renglon) => (
        <Text key={renglon} style={[estilos.renglon, { color: colores.textoSuave }]}>
          {renglon}
        </Text>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: 4,
  },
  estado: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  renglon: {
    fontSize: tipografia.cuerpo,
  },
});
