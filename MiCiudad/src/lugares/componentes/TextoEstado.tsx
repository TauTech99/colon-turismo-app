// Dueño: B — Lugares y datos
// "Abierto" / "Cerrado" con su color, para tarjetas.

import { Text, type StyleProp, type TextStyle } from 'react-native';

import { colorAbierto, useTema } from '@/compartido/tema';
import { estadoCorto } from '@/lugares/horarios';
import type { Lugar } from '@/tipos/lugar';

const TEXTOS = {
  abierto: 'Abierto',
  cerrado: 'Cerrado',
} as const;

type Props = {
  lugar: Lugar;
  style?: StyleProp<TextStyle>;
};

// Recalcula con new Date() cada vez que se dibuja (igual que HorarioAbierto).
export function TextoEstado({ lugar, style }: Props) {
  const { colores, oscuro } = useTema();
  const estado = estadoCorto(lugar, new Date());
  const color = estado === 'abierto' ? colorAbierto(oscuro) : colores.peligro;

  // Android mide la negrita más angosta de lo que la dibuja y cortaba
  // "Cerrado" → "Cerrad". textBreakStrategy simple + un poco de aire lo evita.
  // flexShrink 0 va después de style: la palabra nunca se achica en una fila.
  return (
    <Text
      textBreakStrategy="simple"
      style={[{ color, fontWeight: '700', paddingRight: 2 }, style, { flexShrink: 0 }]}
    >
      {TEXTOS[estado]}
    </Text>
  );
}

export function textoEstadoCorto(lugar: Lugar): string {
  return TEXTOS[estadoCorto(lugar, new Date())];
}
