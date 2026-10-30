// Dueño: C — Mapa y agenda
// Lista ordenada por distancia bajo el mapa.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { TEXTO_SOBRE_CATEGORIA, tipografia, useTema } from '@/compartido/tema';
import { IconoAccesible } from '@/lugares/componentes/IconoAccesible';
import { TextoEstado, textoEstadoCorto } from '@/lugares/componentes/TextoEstado';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas, Lugar } from '@/tipos/lugar';

type FilaCerca = {
  lugar: Lugar;
  metros: number | null;
};

type Props = {
  lugares: Lugar[];
  coordenadasUsuario: Coordenadas | null;
  onElegirLugar: (lugarId: string) => void;
  // Para el ícono y el color de cada tarjeta. Sin categorías, ícono genérico.
  categorias?: Categoria[];
  // Cuántas tarjetas mostrar. Sin límite, van todas.
  limite?: number;
};

const COLOR_SIN_CATEGORIA = '#64748B';

// Solo lugares activos. Hotel Plaza (activo: false) no entra:
// igual que en el mapa.
function lugaresActivos(lugares: Lugar[]): Lugar[] {
  return lugares.filter((lugar) => lugar.activo);
}

// Si hay GPS, se ordena de más cerca a más lejos.
// Si no hay (coordenadas null), la lista igual se arma, sin metros.
function armarFilas(lugares: Lugar[], coordenadasUsuario: Coordenadas | null): FilaCerca[] {
  const activos = lugaresActivos(lugares);

  if (!coordenadasUsuario) {
    return activos.map((lugar) => ({ lugar, metros: null }));
  }

  return activos
    .map((lugar) => ({
      lugar,
      metros: distanciaMetros(coordenadasUsuario, lugar.coordenadas),
    }))
    .sort((izquierda, derecha) => (izquierda.metros ?? 0) - (derecha.metros ?? 0));
}

// Bloque "Cerca tuyo" del wireframe §8.1. Solo dibuja.
// La pantalla le pasa los lugares (vienen de useLugares, no del mock).
export function ListaCercaTuyo({
  lugares,
  coordenadasUsuario,
  onElegirLugar,
  categorias = [],
  limite,
}: Props) {
  const { colores } = useTema();
  const todas = armarFilas(lugares, coordenadasUsuario);
  const filas = limite === undefined ? todas : todas.slice(0, limite);

  return (
    <View style={estilos.bloque}>
      <Text style={[estilos.titulo, { color: colores.textoSuave }]}>
        {coordenadasUsuario ? 'MÁS CERCANOS A VOS' : 'LUGARES PARA VISITAR'}
      </Text>

      {filas.length === 0 ? (
        <Text style={[estilos.vacio, { color: colores.textoSuave }]}>
          No hay lugares para mostrar.
        </Text>
      ) : (
        <View style={estilos.lista} accessibilityRole="list">
          {filas.map((fila) => {
            const distancia =
              fila.metros === null ? null : formatearDistancia(fila.metros);
            const categoria = categorias.find((item) => item.id === fila.lugar.categoriaId);
            const colorCategoria = categoria?.color ?? COLOR_SIN_CATEGORIA;
            const etiqueta = [
              fila.lugar.nombre,
              distancia,
              textoEstadoCorto(fila.lugar),
              fila.lugar.accesible ? 'Accesible' : null,
            ]
              .filter(Boolean)
              .join(', ');

            return (
              <Pressable
                key={fila.lugar.id}
                onPress={() => onElegirLugar(fila.lugar.id)}
                accessibilityRole="button"
                accessibilityLabel={etiqueta}
                style={({ pressed }) => [
                  estilos.tarjeta,
                  {
                    backgroundColor: colores.fondoElevado,
                    borderColor: colores.borde,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={[estilos.icono, { backgroundColor: colorCategoria }]}>
                  <Ionicons
                    name={(categoria?.icono ?? 'location-outline') as IoniconsIconName}
                    size={20}
                    color={TEXTO_SOBRE_CATEGORIA}
                  />
                </View>

                <View style={estilos.textos}>
                  <Text
                    style={[estilos.nombre, { color: colores.texto }]}
                    numberOfLines={2}
                  >
                    {fila.lugar.nombre}
                  </Text>
                  {distancia ? (
                    <View style={estilos.distancia}>
                      <Ionicons name="navigate" size={12} color={colores.peligro} />
                      <Text style={[estilos.metros, { color: colores.textoSuave }]}>
                        {distancia}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={estilos.derecha}>
                  {fila.lugar.accesible ? <IconoAccesible tamano={20} /> : null}
                  <TextoEstado lugar={fila.lugar} style={estilos.estado} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: 10,
  },
  titulo: {
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  lista: {
    gap: 10,
  },
  vacio: {
    fontSize: tipografia.cuerpo - 1,
    paddingVertical: 12,
  },
  tarjeta: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 3,
  },
  nombre: {
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
  },
  distancia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metros: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  // Accesible arriba, estado abajo (alineados a la derecha).
  derecha: {
    alignItems: 'flex-end',
    gap: 6,
  },
  estado: {
    fontSize: tipografia.cuerpo - 2,
  },
});
