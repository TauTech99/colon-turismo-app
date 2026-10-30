// Dueño: B — Lugares y datos
// Chips de categoría. C lo reusa en el mapa.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  TEXTO_SOBRE_CATEGORIA,
  tipografia,
  useTema,
} from '@/compartido/tema';
import { IconoCategoria } from '@/lugares/componentes/IconoCategoria';
import type { Categoria } from '@/tipos/categoria';

type Props = {
  categorias: Categoria[];
  // null = "Todas" (sin filtro). C va a usar el mismo contrato en el mapa.
  seleccionada: string | null;
  onCambiar: (categoriaId: string | null) => void;
};

function nombreIcono(icono: string): IoniconsIconName {
  return icono as IoniconsIconName;
}

// Chips horizontales. Activo con color; inactivo sobre superficie neutra.

export function FiltroCategorias({ categorias, seleccionada, onCambiar }: Props) {
  const { colores } = useTema();
  const todasActiva = seleccionada === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.fila}
    >
      <Pressable
        onPress={() => onCambiar(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: todasActiva }}
        accessibilityLabel="Todas las categorías"
      >
        <View
          style={[
            estilos.chip,
            {
              backgroundColor: todasActiva ? colores.primario : colores.fondoElevado,
              borderColor: todasActiva ? colores.primario : colores.borde,
            },
          ]}
        >
          <Text
            style={[
              estilos.texto,
              { color: todasActiva ? colores.textoSobrePrimario : colores.textoSuave },
            ]}
          >
            Todas
          </Text>
        </View>
      </Pressable>

      {categorias.map((categoria) => {
        const activa = seleccionada === categoria.id;

        return (
          <Pressable
            key={categoria.id}
            onPress={() => onCambiar(activa ? null : categoria.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={categoria.nombre}
          >
            <View
              style={[
                estilos.chip,
                {
                  backgroundColor: activa ? categoria.color : colores.fondoElevado,
                  borderColor: activa ? categoria.color : colores.borde,
                },
              ]}
            >
              {/* Activo: el chip ya es del color, ícono blanco suelto.
                  Inactivo: ícono blanco en su círculo de color (se ve en oscuro). */}
              {activa ? (
                <Ionicons
                  name={nombreIcono(categoria.icono)}
                  size={17}
                  color={TEXTO_SOBRE_CATEGORIA}
                />
              ) : (
                <IconoCategoria icono={categoria.icono} color={categoria.color} tamano={22} />
              )}
              <Text
                style={[
                  estilos.texto,
                  { color: activa ? TEXTO_SOBRE_CATEGORIA : colores.textoSuave },
                ]}
              >
                {categoria.nombre}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fila: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  texto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
});
