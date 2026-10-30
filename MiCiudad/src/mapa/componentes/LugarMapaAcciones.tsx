// Dueño: C — Mapa y agenda
// Cómo llegar + flecha. B lo importa en el detalle de lugar.
// El evento suelto (sin lugarId) usa el mismo bloque con sus coordenadas.

import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { tipografia, useTema } from '@/compartido/tema';
import { abrirComoLlegar } from '@/mapa/comoLlegar';
import { FlechaDireccion } from '@/mapa/componentes/FlechaDireccion';
import { anguloHaciaLugar, rotacionFlecha } from '@/mapa/rumbo';
import { useBrujula } from '@/mapa/useBrujula';
import { useUbicacion } from '@/mapa/useUbicacion';
import type { Coordenadas, Lugar } from '@/tipos/lugar';

type PuntoProps = {
  coordenadas: Coordenadas;
  nombre: string;
};

// Distancia + Cómo llegar + flecha. Va en el detalle (PRD §7.2 y §8.2).
// GPS, metros y magnetómetro viven acá.
export function PuntoMapaAcciones({ coordenadas: destino, nombre }: PuntoProps) {
  const { colores } = useTema();
  const { coordenadas } = useUbicacion();
  const { rumbo, estado } = useBrujula();

  const textoDistancia = coordenadas
    ? `A ${formatearDistancia(distanciaMetros(coordenadas, destino))} de donde estás`
    : 'Sin ubicación — no hay metros';

  let mensajeFlecha: string | null = null;
  if (!coordenadas) {
    mensajeFlecha = 'Sin ubicación — no hay flecha';
  } else if (estado === 'no') {
    mensajeFlecha = 'Sin brújula — no hay flecha';
  }

  const gradosFlecha =
    coordenadas !== null && rumbo !== null
      ? rotacionFlecha(anguloHaciaLugar(coordenadas, destino), rumbo)
      : null;

  return (
    <View style={estilos.bloque}>
      <Text
        style={[estilos.distancia, { color: colores.texto }]}
        accessibilityRole="text"
      >
        {textoDistancia}
      </Text>

      {gradosFlecha !== null ? (
        <FlechaDireccion grados={gradosFlecha} nombreLugar={nombre} />
      ) : mensajeFlecha !== null ? (
        <Text
          style={[estilos.avisoFlecha, { color: colores.textoSuave }]}
          accessibilityRole="text"
        >
          {mensajeFlecha}
        </Text>
      ) : null}

      {/* Secundarios: dos opciones de la misma acción. */}
      <Boton
        titulo="Cómo llegar a pie"
        variante="secundario"
        onPress={() => {
          void abrirComoLlegar(destino, 'pie');
        }}
      />
      <Boton
        titulo="Cómo llegar en auto"
        variante="secundario"
        onPress={() => {
          void abrirComoLlegar(destino, 'auto');
        }}
      />
    </View>
  );
}

type Props = {
  lugar: Lugar;
};

export function LugarMapaAcciones({ lugar }: Props) {
  return <PuntoMapaAcciones coordenadas={lugar.coordenadas} nombre={lugar.nombre} />;
}

const estilos = StyleSheet.create({
  bloque: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  distancia: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  avisoFlecha: {
    fontSize: tipografia.cuerpo,
  },
});
