// Dueño: D — Recorrido y audioguías
// Lista visual: foto, nota, origen, nube si pendiente de sync.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TEXTO_SOBRE_CATEGORIA, tipografia, useTema } from '@/compartido/tema';
import { fotoSoloEnOtroTelefono, sePuedeMostrarFoto } from '@/recorrido/fotos';
import type { Categoria } from '@/tipos/categoria';
import type { OrigenVisita, Visita } from '@/tipos/visita';

type Props = {
  // Visitas ya leídas de SQLite (orden: más nueva primero).
  visitas: Visita[];
  // nombre del lugar por id (viene del catálogo local de B).
  nombresPorLugarId: Record<string, string>;
  // Categoría por id de lugar: ícono y color del punto de la línea.
  categoriaPorLugarId?: Record<string, Categoria>;
  // Lo que va arriba de la lista (aviso sin señal, botón, contador).
  encabezado?: ReactElement;
  // Espacio extra abajo (barra del sistema).
  espacioInferior?: number;
  // Tocar una tarjeta: abre el detalle de la visita.
  onAbrirVisita?: (visita: Visita) => void;
};

// Lista de Mi recorrido. Muestra lugar, foto local, nota,
// fecha, origen e ícono si todavía no se subió (sincronizada: false).
// No llama a la cola ni al servicio: solo dibuja lo que ya está guardado.

const ORIGENES: Record<OrigenVisita, { texto: string; icono: IoniconsIconName }> = {
  qr: { texto: 'QR', icono: 'qr-code-outline' },
  gps: { texto: 'GPS', icono: 'location-outline' },
  manual: { texto: 'Manual', icono: 'hand-left-outline' },
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const COLOR_SIN_CATEGORIA = '#64748B';
const TAMANO_PUNTO = 32;

// fechaHora es ISO con zona (ej. 2026-11-13T16:42:00-03:00) → "13 nov · 16:42".
// Meses a mano: no dependemos de que el teléfono traiga los nombres en español.
function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${hora}:${minutos}`;
}

function ItemVisita({
  visita,
  nombreLugar,
  categoria,
  esPrimera,
  esUltima,
  onAbrir,
}: {
  visita: Visita;
  nombreLugar: string;
  categoria: Categoria | null;
  esPrimera: boolean;
  esUltima: boolean;
  onAbrir?: () => void;
}) {
  const { colores } = useTema();
  const pendiente = !visita.sincronizada;
  const origen = ORIGENES[visita.origen];
  const colorMarca = categoria?.color ?? COLOR_SIN_CATEGORIA;
  const fotoVisible = sePuedeMostrarFoto(visita.fotoUri);
  const fotoEnOtroTelefono = fotoSoloEnOtroTelefono(visita.fotoUri);

  return (
    <Pressable
      onPress={onAbrir}
      disabled={!onAbrir}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
      accessibilityRole={onAbrir ? 'button' : undefined}
      accessibilityLabel={`${nombreLugar}. ${formatearFecha(visita.fechaHora)}. Origen ${origen.texto}${pendiente ? '. Pendiente de subir' : ''}`}
      accessibilityHint={onAbrir ? 'Abre el detalle de la visita' : undefined}
    >
      {/* Columna de la línea de tiempo: tramo arriba, punto, tramo abajo. */}
      <View style={estilos.linea}>
        <View
          style={[
            estilos.tramo,
            estilos.tramoArriba,
            { backgroundColor: esPrimera ? 'transparent' : colores.borde },
          ]}
        />
        <View style={[estilos.punto, { backgroundColor: colorMarca, borderColor: colores.fondo }]}>
          <Ionicons
            name={(categoria?.icono ?? 'location-outline') as IoniconsIconName}
            size={16}
            color={TEXTO_SOBRE_CATEGORIA}
          />
        </View>
        <View
          style={[
            estilos.tramo,
            { flex: 1, backgroundColor: esUltima ? 'transparent' : colores.borde },
          ]}
        />
      </View>

      <View
        style={[
          estilos.tarjeta,
          { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
        ]}
      >
        {fotoVisible ? (
          // Fondo de la categoría por si el archivo local ya no existe.
          <View style={[estilos.foto, { backgroundColor: colorMarca }]}>
            <Image
              source={{ uri: visita.fotoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={`Foto de la visita a ${nombreLugar}`}
            />
          </View>
        ) : null}

        <View style={estilos.cuerpo}>
          <View style={estilos.cabecera}>
            <Text style={[estilos.nombre, { color: colores.texto }]}>{nombreLugar}</Text>
            {pendiente ? (
              <View style={[estilos.pendiente, { backgroundColor: colores.avisoFondo }]}>
                <Ionicons name="hourglass-outline" size={12} color={colores.avisoTexto} />
                <Text style={[estilos.pendienteTexto, { color: colores.avisoTexto }]}>
                  Pendiente
                </Text>
              </View>
            ) : null}
          </View>

          <View style={estilos.meta}>
            <Text style={[estilos.fecha, { color: colores.primario }]}>
              {formatearFecha(visita.fechaHora)}
            </Text>
            <View style={[estilos.origen, { borderColor: colores.borde }]}>
              <Ionicons name={origen.icono} size={12} color={colores.textoSuave} />
              <Text style={[estilos.origenTexto, { color: colores.textoSuave }]}>
                {origen.texto}
              </Text>
            </View>
            {fotoEnOtroTelefono ? (
              <View style={[estilos.origen, { borderColor: colores.borde }]}>
                <Ionicons name="phone-portrait-outline" size={12} color={colores.textoSuave} />
                <Text style={[estilos.origenTexto, { color: colores.textoSuave }]}>
                  Foto en otro teléfono
                </Text>
              </View>
            ) : null}
          </View>

          {visita.nota ? (
            <Text style={[estilos.nota, { color: colores.textoSuave }]}>
              “{visita.nota}”
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function TimelineVisitas({
  visitas,
  nombresPorLugarId,
  categoriaPorLugarId = {},
  encabezado,
  espacioInferior = 0,
  onAbrirVisita,
}: Props) {
  const { colores } = useTema();

  return (
    <FlatList
      data={visitas}
      keyExtractor={(visita) => visita.id}
      style={[estilos.lista, { backgroundColor: colores.fondo }]}
      contentContainerStyle={[estilos.contenido, { paddingBottom: 32 + espacioInferior }]}
      ListHeaderComponent={encabezado}
      ListHeaderComponentStyle={estilos.encabezado}
      renderItem={({ item, index }) => (
        <ItemVisita
          visita={item}
          nombreLugar={nombresPorLugarId[item.lugarId] ?? 'Lugar desconocido'}
          categoria={categoriaPorLugarId[item.lugarId] ?? null}
          esPrimera={index === 0}
          esUltima={index === visitas.length - 1}
          onAbrir={onAbrirVisita ? () => onAbrirVisita(item) : undefined}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
  },
  contenido: {
    padding: 16,
  },
  encabezado: {
    marginBottom: 12,
  },
  fila: {
    flexDirection: 'row',
    gap: 10,
  },
  presionada: {
    opacity: 0.7,
  },
  linea: {
    width: TAMANO_PUNTO,
    alignItems: 'center',
  },
  tramo: {
    width: 2,
  },
  // Alinea el punto con la parte de arriba de la tarjeta.
  tramoArriba: {
    height: 14,
  },
  punto: {
    width: TAMANO_PUNTO,
    height: TAMANO_PUNTO,
    borderRadius: TAMANO_PUNTO / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjeta: {
    flex: 1,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  foto: {
    width: '100%',
    height: 150,
  },
  cuerpo: {
    gap: 6,
    padding: 12,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nombre: {
    flex: 1,
    fontSize: tipografia.cuerpo + 1,
    fontWeight: '700',
  },
  pendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pendienteTexto: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '700',
    paddingRight: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  fecha: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  origen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  origenTexto: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '600',
  },
  nota: {
    fontSize: tipografia.cuerpo - 1,
    fontStyle: 'italic',
  },
});
