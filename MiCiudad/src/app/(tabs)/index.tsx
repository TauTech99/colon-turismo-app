// Dueño: C — Mapa y agenda
// Home: mapa con pines + lista "Cerca tuyo".
// Catálogo vía hooks de B; GPS y marcadores son de C.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BORDE_BOTON,
  BORDE_CAJA,
  tipografia,
  useTema,
} from '@/compartido/tema';
import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { EstadoVacio } from '@/compartido/componentes/EstadoVacio';
import { FiltroCategorias } from '@/lugares/componentes/FiltroCategorias';
import { useCategorias } from '@/lugares/useCategorias';
import { useLugares } from '@/lugares/useLugares';
import { ListaCercaTuyo } from '@/mapa/componentes/ListaCercaTuyo';
import { MapaMarcadores } from '@/mapa/componentes/MapaMarcadores';
import { TarjetaLugarMapa } from '@/mapa/componentes/TarjetaLugarMapa';
import { useUbicacion } from '@/mapa/useUbicacion';

export default function PantallaMapa() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  // Sube en cada toque de "Vos estás acá": el mapa se centra en el usuario.
  const [pedidoCentrar, setPedidoCentrar] = useState(0);
  // Pin tocado en el mapa: muestra su tarjeta encima.
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const { lugares, cargando, error, recargar } = useLugares({ categoriaId });
  const { categorias } = useCategorias();
  const { coordenadas, permiso } = useUbicacion();
  const { height } = useWindowDimensions();

  // Hay punto en el mapa solo si el GPS ya entregó coordenadas.
  // Permiso solo no alcanza (servicios apagados / GPS frío).
  const conPunto = permiso === 'concedido' && coordenadas !== null;

  // El mapa ocupa un tercio de la pantalla; el resto scrollea abajo.
  // Mínimo 240: en pantallas chicas la tarjeta del pin igual deja ver el mapa.
  const altoMapa = Math.max(240, Math.round(height * 0.32));
  const cantidadActivos = lugares.filter((lugar) => lugar.activo).length;

  // Req. 3 de la cátedra: carga / vacío / error a la vista, como en Buscar.
  // Solo si no hay nada para mostrar: con lugares guardados el mapa
  // se ve normal aunque no haya señal (useLugares lee primero SQLite).
  const estadoLista: 'carga' | 'error' | 'vacio' | 'listo' =
    cantidadActivos > 0 ? 'listo' : cargando ? 'carga' : error ? 'error' : 'vacio';

  // Si el filtro deja afuera al lugar elegido, la tarjeta desaparece sola.
  const seleccionado =
    lugares.find((lugar) => lugar.id === seleccionadoId && lugar.activo) ?? null;
  const categoriaSeleccionado = seleccionado
    ? categorias.find((categoria) => categoria.id === seleccionado.categoriaId) ?? null
    : null;

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
      <View
        style={[
          estilos.encabezado,
          {
            backgroundColor: colores.encabezado,
            borderBottomWidth: 1,
            borderBottomColor: colores.bordeEncabezado,
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
      >
        <View>
          <Text style={[estilos.antetitulo, { color: colores.textoSobreEncabezado }]}>
            Guía turística
          </Text>
          <Text style={[estilos.titulo, { color: colores.textoSobreEncabezado }]}>Colón</Text>
        </View>
        <Link href="/buscar" accessibilityLabel="Buscar lugares">
          <Ionicons name="search-outline" size={28} color={colores.textoSobreEncabezado} />
        </Link>
      </View>

      {/* El mapa queda fijo (fuera del ScrollView) para que arrastrarlo
          no pelee con el scroll de la lista. */}
      <View
        style={[
          estilos.mapaCaja,
          { height: altoMapa, borderColor: colores.borde, backgroundColor: colores.fondoElevado },
        ]}
      >
        <MapaMarcadores
          lugares={lugares}
          categorias={categorias}
          mostrarUbicacion={conPunto}
          coordenadasUsuario={coordenadas}
          onElegirLugar={(lugarId) => router.push(`/lugar/${lugarId}`)}
          pedidoCentrar={pedidoCentrar}
          onSeleccionarLugar={setSeleccionadoId}
        />

        {seleccionado ? (
          <View style={estilos.tarjetaFlotante}>
            <TarjetaLugarMapa
              lugar={seleccionado}
              categoria={categoriaSeleccionado}
              coordenadasUsuario={coordenadas}
              onVerDetalle={() => router.push(`/lugar/${seleccionado.id}`)}
              onCerrar={() => setSeleccionadoId(null)}
            />
          </View>
        ) : null}

        {conPunto && !seleccionado ? (
          <Pressable
            onPress={() => setPedidoCentrar((antes) => antes + 1)}
            accessibilityRole="button"
            accessibilityLabel="Vos estás acá. Centrar el mapa en tu ubicación"
            hitSlop={8}
            // Botón lleno del color principal: se destaca sobre el mapa.
            style={({ pressed }) => [
              estilos.aviso,
              estilos.avisoBoton,
              { backgroundColor: colores.primario, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="locate" size={14} color={colores.textoSobrePrimario} />
            <Text style={[estilos.avisoTexto, { color: colores.textoSobrePrimario }]}>
              Vos estás acá
            </Text>
          </Pressable>
        ) : null}

        {permiso === 'denegado' ? (
          <Text
            style={[
              estilos.aviso,
              estilos.avisoInfo,
              {
                color: colores.textoSuave,
                backgroundColor: colores.fondoElevado,
                borderColor: colores.textoSuave,
              },
            ]}
          >
            Sin ubicación — el mapa sigue
          </Text>
        ) : null}

        {permiso === 'concedido' && coordenadas === null ? (
          <Text
            style={[
              estilos.aviso,
              estilos.avisoInfo,
              {
                color: colores.textoSuave,
                backgroundColor: colores.fondoElevado,
                borderColor: colores.textoSuave,
              },
            ]}
          >
            Activá la ubicación del teléfono — el mapa sigue
          </Text>
        ) : null}
      </View>

      <View style={estilos.filtro}>
        <FiltroCategorias
          categorias={categorias}
          seleccionada={categoriaId}
          onCambiar={setCategoriaId}
        />
      </View>

      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>
        <View style={estilos.ciudad}>
          <Text style={[estilos.ciudadTitulo, { color: colores.texto }]}>
            Colón, Entre Ríos
          </Text>
          <Text style={[estilos.ciudadSubtitulo, { color: colores.primario }]}>
            Ciudad sobre el río Uruguay
            {estadoLista === 'listo'
              ? ` · ${cantidadActivos} ${cantidadActivos === 1 ? 'lugar turístico' : 'lugares turísticos'}`
              : ''}
          </Text>
        </View>

        {estadoLista === 'carga' ? <EstadoCarga mensaje="Cargando lugares…" /> : null}

        {estadoLista === 'error' && error ? (
          <EstadoError mensaje={error} onReintentar={() => void recargar()} />
        ) : null}

        {estadoLista === 'vacio' ? (
          <View style={estilos.vacio}>
            <EstadoVacio
              mensaje={
                categoriaId
                  ? 'No hay lugares de esta categoría para mostrar.'
                  : 'Todavía no hay lugares para mostrar.'
              }
            />
            {categoriaId ? (
              <Boton
                titulo="Ver todas las categorías"
                variante="secundario"
                onPress={() => setCategoriaId(null)}
              />
            ) : null}
          </View>
        ) : null}

        {estadoLista === 'listo' ? (
          <ListaCercaTuyo
            lugares={lugares}
            categorias={categorias}
            limite={3}
            coordenadasUsuario={coordenadas}
            onElegirLugar={(lugarId) => router.push(`/lugar/${lugarId}`)}
          />
        ) : null}

        {/* Con error o cargando, "Ver todos" llevaría al mismo problema. */}
        {estadoLista === 'listo' || estadoLista === 'vacio' ? (
          <Pressable
            onPress={() => router.push('/buscar')}
            accessibilityRole="button"
            accessibilityLabel="Ver todos los lugares"
            // Botón secundario (borde del color principal).
            style={({ pressed }) => [
              estilos.verTodos,
              {
                backgroundColor: colores.fondoElevado,
                borderColor: colores.primario,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[estilos.verTodosTexto, { color: colores.primario }]}>
              Ver todos los lugares
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colores.primario} />
          </Pressable>
        ) : null}

        {estadoLista === 'listo' ? (
          // Texto informativo: sin caja, para no confundirse con un botón.
          <View style={estilos.tip}>
            <View style={estilos.tipEncabezado}>
              <Ionicons name="bulb-outline" size={16} color={colores.primario} />
              <Text style={[estilos.tipTitulo, { color: colores.texto }]}>
                Cómo usar el mapa
              </Text>
            </View>
            <Text style={[estilos.tipTexto, { color: colores.textoSuave }]}>
              Tocá un marcador para ver el lugar, la distancia y si está abierto. Con
              “Ver detalle” entrás a su ficha. Las flechas del borde señalan lugares que
              quedaron fuera del mapa: tocalas para ir hasta ahí.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  antetitulo: {
    // Semi-negrita para leerse sobre el encabezado.
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '600',
    marginBottom: 1,
  },
  // Etiqueta flotante abajo a la DERECHA: a la izquierda va el logo de
  // Google, que las condiciones de uso piden dejar visible.
  aviso: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    maxWidth: '80%',
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tarjetaFlotante: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  avisoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  avisoInfo: {
    borderWidth: BORDE_CAJA,
  },
  avisoTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
  },
  // El ScrollView de B (FiltroCategorias) se estira en una columna flex
  // y se come el mapa. Este wrapper no crece: los chips quedan en una tira.
  filtro: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
  },
  mapaCaja: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 16,
  },
  ciudad: {
    gap: 2,
  },
  ciudadTitulo: {
    fontSize: tipografia.cuerpo + 2,
    fontWeight: '700',
  },
  ciudadSubtitulo: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  vacio: {
    gap: 4,
  },
  verTodos: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: BORDE_BOTON,
  },
  verTodosTexto: {
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
  },
  tip: {
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tipEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipTitulo: {
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
  },
  tipTexto: {
    fontSize: tipografia.cuerpo - 2,
    lineHeight: 19,
  },
});
