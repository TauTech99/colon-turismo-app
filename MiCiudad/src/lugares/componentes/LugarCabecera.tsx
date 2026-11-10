// Dueño: B — Lugares y datos
// Foto, nombre, precio, accesible en el detalle.

import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { TEXTO_SOBRE_CATEGORIA, tipografia, useTema } from '@/compartido/tema';
import { IconoAccesible } from '@/lugares/componentes/IconoAccesible';
import { fuenteFoto } from '@/lugares/fotos';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';

type Props = {
  lugar: Lugar;
  categoria: Categoria | null;
  // La pantalla pasa <HorarioAbierto /> acá, para que quede debajo
  // de la categoría y arriba de la descripción (wireframe de Valeria).
  children?: ReactNode;
};

function textoPrecio(precio: number | null): string | null {
  if (precio === null) {
    return null;
  }
  if (precio === 0) {
    return 'Entrada gratis';
  }
  return `Entrada $ ${precio}`;
}

export function LugarCabecera({ lugar, categoria, children }: Props) {
  const { colores } = useTema();
  const { width } = useWindowDimensions();
  const precio = textoPrecio(lugar.precioEntrada);
  const colorMarca = categoria?.color ?? colores.primario;

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={lugar.imagenes.length > 1}
      >
        {lugar.imagenes.length === 0 ? (
          <View style={[estilos.foto, { width, backgroundColor: colorMarca }]} />
        ) : (
          lugar.imagenes.map((url) => {
            const fuente = fuenteFoto(url);
            if (!fuente) {
              return (
                <View
                  key={url}
                  style={[estilos.foto, { width, backgroundColor: colorMarca }]}
                  accessibilityRole="image"
                  accessibilityLabel={`Foto no disponible de ${lugar.nombre}`}
                />
              );
            }
            return (
              <Image
                key={url}
                source={fuente}
                style={[estilos.foto, { width }]}
                contentFit="cover"
                accessibilityLabel={`Foto de ${lugar.nombre}`}
              />
            );
          })
        )}
      </ScrollView>

      <View style={estilos.datos}>
        {/* El título de arriba es de una línea y corta los nombres largos con "…". */}
        <Text accessibilityRole="header" style={[estilos.nombre, { color: colores.texto }]}>
          {lugar.nombre}
        </Text>

        {/* Chip con texto blanco: el color de categoría como letra
            sobre fondo oscuro fallaba contraste (ej. museos #8E5A4A). */}
        <View style={[estilos.chipCategoria, { backgroundColor: colorMarca }]}>
          <Text style={estilos.textoChipCategoria}>
            {categoria?.nombre ?? 'Sin categoría'}
          </Text>
        </View>

        {children}

        {lugar.activo ? null : (
          <Text style={[estilos.aviso, { color: colores.peligro }]}>Dado de baja</Text>
        )}

        {precio ? <Text style={[estilos.dato, { color: colores.texto }]}>{precio}</Text> : null}

        {lugar.telefono ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${lugar.telefono}`)}
            accessibilityRole="link"
            accessibilityLabel={`Llamar al ${lugar.telefono}`}
          >
            <Text style={[estilos.dato, { color: colores.primario }]}>Tel. {lugar.telefono}</Text>
          </Pressable>
        ) : null}

        {lugar.sitioWeb ? (
          <Pressable
            onPress={() => Linking.openURL(lugar.sitioWeb ?? '')}
            accessibilityRole="link"
            accessibilityLabel={`Abrir sitio web de ${lugar.nombre}`}
          >
            <Text style={[estilos.dato, { color: colores.primario }]}>{lugar.sitioWeb}</Text>
          </Pressable>
        ) : null}

        <Text style={[estilos.dato, { color: colores.textoSuave }]}>{lugar.direccion}</Text>

        {lugar.accesible ? (
          <View style={estilos.filaAccesible}>
            <IconoAccesible />
            <Text style={[estilos.dato, { color: colores.texto }]}>Accesible</Text>
          </View>
        ) : null}

        <Text style={[estilos.descripcion, { color: colores.texto }]}>{lugar.descripcion}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: {
    height: 220,
  },
  datos: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  nombre: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  chipCategoria: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
  },
  textoChipCategoria: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
    color: TEXTO_SOBRE_CATEGORIA,
  },
  aviso: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  dato: {
    fontSize: tipografia.cuerpo,
  },
  filaAccesible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descripcion: {
    fontSize: tipografia.cuerpo,
    marginTop: 8,
  },
});
