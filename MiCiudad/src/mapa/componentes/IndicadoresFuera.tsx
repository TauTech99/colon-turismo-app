// Dueño: C — Mapa y agenda
// Flechas en el borde del mapa hacia los lugares que quedaron fuera de la vista.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { TEXTO_SOBRE_CATEGORIA, tipografia } from '@/compartido/tema';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';

// Si un lugar queda fuera de la vista, una flecha en el borde indica
// hacia dónde está; al tocarla, el mapa va hasta ese lugar.
// A esta escala (unos km) el mapa se trata como un rectángulo plano.

type Props = {
  lugares: Lugar[];
  categorias: Categoria[];
  region: Region;
  ancho: number;
  alto: number;
  onTocar: (lugar: Lugar) => void;
};

type Indicador = {
  lugar: Lugar;
  x: number;
  y: number;
  // Grados desde arriba, en sentido horario (0 = norte de la pantalla).
  angulo: number;
  lejania: number;
};

const ANCHO_INDICADOR = 92;
const ALTO_INDICADOR = 48;
// Distancia mínima del centro del indicador a cada borde. Abajo es más
// grande: ahí van el logo de Google y el aviso "Vos estás acá".
const MARGEN_LADOS = ANCHO_INDICADOR / 2 + 4;
const MARGEN_ARRIBA = ALTO_INDICADOR / 2 + 4;
const MARGEN_ABAJO = ALTO_INDICADOR / 2 + 36;
// Si dos flechas caen más cerca que esto, se muestra solo la del más cercano.
const SEPARACION_MINIMA = 52;
const COLOR_SIN_CATEGORIA = '#64748B';

// Función pura: misma región y tamaño → mismas flechas.
export function calcularIndicadores(
  lugares: Lugar[],
  region: Region,
  ancho: number,
  alto: number,
): Indicador[] {
  const mitadAncho = ancho / 2;
  const mitadAlto = alto / 2;
  const candidatos: Indicador[] = [];

  for (const lugar of lugares) {
    // Píxeles desde el centro del mapa (y crece hacia abajo, como en pantalla).
    const dx = ((lugar.coordenadas.longitud - region.longitude) / region.longitudeDelta) * ancho;
    const dy = ((region.latitude - lugar.coordenadas.latitud) / region.latitudeDelta) * alto;

    if (Math.abs(dx) <= mitadAncho && Math.abs(dy) <= mitadAlto) {
      continue; // Se ve en el mapa: tiene su marcador, no hace falta flecha.
    }

    // Se recorre la línea centro → lugar hasta tocar el borde (con margen).
    const limiteX = mitadAncho - MARGEN_LADOS;
    const limiteY = mitadAlto - (dy > 0 ? MARGEN_ABAJO : MARGEN_ARRIBA);
    const escala = Math.min(
      dx === 0 ? Infinity : limiteX / Math.abs(dx),
      dy === 0 ? Infinity : limiteY / Math.abs(dy),
    );

    candidatos.push({
      lugar,
      x: mitadAncho + dx * escala,
      y: mitadAlto + dy * escala,
      angulo: (Math.atan2(dx, -dy) * 180) / Math.PI,
      lejania: Math.hypot(dx, dy),
    });
  }

  // Primero los más cercanos; si se pisan con uno ya puesto, quedan afuera.
  candidatos.sort((a, b) => a.lejania - b.lejania);
  const elegidos: Indicador[] = [];
  for (const candidato of candidatos) {
    const sePisa = elegidos.some(
      (otro) => Math.hypot(otro.x - candidato.x, otro.y - candidato.y) < SEPARACION_MINIMA,
    );
    if (!sePisa) {
      elegidos.push(candidato);
    }
  }
  return elegidos;
}

// Para el lector de pantalla: "al norte", "al sureste", etc.
function direccion(angulo: number): string {
  const nombres = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  const indice = Math.round((((angulo % 360) + 360) % 360) / 45) % 8;
  return nombres[indice];
}

export function IndicadoresFuera({ lugares, categorias, region, ancho, alto, onTocar }: Props) {
  const indicadores = calcularIndicadores(lugares, region, ancho, alto);

  return (
    // box-none: los toques que no caen en una flecha siguen llegando al mapa.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {indicadores.map(({ lugar, x, y, angulo }) => {
        const color =
          categorias.find((categoria) => categoria.id === lugar.categoriaId)?.color ??
          COLOR_SIN_CATEGORIA;
        return (
          <Pressable
            key={lugar.id}
            onPress={() => onTocar(lugar)}
            accessibilityRole="button"
            accessibilityLabel={`${lugar.nombre}, fuera del mapa, hacia el ${direccion(angulo)}`}
            accessibilityHint="Mueve el mapa hasta ese lugar"
            style={({ pressed }) => [
              estilos.indicador,
              { left: x - ANCHO_INDICADOR / 2, top: y - ALTO_INDICADOR / 2 },
              pressed && estilos.presionado,
            ]}
          >
            <View style={[estilos.circulo, { backgroundColor: color }]}>
              <Ionicons
                name="arrow-up"
                size={16}
                color={TEXTO_SOBRE_CATEGORIA}
                style={{ transform: [{ rotate: `${angulo}deg` }] }}
              />
            </View>
            <Text
              numberOfLines={1}
              // Etiqueta chica sobre el mapa: crece con la letra del teléfono,
              // pero con tope (igual que la barra de pestañas).
              maxFontSizeMultiplier={1.3}
              style={[estilos.nombre, { backgroundColor: color }]}
            >
              {lugar.nombre}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  indicador: {
    position: 'absolute',
    width: ANCHO_INDICADOR,
    height: ALTO_INDICADOR,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  circulo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    maxWidth: ANCHO_INDICADOR,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    color: TEXTO_SOBRE_CATEGORIA,
    // 12: igual que las etiquetas de la barra de pestañas.
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
  },
  presionado: {
    opacity: 0.6,
  },
});
