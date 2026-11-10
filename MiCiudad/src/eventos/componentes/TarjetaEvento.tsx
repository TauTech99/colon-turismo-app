import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorSuspendido, tipografia, useTema, type Colores } from '@/compartido/tema';
import { textoEstado, textoHora, textoPrecioEvento } from '@/eventos/useEventos';
import { fuenteFoto } from '@/lugares/fotos';
import type { EstadoEvento, Evento } from '@/tipos/evento';

const TAMANO_FOTO = 64;

type Props = {
  evento: Evento;
};

function colorEstado(estado: EstadoEvento, colores: Colores, oscuro: boolean): string {
  if (estado === 'cancelado') {
    return colores.peligro;
  }
  if (estado === 'suspendido') {
    return colorSuspendido(oscuro);
  }
  if (estado === 'finalizado') {
    return colores.textoSuave;
  }
  return colores.primario;
}

// Una fila de la agenda: foto o "Sin foto", título, hora, estado y precio.
// Suspendido y cancelado se leen distinto (palabra y color).
export function TarjetaEvento({ evento }: Props) {
  const { colores, oscuro } = useTema();
  const marca = colorEstado(evento.estado, colores, oscuro);
  const foto = evento.imagenUrl ? fuenteFoto(evento.imagenUrl) : null;

  return (
    <Link href={{ pathname: '/evento/[id]', params: { id: evento.id } }} asChild>
      <Pressable
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        accessibilityRole="button"
        accessibilityLabel={`${evento.titulo}. ${textoEstado(evento.estado)}`}
      >
        <View
          style={[
            estilos.tarjeta,
            {
              borderColor: colores.borde,
              borderLeftColor: marca,
              backgroundColor: colores.fondoElevado,
            },
          ]}
        >
          {foto ? (
            <Image
              source={foto}
              style={estilos.foto}
              contentFit="cover"
              accessibilityLabel={`Foto de ${evento.titulo}`}
            />
          ) : (
            <View
              style={[estilos.foto, estilos.sinFoto, { backgroundColor: colores.fondo }]}
              accessibilityRole="image"
              accessibilityLabel={`Sin foto de ${evento.titulo}`}
            >
              <Text style={[estilos.textoSinFoto, { color: colores.textoSuave }]}>Sin foto</Text>
            </View>
          )}
          <View style={estilos.textos}>
            <Text style={[estilos.titulo, { color: colores.texto }]}>{evento.titulo}</Text>
            <Text style={[estilos.meta, { color: colores.textoSuave }]}>
              {textoHora(evento.inicio)} · {textoPrecioEvento(evento.precio)}
            </Text>
            <Text style={[estilos.estado, { color: marca }]}>{textoEstado(evento.estado)}</Text>
          </View>
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
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
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
    paddingHorizontal: 4,
  },
  textoSinFoto: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '700',
    textAlign: 'center',
  },
  textos: {
    flex: 1,
    gap: 6,
  },
  titulo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  meta: {
    fontSize: tipografia.cuerpo,
  },
  estado: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
});
