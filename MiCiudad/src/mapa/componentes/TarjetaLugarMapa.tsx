// Dueño: C — Mapa y agenda
// Tarjeta que aparece sobre el mapa al tocar un pin.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { TEXTO_SOBRE_CATEGORIA, tipografia, useTema } from '@/compartido/tema';
import { IconoAccesible } from '@/lugares/componentes/IconoAccesible';
import { TextoEstado } from '@/lugares/componentes/TextoEstado';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas, Lugar } from '@/tipos/lugar';

type Props = {
  lugar: Lugar;
  categoria: Categoria | null;
  coordenadasUsuario: Coordenadas | null;
  onVerDetalle: () => void;
  onCerrar: () => void;
};

// Es una vista propia encima del mapa, no el Callout de react-native-maps:
// en Android el Callout se dibuja como imagen y sus botones no responden.
export function TarjetaLugarMapa({
  lugar,
  categoria,
  coordenadasUsuario,
  onVerDetalle,
  onCerrar,
}: Props) {
  const { colores } = useTema();
  const colorCategoria = categoria?.color ?? colores.primario;
  const distancia = coordenadasUsuario
    ? formatearDistancia(distanciaMetros(coordenadasUsuario, lugar.coordenadas))
    : null;
  const detalle = [distancia, lugar.direccion].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        estilos.tarjeta,
        { backgroundColor: colores.fondoElevado, borderColor: colores.borde },
      ]}
    >
      <View style={estilos.fila}>
        <View style={[estilos.icono, { backgroundColor: colorCategoria }]}>
          <Ionicons
            name={(categoria?.icono ?? 'location-outline') as IoniconsIconName}
            size={18}
            color={TEXTO_SOBRE_CATEGORIA}
          />
        </View>

        <View style={estilos.textos}>
          <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={2}>
            {lugar.nombre}
          </Text>
          {detalle ? (
            <View style={estilos.detalle}>
              {distancia ? <Ionicons name="navigate" size={11} color={colores.peligro} /> : null}
              <Text
                style={[estilos.detalleTexto, { color: colores.textoSuave }]}
                numberOfLines={1}
              >
                {detalle}
              </Text>
            </View>
          ) : null}
          <View style={estilos.detalle}>
            <TextoEstado lugar={lugar} style={estilos.estado} />
            {lugar.accesible ? (
              <>
                <IconoAccesible tamano={16} />
                <Text style={[estilos.detalleTexto, { color: colores.textoSuave }]}>
                  Accesible
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={onCerrar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={estilos.cerrar}
        >
          <Ionicons name="close" size={18} color={colores.textoSuave} />
        </Pressable>
      </View>

      <Pressable
        onPress={onVerDetalle}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${lugar.nombre}`}
        style={({ pressed }) => [
          estilos.boton,
          { backgroundColor: colores.primario, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[estilos.botonTexto, { color: colores.textoSobrePrimario }]}>
          Ver detalle
        </Text>
        <Ionicons name="arrow-forward" size={15} color={colores.textoSobrePrimario} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  detalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detalleTexto: {
    flexShrink: 1,
    fontSize: tipografia.cuerpo - 3,
  },
  estado: {
    fontSize: tipografia.cuerpo - 3,
    marginRight: 6,
  },
  cerrar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  botonTexto: {
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
  },
});
