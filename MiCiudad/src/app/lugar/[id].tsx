// Dueño: B — Lugares y datos
// Detalle de lugar. Compone piezas de A/C/D (una línea cada una).
// No editar BotonFavorito / LugarMapaAcciones / ReproductorAudio / BotonRegistrarVisita acá.

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReproductorAudio } from '@/audioguias/componentes/ReproductorAudio';
import { SinAudioguia } from '@/audioguias/componentes/SinAudioguia';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { useTema } from '@/compartido/tema';
import { BotonFavorito } from '@/cuenta/componentes/BotonFavorito';
import { AvisoQrLugar } from '@/lugares/componentes/AvisoQrLugar';
import { HorarioAbierto } from '@/lugares/componentes/HorarioAbierto';
import { LugarCabecera } from '@/lugares/componentes/LugarCabecera';
import { useCategorias } from '@/lugares/useCategorias';
import { useLugar } from '@/lugares/useLugar';
import { LugarMapaAcciones } from '@/mapa/componentes/LugarMapaAcciones';
import { BotonRegistrarVisita } from '@/recorrido/componentes/BotonRegistrarVisita';
import type { Categoria } from '@/tipos/categoria';

function buscarCategoria(categorias: Categoria[], categoriaId: string): Categoria | null {
  return categorias.find((categoria) => categoria.id === categoriaId) ?? null;
}

export default function PantallaLugar() {
  const { colores } = useTema();
  // Fuera de las pestañas nadie reserva la barra de navegación de Android.
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { lugar, cargando, error, recargar } = useLugar(id ?? '');
  const { categorias } = useCategorias();

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Lugar' }} />
        <EstadoCarga mensaje="Cargando lugar…" />
      </>
    );
  }

  if (error || !lugar) {
    return (
      <>
        <Stack.Screen options={{ title: 'Lugar' }} />
        <EstadoError mensaje={error ?? 'No existe ese lugar.'} onReintentar={recargar} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: lugar.nombre }} />
      <ScrollView
        style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
        contentContainerStyle={[estilos.contenido, { paddingBottom: 32 + insets.bottom }]}
      >
        <LugarCabecera
          lugar={lugar}
          categoria={buscarCategoria(categorias, lugar.categoriaId)}
        >
          <HorarioAbierto lugar={lugar} />
        </LugarCabecera>
        {lugar.audioguia ? (
          <ReproductorAudio
            key={lugar.id}
            audioguia={lugar.audioguia}
            titulo={lugar.nombre}
          />
        ) : (
          <SinAudioguia />
        )}
        <BotonFavorito lugarId={lugar.id} />
        <AvisoQrLugar codigoQr={lugar.codigoQr} />
        <BotonRegistrarVisita lugarId={lugar.id} coordenadasLugar={lugar.coordenadas} />
        <LugarMapaAcciones lugar={lugar} />
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
});
