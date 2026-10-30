import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  TEXTO_SOBRE_CATEGORIA,
  tipografia,
  useTema,
} from '@/compartido/tema';
import { IconoAccesible } from '@/lugares/componentes/IconoAccesible';
import { IconoCategoria } from '@/lugares/componentes/IconoCategoria';
import { TextoEstado, textoEstadoCorto } from '@/lugares/componentes/TextoEstado';
import { fuenteFoto } from '@/lugares/fotos';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';

type Props = {
  lugar: Lugar;
  categoria: Categoria | null;
  // Texto ya formateado ("900 m" / "1,2 km"). null = sin GPS.
  distanciaTexto?: string | null;
};

const TAMANO_FOTO = 64;

// Una fila del listado: foto, nombre, categoría, estado y distancia (PRD §7.1).
export function TarjetaLugar({ lugar, categoria, distanciaTexto = null }: Props) {
  const { colores } = useTema();
  const colorMarca = categoria?.color ?? colores.primario;
  const foto = lugar.imagenes[0] ? fuenteFoto(lugar.imagenes[0]) : null;

  const etiqueta = [
    lugar.nombre,
    categoria?.nombre,
    lugar.activo ? textoEstadoCorto(lugar) : 'Dado de baja',
    distanciaTexto,
    lugar.accesible ? 'Accesible' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Link href={{ pathname: '/lugar/[id]', params: { id: lugar.id } }} asChild>
      <Pressable
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
      >
        <View
          style={[
            estilos.tarjeta,
            { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
          ]}
        >
          {/* Dado de baja: solo la foto se apaga; los textos y la etiqueta
              roja quedan con contraste completo para leerse. */}
          {foto ? (
            <Image
              source={foto}
              style={[estilos.foto, lugar.activo ? null : estilos.apagada]}
              contentFit="cover"
            />
          ) : (
            // Sin foto: el color de la categoría con su ícono.
            <View
              style={[
                estilos.foto,
                estilos.sinFoto,
                { backgroundColor: colorMarca },
                lugar.activo ? null : estilos.apagada,
              ]}
            >
              <Ionicons
                name={(categoria?.icono ?? 'location-outline') as IoniconsIconName}
                size={26}
                color={TEXTO_SOBRE_CATEGORIA}
              />
            </View>
          )}

          <View style={estilos.textos}>
            <View style={estilos.filaNombre}>
              <Text style={[estilos.nombre, { color: colores.texto }]} numberOfLines={2}>
                {lugar.nombre}
              </Text>
              {lugar.activo ? null : (
                <Text
                  textBreakStrategy="simple"
                  style={[
                    estilos.etiquetaBaja,
                    { color: colores.peligro, backgroundColor: colores.fondo },
                  ]}
                >
                  Dado de baja
                </Text>
              )}
            </View>

            {/* PRD §7.1: la descripción corta es la del listado (la larga, la ficha). */}
            <Text style={[estilos.meta, { color: colores.textoSuave }]} numberOfLines={2}>
              {lugar.descripcionCorta}
            </Text>

            {lugar.activo ? (
              <>
                <View style={estilos.fila}>
                  {categoria ? (
                    <IconoCategoria icono={categoria.icono} color={colorMarca} tamano={20} />
                  ) : null}
                  <Text
                    style={[estilos.meta, { color: colores.textoSuave }]}
                    numberOfLines={1}
                  >
                    {categoria?.nombre ?? 'Sin categoría'}
                  </Text>
                </View>

                <View style={estilos.fila}>
                  <TextoEstado lugar={lugar} style={estilos.meta} />
                  {distanciaTexto ? (
                    <Text style={[estilos.meta, { color: colores.textoSuave }]}>
                      · {distanciaTexto}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>

          {lugar.accesible ? (
            <View style={estilos.accesible}>
              <IconoAccesible />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 14,
    elevation: 1,
  },
  foto: {
    width: TAMANO_FOTO,
    height: TAMANO_FOTO,
    borderRadius: 10,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 3,
  },
  nombre: {
    flexShrink: 1,
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    flexShrink: 1,
    fontSize: tipografia.cuerpo - 2,
  },
  // Dado de baja: la foto (o el color de la categoría) se ve apagada.
  apagada: {
    opacity: 0.45,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  etiquetaBaja: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Ícono de accesible en la esquina superior derecha de la tarjeta.
  accesible: {
    alignSelf: 'flex-start',
  },
});
