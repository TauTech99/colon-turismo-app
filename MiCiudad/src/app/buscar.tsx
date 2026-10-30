// Dueño: B — Lugares y datos
// Buscar: tarjetas, chips de categoría, filtro por nombre.

import { useState } from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { EstadoVacio } from '@/compartido/componentes/EstadoVacio';
import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { tipografia, useTema } from '@/compartido/tema';
import { FiltroCategorias } from '@/lugares/componentes/FiltroCategorias';
import { TarjetaLugar } from '@/lugares/componentes/TarjetaLugar';
import { useCategorias } from '@/lugares/useCategorias';
import { useLugares } from '@/lugares/useLugares';
import { useUbicacion } from '@/mapa/useUbicacion';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas, Lugar } from '@/tipos/lugar';

function buscarCategoria(categorias: Categoria[], categoriaId: string): Categoria | null {
  return categorias.find((categoria) => categoria.id === categoriaId) ?? null;
}

type Orden = 'distancia' | 'az';

// Copia ordenada: no toca el array que devuelve useLugares.
function ordenarLugares(lugares: Lugar[], orden: Orden, coordenadas: Coordenadas | null): Lugar[] {
  if (orden === 'az') {
    return [...lugares].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  if (!coordenadas) {
    return lugares;
  }
  return [...lugares].sort(
    (a, b) =>
      distanciaMetros(coordenadas, a.coordenadas) - distanciaMetros(coordenadas, b.coordenadas),
  );
}

export default function PantallaBuscar() {
  const { colores } = useTema();
  // Fuera de las pestañas nadie reserva la barra de navegación de Android.
  const insets = useSafeAreaInsets();
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  // Solo para el spinner nativo del gesto "tirar hacia abajo".
  const [refrescando, setRefrescando] = useState(false);
  // GPS una sola vez para toda la lista (mismo hook que el mapa).
  const { coordenadas } = useUbicacion();
  const [orden, setOrden] = useState<Orden>('distancia');
  // Sección "dados de baja" plegada por defecto.
  const [verDeBaja, setVerDeBaja] = useState(false);

  const {
    lugares,
    cargando: cargandoLugares,
    error: errorLugares,
    recargar: recargarLugares,
  } = useLugares({ categoriaId, busqueda });

  const { categorias, recargar: recargarCategorias } = useCategorias();

  const hayFiltro = categoriaId !== null || busqueda.trim() !== '';
  // Sin GPS no hay distancia: se ordena A–Z.
  const ordenEfectivo: Orden = coordenadas ? orden : 'az';
  const ordenados = ordenarLugares(lugares, ordenEfectivo, coordenadas);
  // Los dados de baja van aparte, al final y plegados.
  const activos = ordenados.filter((lugar) => lugar.activo);
  const deBaja = ordenados.filter((lugar) => !lugar.activo);
  // Sin GPS no hay distancia para ordenar: ese botón no se muestra.
  const opcionesOrden: { valor: Orden; texto: string; icono?: 'navigate' }[] = coordenadas
    ? [
        { valor: 'distancia', texto: 'Distancia', icono: 'navigate' },
        { valor: 'az', texto: 'A–Z' },
      ]
    : [{ valor: 'az', texto: 'A–Z' }];

  async function recargar() {
    await Promise.all([recargarLugares(), recargarCategorias()]);
  }

  // Mismo recargar que el botón Reintentar; el estado local solo mueve el spinner.
  async function alRefrescar() {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  }

  // Si ya hay lista, no la sacamos al refrescar (el spinner queda en RefreshControl).
  if (cargandoLugares && lugares.length === 0) {
    return <EstadoCarga mensaje="Cargando lugares…" />;
  }

  if (errorLugares && lugares.length === 0) {
    return <EstadoError mensaje={errorLugares} onReintentar={recargar} />;
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
      <View style={estilos.encabezado}>
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre"
          placeholderTextColor={colores.textoSuave}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Buscar por nombre"
          style={[
            estilos.campo,
            {
              color: colores.texto,
              borderColor: colores.borde,
              backgroundColor: colores.fondo,
            },
          ]}
        />
        <FiltroCategorias
          categorias={categorias}
          seleccionada={categoriaId}
          onCambiar={setCategoriaId}
        />
        <View style={estilos.barraOrden}>
          <Text style={[estilos.contador, { color: colores.textoSuave }]}>
            {activos.length} {activos.length === 1 ? 'lugar' : 'lugares'}
          </Text>
          <View style={estilos.botonesOrden}>
            {opcionesOrden.map((opcion) => {
              const activo = ordenEfectivo === opcion.valor;
              return (
                <Pressable
                  key={opcion.valor}
                  onPress={() => setOrden(opcion.valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`Ordenar por ${opcion.texto}`}
                  style={[
                    estilos.botonOrden,
                    {
                      backgroundColor: activo ? colores.primario : colores.fondoElevado,
                      borderColor: activo ? colores.primario : colores.borde,
                    },
                  ]}
                >
                  {opcion.icono ? (
                    <Ionicons
                      name={opcion.icono}
                      size={12}
                      color={activo ? colores.textoSobrePrimario : colores.textoSuave}
                    />
                  ) : null}
                  <Text
                    style={[
                      estilos.textoOrden,
                      { color: activo ? colores.textoSobrePrimario : colores.textoSuave },
                    ]}
                  >
                    {opcion.texto}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <FlatList
        data={activos}
        keyExtractor={(lugar: Lugar) => lugar.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.lista, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            colors={[colores.primario]}
            tintColor={colores.primario}
          />
        }
        ListEmptyComponent={
          <EstadoVacio
            mensaje={
              hayFiltro ? 'No hay lugares que coincidan.' : 'No hay lugares para mostrar.'
            }
          />
        }
        ListFooterComponent={
          deBaja.length > 0 ? (
            <View style={estilos.deBaja}>
              <Pressable
                onPress={() => setVerDeBaja((antes) => !antes)}
                accessibilityRole="button"
                accessibilityState={{ expanded: verDeBaja }}
                style={estilos.deBajaBoton}
              >
                <Ionicons
                  name={verDeBaja ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colores.textoSuave}
                />
                <Text style={[estilos.deBajaTexto, { color: colores.textoSuave }]}>
                  {deBaja.length === 1
                    ? '1 lugar temporalmente dado de baja'
                    : `${deBaja.length} lugares temporalmente dados de baja`}
                </Text>
              </Pressable>
              {verDeBaja
                ? deBaja.map((lugar) => (
                    <TarjetaLugar
                      key={lugar.id}
                      lugar={lugar}
                      categoria={buscarCategoria(categorias, lugar.categoriaId)}
                    />
                  ))
                : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const distanciaTexto = coordenadas
            ? formatearDistancia(distanciaMetros(coordenadas, item.coordenadas))
            : null;
          return (
            <TarjetaLugar
              lugar={item}
              categoria={buscarCategoria(categorias, item.categoriaId)}
              distanciaTexto={distanciaTexto}
            />
          );
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  encabezado: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  deBaja: {
    gap: 12,
    marginTop: 4,
  },
  deBajaBoton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deBajaTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  barraOrden: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
  },
  contador: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  botonesOrden: {
    flexDirection: 'row',
    gap: 6,
  },
  botonOrden: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoOrden: {
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
  },
  campo: {
    marginHorizontal: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: tipografia.cuerpo,
  },
});
