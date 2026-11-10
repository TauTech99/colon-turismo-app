import { StyleSheet, View } from 'react-native';

import { COLOR_ACENTO } from '@/compartido/tema';

const VERDE_CABEZA = '#00E676';
const AMBAR_TURISTA = '#F59E0B';
const BLANCO = '#FFFFFF';
const CAMARA = '#0F172A';

type Props = {
  encendido?: boolean;
  // Grados desde el norte. null = sin brújula (no se dibuja la flecha).
  rumbo?: number | null;
};

// Solo Views sólidos (Ionicons dentro del Marker se ve fantasma en Android).
// Personita turista (sombrero, mochila y cámara) en un círculo con el
// acento. La persona queda derecha; lo que gira con la brújula es la
// flechita VERDE alrededor del círculo (= hacia dónde mirás).
// El parpadeo lo hace el Marker con opacity (MapaMarcadores).
export function PuntoUsuario({ encendido = true, rumbo = null }: Props) {
  return (
    <View
      style={[
        estilos.caja,
        { transform: [{ scale: encendido ? 1.12 : 0.94 }] },
      ]}
      accessibilityLabel="Tu ubicación y dirección"
    >
      {rumbo !== null ? (
        <View style={[estilos.giro, { transform: [{ rotate: `${rumbo}deg` }] }]}>
          <View style={estilos.flechaBorde} />
          <View style={estilos.flecha} />
        </View>
      ) : null}

      <View style={estilos.circulo}>
        <View style={estilos.figura}>
          <View style={estilos.mochila} />
          <View style={estilos.cuerpo} />
          <View style={estilos.camara} />
          <View style={estilos.cabeza} />
          <View style={estilos.sombreroCopa} />
          <View style={estilos.sombreroAla} />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ocupa toda la caja y rota: la flecha queda en el borde del círculo.
  giro: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    alignItems: 'center',
  },
  flechaBorde: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BLANCO,
  },
  flecha: {
    position: 'absolute',
    top: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: VERDE_CABEZA,
  },
  circulo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: BLANCO,
    backgroundColor: COLOR_ACENTO,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Lienzo de la personita: 22 x 26. Lo que va más abajo en el JSX
  // se dibuja encima (el ala del sombrero tapa la cabeza).
  figura: {
    width: 22,
    height: 26,
    marginTop: 4,
  },
  mochila: {
    position: 'absolute',
    top: 15,
    left: 1,
    width: 7,
    height: 9,
    borderRadius: 2,
    backgroundColor: AMBAR_TURISTA,
  },
  cuerpo: {
    position: 'absolute',
    top: 16,
    left: 4,
    width: 14,
    height: 10,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: BLANCO,
  },
  camara: {
    position: 'absolute',
    top: 19,
    left: 9,
    width: 6,
    height: 4,
    borderRadius: 1,
    backgroundColor: CAMARA,
  },
  cabeza: {
    position: 'absolute',
    top: 5,
    left: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLANCO,
  },
  sombreroCopa: {
    position: 'absolute',
    top: 0,
    left: 7,
    width: 8,
    height: 5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: AMBAR_TURISTA,
  },
  sombreroAla: {
    position: 'absolute',
    top: 4,
    left: 2,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: AMBAR_TURISTA,
  },
});
