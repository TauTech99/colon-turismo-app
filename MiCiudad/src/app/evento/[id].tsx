// Dueño: C — Mapa y agenda
// Detalle de evento + botón "Avisarme".

import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { BORDE_BOTON, colorSuspendido, tipografia, useTema, type Colores } from '@/compartido/tema';
import {
  textoDuracion,
  textoEstado,
  textoFechaLarga,
  textoHora,
  textoPrecioEvento,
  useEvento,
} from '@/eventos/useEventos';
import { BotonAvisarme } from '@/eventos/componentes/BotonAvisarme';
import { fuenteFoto } from '@/lugares/fotos';
import { useLugar } from '@/lugares/useLugar';
import { PuntoMapaAcciones } from '@/mapa/componentes/LugarMapaAcciones';
import type { EstadoEvento } from '@/tipos/evento';

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

// Si hay lugarId, se muestra el lugar del catálogo (hook de B).
// No se mira la dirección suelta.
function BloqueLugarDelCatalogo({ lugarId }: { lugarId: string }) {
  const { colores } = useTema();
  const { lugar, cargando } = useLugar(lugarId);
  const nombre = lugar?.nombre ?? (cargando ? 'Cargando el lugar…' : 'Lugar del catálogo');

  return (
    <View style={estilos.bloque}>
      <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>Dónde</Text>
      <Text style={[estilos.valor, { color: colores.texto }]}>{nombre}</Text>
      <Link href={{ pathname: '/lugar/[id]', params: { id: lugarId } }} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver el lugar ${nombre}`}
          style={StyleSheet.flatten([
            estilos.enlaceLugar,
            { borderColor: colores.primario, backgroundColor: colores.fondoElevado },
          ])}
        >
          <Text style={[estilos.textoEnlace, { color: colores.primario }]}>Ver este lugar</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export default function PantallaEvento() {
  const { colores, oscuro } = useTema();
  // Fuera de las pestañas nadie reserva la barra de navegación de Android.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { evento, cargando, error, recargar } = useEvento(id ?? '');

  if (cargando && !evento) {
    return (
      <>
        <Stack.Screen options={{ title: 'Evento' }} />
        <EstadoCarga mensaje="Cargando evento…" />
      </>
    );
  }

  if (error || !evento) {
    return (
      <>
        <Stack.Screen options={{ title: 'Evento' }} />
        <EstadoError mensaje={error ?? 'No existe ese evento.'} onReintentar={recargar} />
      </>
    );
  }

  const marca = colorEstado(evento.estado, colores, oscuro);
  const horaFin = evento.fin !== null ? textoHora(evento.fin) : null;
  const foto = evento.imagenUrl ? fuenteFoto(evento.imagenUrl) : null;

  return (
    <>
      <Stack.Screen options={{ title: evento.titulo }} />
      <ScrollView
        style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
        contentContainerStyle={[estilos.contenido, { paddingBottom: 32 + insets.bottom }]}
      >
        {foto ? (
          <Image
            source={foto}
            style={[estilos.foto, { width }]}
            contentFit="cover"
            accessibilityLabel={`Foto de ${evento.titulo}`}
          />
        ) : (
          <View
            style={[estilos.foto, estilos.sinFoto, { width, backgroundColor: colores.fondoElevado }]}
            accessibilityRole="image"
            accessibilityLabel={`Sin foto de ${evento.titulo}`}
          >
            <Text style={[estilos.textoSinFoto, { color: colores.textoSuave }]}>Sin foto</Text>
          </View>
        )}
        <View style={estilos.datos}>
          <Text style={[estilos.titulo, { color: colores.texto }]}>{evento.titulo}</Text>
          <Text style={[estilos.estado, { color: marca }]}>{textoEstado(evento.estado)}</Text>
          <Text style={[estilos.descripcion, { color: colores.texto }]}>{evento.descripcion}</Text>

          <View style={estilos.bloque}>
            <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>Cuándo</Text>
            <Text style={[estilos.valor, { color: colores.texto }]}>
              {textoFechaLarga(evento.inicio)} · {textoHora(evento.inicio)}
            </Text>
            {horaFin ? (
              <Text style={[estilos.valor, { color: colores.textoSuave }]}>Hasta las {horaFin}</Text>
            ) : null}
          </View>

          <View style={estilos.bloque}>
            <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>Cuánto dura</Text>
            <Text style={[estilos.valor, { color: colores.texto }]}>{textoDuracion(evento)}</Text>
          </View>

          {evento.lugarId ? (
            <BloqueLugarDelCatalogo lugarId={evento.lugarId} />
          ) : (
            <View style={estilos.bloque}>
              <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>Dónde</Text>
              <Text style={[estilos.valor, { color: colores.texto }]}>
                {evento.direccionLibre ?? 'Dirección no informada'}
              </Text>
            </View>
          )}

          <View style={estilos.bloque}>
            <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>Precio</Text>
            <Text style={[estilos.valor, { color: colores.texto }]}>
              {textoPrecioEvento(evento.precio)}
            </Text>
          </View>

          <BotonAvisarme evento={evento} />
        </View>
        {!evento.lugarId && evento.coordenadas ? (
          <PuntoMapaAcciones
            coordenadas={evento.coordenadas}
            nombre={evento.direccionLibre ?? evento.titulo}
          />
        ) : null}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    paddingBottom: 32,
  },
  foto: {
    height: 220,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSinFoto: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  datos: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  estado: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  descripcion: {
    fontSize: tipografia.cuerpo,
  },
  bloque: {
    gap: 4,
  },
  etiqueta: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  valor: {
    fontSize: tipografia.cuerpo,
  },
  enlaceLugar: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: BORDE_BOTON,
    borderRadius: 12,
  },
  textoEnlace: {
    fontSize: tipografia.boton,
    fontWeight: '700',
  },
});
