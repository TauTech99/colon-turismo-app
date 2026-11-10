// Dueño: C — Mapa y agenda
// Mapa con pines de lugares activos + globito con metros.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';

import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { useTema } from '@/compartido/tema';
import { IndicadoresFuera } from '@/mapa/componentes/IndicadoresFuera';
import { PuntoUsuario } from '@/mapa/componentes/PuntoUsuario';
import { useBrujula } from '@/mapa/useBrujula';
import type { Categoria } from '@/tipos/categoria';
import type { Coordenadas, Lugar } from '@/tipos/lugar';

type Props = {
  lugares: Lugar[];
  categorias: Categoria[];
  mostrarUbicacion: boolean;
  coordenadasUsuario: Coordenadas | null;
  onElegirLugar: (lugarId: string) => void;
  // Cada vez que cambia (y hay GPS), el mapa vuelve a centrarse en el usuario.
  pedidoCentrar?: number;
  // Si viene, tocar un pin lo selecciona (la pantalla muestra su tarjeta)
  // en vez de abrir el globito nativo. null = tocaron el mapa vacío.
  onSeleccionarLugar?: (lugarId: string | null) => void;
};

// Qué parte del alto del mapa se corre el pin hacia arriba al
// seleccionarlo, para que la tarjeta de abajo no lo tape.
const CORRIMIENTO_PIN = 0.22;

const REGION_COLON = {
  latitude: -32.2215,
  longitude: -58.141,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const DELTA_CERCA = 0.04;

// Solo estética: Google Maps en tonos slate para el tema oscuro.
// Se esconden los POI de Google para que se lean nuestros pines.
const ESTILO_MAPA_OSCURO = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B3A6E' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#60A5FA' }] },
];

// En claro también se esconden los POI de Google, sin cambiar colores.
const ESTILO_MAPA_CLARO = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

function buscarCategoria(categorias: Categoria[], categoriaId: string): Categoria | null {
  return categorias.find((categoria) => categoria.id === categoriaId) ?? null;
}

function lugaresActivos(lugares: Lugar[]): Lugar[] {
  return lugares.filter((lugar) => lugar.activo);
}

export function MapaMarcadores({
  lugares,
  categorias,
  mostrarUbicacion,
  coordenadasUsuario,
  onElegirLugar,
  pedidoCentrar = 0,
  onSeleccionarLugar,
}: Props) {
  const visibles = lugaresActivos(lugares);
  const mapaRef = useRef<MapView>(null);
  // Última región visible: para mover el pin elegido sin cambiar el zoom.
  const regionRef = useRef<Region>(REGION_COLON);
  // Lo mismo, pero como estado: al terminar de mover el mapa se
  // recalculan las flechas de los lugares que quedaron fuera.
  const [region, setRegion] = useState<Region>(REGION_COLON);
  const [tamano, setTamano] = useState<{ ancho: number; alto: number } | null>(null);
  const yaCentro = useRef(false);
  const { rumbo } = useBrujula();
  const { oscuro } = useTema();
  // Parpadeo en el Marker (opacity nativa): Animated dentro del hijo no se ve en Android.
  const [encendido, setEncendido] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setEncendido((antes) => !antes);
    }, 420);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!coordenadasUsuario || yaCentro.current) {
      return;
    }
    yaCentro.current = true;
    mapaRef.current?.animateToRegion(
      {
        latitude: coordenadasUsuario.latitud,
        longitude: coordenadasUsuario.longitud,
        latitudeDelta: DELTA_CERCA,
        longitudeDelta: DELTA_CERCA,
      },
      600,
    );
  }, [coordenadasUsuario]);

  // Toque en "Vos estás acá": volver al punto del usuario.
  // Solo depende del pedido: si dependiera de las coordenadas,
  // cada update de GPS movería el mapa sin que el usuario lo pida.
  useEffect(() => {
    if (pedidoCentrar === 0 || !coordenadasUsuario) {
      return;
    }
    mapaRef.current?.animateToRegion(
      {
        latitude: coordenadasUsuario.latitud,
        longitude: coordenadasUsuario.longitud,
        latitudeDelta: DELTA_CERCA / 4,
        longitudeDelta: DELTA_CERCA / 4,
      },
      600,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoCentrar]);

  function seleccionar(lugar: Lugar) {
    if (!onSeleccionarLugar) {
      return;
    }
    onSeleccionarLugar(lugar.id);
    const { latitudeDelta, longitudeDelta } = regionRef.current;
    // Centro un poco más al sur que el pin: el pin queda arriba de la tarjeta.
    mapaRef.current?.animateToRegion(
      {
        latitude: lugar.coordenadas.latitud - latitudeDelta * CORRIMIENTO_PIN,
        longitude: lugar.coordenadas.longitud,
        latitudeDelta,
        longitudeDelta,
      },
      400,
    );
  }

  // Toque en una flecha del borde: ir hasta el lugar. Con tarjeta propia,
  // igual que tocar su marcador; si no, solo centrarlo.
  function irALugar(lugar: Lugar) {
    if (onSeleccionarLugar) {
      seleccionar(lugar);
      return;
    }
    const { latitudeDelta, longitudeDelta } = regionRef.current;
    mapaRef.current?.animateToRegion(
      {
        latitude: lugar.coordenadas.latitud,
        longitude: lugar.coordenadas.longitud,
        latitudeDelta,
        longitudeDelta,
      },
      400,
    );
  }

  function alTocarMapa(evento: MapPressEvent) {
    // En iOS tocar un pin también dispara onPress del mapa.
    const { action } = evento.nativeEvent as { action?: string };
    if (action === 'marker-press') {
      return;
    }
    onSeleccionarLugar?.(null);
  }

  return (
    <View
      style={estilos.mapa}
      onLayout={(evento) => {
        const { width, height } = evento.nativeEvent.layout;
        setTamano({ ancho: width, alto: height });
      }}
    >
      <MapView
        // En Android userInterfaceStyle solo se lee al crear el mapa:
        // si cambia el tema, se recrea (vuelve a la vista de Colón).
        key={oscuro ? 'oscuro' : 'claro'}
        ref={mapaRef}
        style={estilos.mapa}
        provider={PROVIDER_GOOGLE}
        initialRegion={REGION_COLON}
        customMapStyle={oscuro ? ESTILO_MAPA_OSCURO : ESTILO_MAPA_CLARO}
        // Sin esto Google sigue el modo oscuro del sistema, no el tema de la app.
        userInterfaceStyle={oscuro ? 'dark' : 'light'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        // Android centra solo al tocar un pin; lo movemos nosotros (seleccionar).
        moveOnMarkerPress={!onSeleccionarLugar}
        onRegionChangeComplete={(nueva) => {
          regionRef.current = nueva;
          setRegion(nueva);
        }}
        onPress={alTocarMapa}
        accessibilityLabel="Mapa de lugares de Colón"
      >
        {mostrarUbicacion && coordenadasUsuario ? (
          <Marker
            coordinate={{
              latitude: coordenadasUsuario.latitud,
              longitude: coordenadasUsuario.longitud,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Vos estás acá"
            opacity={encendido ? 1 : 0.4}
            tracksViewChanges
          >
            {/* La persona queda derecha: el rumbo gira solo la flecha de adentro. */}
            <PuntoUsuario encendido={encendido} rumbo={rumbo} />
          </Marker>
        ) : null}

        {visibles.map((lugar) => {
          const categoria = buscarCategoria(categorias, lugar.categoriaId);
          const metros = coordenadasUsuario
            ? formatearDistancia(distanciaMetros(coordenadasUsuario, lugar.coordenadas))
            : undefined;

          return (
            <Marker
              key={lugar.id}
              coordinate={{
                latitude: lugar.coordenadas.latitud,
                longitude: lugar.coordenadas.longitud,
              }}
              // Con tarjeta propia no hay globito nativo (sin title no aparece).
              title={onSeleccionarLugar ? undefined : lugar.nombre}
              description={onSeleccionarLugar ? undefined : metros}
              pinColor={categoria?.color}
              onPress={() => seleccionar(lugar)}
              onCalloutPress={() => onElegirLugar(lugar.id)}
              accessibilityLabel={lugar.nombre}
            />
          );
        })}
      </MapView>
      {tamano ? (
        <IndicadoresFuera
          lugares={visibles}
          categorias={categorias}
          region={region}
          ancho={tamano.ancho}
          alto={tamano.alto}
          onTocar={irALugar}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  mapa: {
    flex: 1,
    width: '100%',
  },
});
