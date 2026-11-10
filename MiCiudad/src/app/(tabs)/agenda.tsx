// Dueño: C — Mapa y agenda
// Eventos agrupados por día desde hoy (caché SQLite).

import { useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { EstadoVacio } from '@/compartido/componentes/EstadoVacio';
import {
  tipografia,
  useTema,
} from '@/compartido/tema';
import { TarjetaEvento } from '@/eventos/componentes/TarjetaEvento';
import { useEventos } from '@/eventos/useEventos';
import type { Evento } from '@/tipos/evento';

type FilaAgenda = {
  evento: Evento;
  claveDia: string;
};

type SeccionDia = {
  clave: string;
  titulo: string;
  data: FilaAgenda[];
};

// La pestaña no tiene encabezado automático: lo dibuja la pantalla
// ("Qué hacer / Agenda"), igual que Mapa, Mi recorrido y Yo, en todos los estados.
export default function PantallaAgenda() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();

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
        <Text style={[estilos.antetitulo, { color: colores.textoSobreEncabezado }]}>Qué hacer</Text>
        <Text
          accessibilityRole="header"
          style={[estilos.tituloEncabezado, { color: colores.textoSobreEncabezado }]}
        >
          Agenda
        </Text>
      </View>
      <View style={estilos.pantalla}>
        <ContenidoAgenda />
      </View>
    </View>
  );
}

function ContenidoAgenda() {
  const { colores } = useTema();
  const { dias, cargando, error, recargar } = useEventos();
  // Solo para el spinner nativo del gesto "tirar hacia abajo".
  const [refrescando, setRefrescando] = useState(false);

  // Mismo recargar que el botón Reintentar; el estado local solo mueve el spinner.
  async function alRefrescar() {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  }

  if (cargando && dias.length === 0) {
    return <EstadoCarga mensaje="Cargando agenda…" />;
  }

  if (error && dias.length === 0) {
    return <EstadoError mensaje={error} onReintentar={recargar} />;
  }

  const secciones: SeccionDia[] = dias.map((dia) => ({
    clave: dia.clave,
    titulo: dia.titulo,
    data: dia.eventos.map((evento) => ({ evento, claveDia: dia.clave })),
  }));

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
      <SectionList
        sections={secciones}
        keyExtractor={(fila) => `${fila.claveDia}-${fila.evento.id}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={estilos.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            colors={[colores.primario]}
            tintColor={colores.primario}
          />
        }
        ListHeaderComponent={
          <Text style={[estilos.subtitulo, { color: colores.textoSuave }]}>
            Eventos de Colón — ferias, peñas y actividades.
          </Text>
        }
        ListEmptyComponent={<EstadoVacio mensaje="No hay eventos desde hoy." />}
        renderSectionHeader={({ section }) => (
          <Text style={[estilos.dia, { color: colores.texto }]}>{section.titulo}</Text>
        )}
        renderItem={({ item }) => <TarjetaEvento evento={item.evento} />}
        SectionSeparatorComponent={() => <View style={estilos.separador} />}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  encabezado: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  antetitulo: {
    // Semi-negrita para leerse sobre el encabezado.
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '600',
    marginBottom: 1,
  },
  tituloEncabezado: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  subtitulo: {
    fontSize: tipografia.cuerpo,
    marginBottom: 4,
  },
  dia: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
    paddingTop: 8,
    paddingBottom: 4,
  },
  separador: {
    height: 8,
  },
});
