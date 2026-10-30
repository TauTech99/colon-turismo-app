// Dueño: D — Recorrido y audioguías
// Detalle de una visita de Mi recorrido: foto, cuándo, cómo, nota y estado de subida.

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { TEXTO_SOBRE_CATEGORIA, tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { leerCategorias, leerLugarPorId } from '@/lugares/lugaresDb';
import { sincronizarPendientes } from '@/recorrido/colaVisitas';
import {
  borrarFotoVisita,
  fotoSoloEnOtroTelefono,
  guardarFotoVisita,
  sePuedeMostrarFoto,
} from '@/recorrido/fotos';
import { actualizarFotoVisita, obtenerVisitaPorId } from '@/recorrido/visitasDb';
import type { Categoria } from '@/tipos/categoria';
import type { Lugar } from '@/tipos/lugar';
import type { OrigenVisita, Visita } from '@/tipos/visita';

// Se abre al tocar una tarjeta de Mi recorrido.
// Lee SQLite: anda sin señal. Agregar, cambiar o quitar la foto también:
// la visita vuelve a la cola y se sube cuando hay red.

const ALTO_PORTADA = 260;
const COLOR_SIN_CATEGORIA = '#64748B';

const ORIGENES: Record<OrigenVisita, { texto: string; icono: IoniconsIconName }> = {
  qr: { texto: 'Código QR', icono: 'qr-code-outline' },
  gps: { texto: 'GPS — estabas cerca', icono: 'location-outline' },
  manual: { texto: 'Cargado a mano', icono: 'hand-left-outline' },
};

// Nombres a mano, igual que TimelineVisitas: no dependemos del idioma del teléfono.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "martes 14 de septiembre" y "07:15".
function partesFecha(iso: string): { dia: string; hora: string } {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return { dia: iso, hora: '' };
  }
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  return {
    dia: `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`,
    hora,
  };
}

export default function PantallaVisita() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [visita, setVisita] = useState<Visita | null>(null);
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sube con "Reintentar": vuelve a correr el efecto de carga.
  const [intento, setIntento] = useState(0);

  // Lee visita + lugar + categoría. Los setState van después de los await
  // (mismo patrón que useLugar). vivo evita escribir si ya se salió.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const encontrada = await (id ? obtenerVisitaPorId(id) : Promise.resolve(null));
        if (!encontrada) {
          if (vivo) {
            setError('No encontramos esa visita en el teléfono.');
          }
          return;
        }
        const lugarVisita = await leerLugarPorId(encontrada.lugarId);
        const categorias = await leerCategorias();
        if (!vivo) {
          return;
        }
        setVisita(encontrada);
        setLugar(lugarVisita);
        setCategoria(categorias.find((item) => item.id === lugarVisita?.categoriaId) ?? null);
      } catch (err) {
        console.error('[visita] No se pudo leer la visita', err);
        if (vivo) {
          setError('No se pudo abrir la visita. Probá de nuevo.');
        }
      } finally {
        if (vivo) {
          setCargando(false);
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, intento]);

  function reintentar() {
    setCargando(true);
    setError(null);
    setIntento((n) => n + 1);
  }

  const [cambiandoFoto, setCambiandoFoto] = useState(false);

  // uriTemporal = foto nueva de cámara/galería; null = quitar la foto.
  // Primero se espera a la cola: si justo estaba subiendo esta visita
  // con la foto vieja, al terminar la marcaría subida y se perdería el cambio.
  async function reemplazarFoto(uriTemporal: string | null) {
    if (!visita || cambiandoFoto) {
      return;
    }
    const anterior = visita.fotoUri;
    setCambiandoFoto(true);
    try {
      await sincronizarPendientes(usuario?.id);
      const nueva = uriTemporal
        ? await guardarFotoVisita(uriTemporal, `${visita.id}-${Date.now()}`)
        : null;
      await actualizarFotoVisita(visita.id, nueva);
      setVisita({ ...visita, fotoUri: nueva, sincronizada: false });
      if (anterior) {
        try {
          borrarFotoVisita(anterior);
        } catch (err) {
          // La fila ya no la usa: un archivo que quedó no rompe nada.
          console.error('[visita] No se pudo borrar el archivo de la foto', err);
        }
      }
      // Con red, sube la visita actualizada; sin red queda pendiente.
      void sincronizarPendientes(usuario?.id);
    } catch (err) {
      console.error('[visita] No se pudo cambiar la foto', err);
      Alert.alert('No se pudo guardar el cambio', 'Probá de nuevo en un momento.');
    } finally {
      setCambiandoFoto(false);
    }
  }

  // Mismos permisos y mensajes que SelectorFoto (visita/nueva).
  async function sacarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      const sinPedidoNativo = permiso.canAskAgain === false;
      Alert.alert(
        'Sin cámara',
        'No diste permiso para usar la cámara. Podés elegir una de la galería.',
        sinPedidoNativo
          ? [
              { text: 'OK', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
            ]
          : [{ text: 'OK' }],
      );
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      await reemplazarFoto(resultado.assets[0].uri);
    }
  }

  async function elegirDeGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin galería', 'No diste permiso para ver tus fotos. Podés sacar una con la cámara.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: false,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      await reemplazarFoto(resultado.assets[0].uri);
    }
  }

  function elegirFotoNueva() {
    const tieneFoto = sePuedeMostrarFoto(visita?.fotoUri ?? null);
    Alert.alert(tieneFoto ? 'Cambiar foto' : 'Agregar foto', '¿De dónde sacás la foto?', [
      { text: 'Cámara', onPress: () => void sacarFoto() },
      { text: 'Galería', onPress: () => void elegirDeGaleria() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function confirmarQuitarFoto() {
    Alert.alert(
      '¿Quitar la foto?',
      'La visita queda guardada con su fecha y tu nota. La foto no se puede recuperar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar foto', style: 'destructive', onPress: () => void reemplazarFoto(null) },
      ],
    );
  }

  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/recorrido');
    }
  }

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Visita' }} />
        <EstadoCarga mensaje="Abriendo tu visita…" />
      </>
    );
  }

  if (error || !visita) {
    return (
      <>
        <Stack.Screen options={{ title: 'Visita' }} />
        <EstadoError mensaje={error ?? 'No encontramos esa visita.'} onReintentar={reintentar} />
      </>
    );
  }

  const colorCategoria = categoria?.color ?? COLOR_SIN_CATEGORIA;
  const origen = ORIGENES[visita.origen];
  const { dia, hora } = partesFecha(visita.fechaHora);
  const pendiente = !visita.sincronizada;
  const nombreLugar = lugar?.nombre ?? 'Lugar visitado';
  const fotoVisible = sePuedeMostrarFoto(visita.fotoUri);
  const fotoEnOtroTelefono = fotoSoloEnOtroTelefono(visita.fotoUri);

  return (
    <>
      {/* La portada hace de encabezado: tiene su propio botón Volver. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
      >
        <View style={[estilos.portada, { backgroundColor: colorCategoria }]}>
          {fotoVisible ? (
            <Image
              source={{ uri: visita.fotoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={`Tu foto en ${nombreLugar}`}
            />
          ) : (
            <View style={estilos.sinFoto}>
              <Ionicons
                name={(categoria?.icono ?? 'location-outline') as IoniconsIconName}
                size={72}
                color={TEXTO_SOBRE_CATEGORIA}
              />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(15,23,42,0.92)']}
            style={StyleSheet.absoluteFill}
          />

          <Pressable
            onPress={volver}
            accessibilityRole="button"
            accessibilityLabel="Volver a Mi recorrido"
            hitSlop={8}
            style={[estilos.volver, { top: Math.max(insets.top, 12) }]}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={estilos.volverTexto}>Volver</Text>
          </Pressable>

          <View style={estilos.tituloPortada}>
            <Text style={estilos.categoria}>{categoria?.nombre ?? 'Lugar'}</Text>
            <Text accessibilityRole="header" style={estilos.nombre}>
              {nombreLugar}
            </Text>
          </View>
        </View>

        <View style={[estilos.contenido, { backgroundColor: colores.fondo }]}>
          <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
            <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>TU VISITA</Text>

            <View style={estilos.dato}>
              <Text style={[estilos.datoNombre, { color: colores.textoSuave }]}>Cuándo</Text>
              <View style={estilos.datoValor}>
                <Text style={[estilos.valorFuerte, { color: colores.texto }]}>{dia}</Text>
                <Text style={[estilos.valorSuave, { color: colores.textoSuave }]}>{hora}</Text>
              </View>
            </View>

            <View style={estilos.dato}>
              <Text style={[estilos.datoNombre, { color: colores.textoSuave }]}>Cómo la registraste</Text>
              <View style={[estilos.datoValor, estilos.filaIcono]}>
                <Ionicons name={origen.icono} size={16} color={colores.texto} />
                <Text style={[estilos.valorFuerte, { color: colores.texto }]}>{origen.texto}</Text>
              </View>
            </View>

            {pendiente ? (
              <View style={[estilos.aviso, { backgroundColor: colores.avisoFondo, borderColor: colores.avisoTexto }]}>
                <View style={estilos.filaIcono}>
                  <Ionicons name="cloud-offline-outline" size={18} color={colores.avisoTexto} />
                  <Text style={[estilos.avisoTitulo, { color: colores.avisoTexto }]}>
                    Todavía no se subió — está guardada en el teléfono
                  </Text>
                </View>
                <FilaPendiente texto="Visita registrada" />
                {visita.nota ? <FilaPendiente texto="Nota guardada" /> : null}
                {fotoVisible ? <FilaPendiente texto="Foto guardada" /> : null}
                <Text style={[estilos.avisoPie, { color: colores.avisoTexto }]}>
                  Todo se va a subir solo cuando vuelva la señal.
                </Text>
              </View>
            ) : null}
          </View>

          {visita.nota ? (
            <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
              <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>TU NOTA</Text>
              <Text style={[estilos.nota, { color: colores.texto }]}>“{visita.nota}”</Text>
            </View>
          ) : null}

          {fotoEnOtroTelefono ? (
            <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
              <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>TU FOTO</Text>
              <View style={estilos.filaIcono}>
                <Ionicons name="phone-portrait-outline" size={18} color={colores.textoSuave} />
                <Text style={[estilos.textoFotoAfuera, { color: colores.texto }]}>
                  La foto quedó en el teléfono donde la sacaste.
                </Text>
              </View>
              <Text style={[estilos.valorSuave, { color: colores.textoSuave }]}>
                Esta visita se sacó en otro teléfono y esa foto no está en el servidor. Podés
                agregar una nueva acá.
              </Text>
              <Pressable
                onPress={elegirFotoNueva}
                disabled={cambiandoFoto}
                accessibilityRole="button"
                accessibilityLabel="Agregar una foto nueva a esta visita"
                style={({ pressed }) => [estilos.accionFoto, estilos.accionSola, (pressed || cambiandoFoto) && estilos.presionado]}
              >
                <Ionicons name="camera-outline" size={15} color={colores.primario} />
                <Text style={[estilos.accionFotoTexto, { color: colores.primario }]}>
                  {cambiandoFoto ? 'Guardando…' : 'Agregar una foto nueva'}
                </Text>
              </Pressable>
            </View>
          ) : fotoVisible ? (
            <View
              style={[
                estilos.tarjeta,
                estilos.tarjetaFoto,
                { backgroundColor: colores.fondoElevado, borderColor: colores.borde },
              ]}
            >
              <View style={estilos.cabeceraFoto}>
                <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>TU FOTO</Text>
                {pendiente ? (
                  <View style={[estilos.chip, { backgroundColor: colores.avisoFondo }]}>
                    <Ionicons name="hourglass-outline" size={12} color={colores.avisoTexto} />
                    <Text style={[estilos.chipTexto, { color: colores.avisoTexto }]}>Sin subir</Text>
                  </View>
                ) : null}
              </View>
              <Image
                source={{ uri: visita.fotoUri }}
                style={estilos.foto}
                contentFit="cover"
                accessibilityLabel={`Tu foto en ${nombreLugar}`}
              />
              {/* Acciones como enlaces; quitar pide confirmación. */}
              {cambiandoFoto ? (
                <Text style={[estilos.accionFotoTexto, estilos.guardandoFoto, { color: colores.textoSuave }]}>
                  Guardando…
                </Text>
              ) : (
                <View style={estilos.accionesFoto}>
                  <Pressable
                    onPress={elegirFotoNueva}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar la foto de esta visita"
                    style={({ pressed }) => [estilos.accionFoto, pressed && estilos.presionado]}
                  >
                    <Ionicons name="camera-outline" size={15} color={colores.textoSuave} />
                    <Text style={[estilos.accionFotoTexto, { color: colores.textoSuave }]}>Cambiar foto</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmarQuitarFoto}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar la foto de esta visita"
                    style={({ pressed }) => [estilos.accionFoto, pressed && estilos.presionado]}
                  >
                    <Ionicons name="trash-outline" size={15} color={colores.textoSuave} />
                    <Text style={[estilos.accionFotoTexto, { color: colores.textoSuave }]}>Quitar foto</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            // Sin foto (nunca tuvo o la quitó): se puede agregar una.
            <Pressable
              onPress={elegirFotoNueva}
              disabled={cambiandoFoto}
              accessibilityRole="button"
              accessibilityLabel="Agregar una foto a esta visita"
              style={({ pressed }) => [
                estilos.agregarFoto,
                { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
                (pressed || cambiandoFoto) && estilos.presionado,
              ]}
            >
              <Ionicons name="camera-outline" size={22} color={colores.textoSuave} />
              <Text style={[estilos.accionFotoTexto, { color: colores.textoSuave }]}>
                {cambiandoFoto ? 'Guardando…' : 'Agregar una foto'}
              </Text>
            </Pressable>
          )}

          {lugar ? (
            <Boton titulo="Ver ficha del lugar" onPress={() => router.push(`/lugar/${lugar.id}`)} />
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function FilaPendiente({ texto }: { texto: string }) {
  const { colores } = useTema();
  return (
    <View style={estilos.filaPendiente}>
      <View style={estilos.filaIcono}>
        <Ionicons name="checkmark" size={14} color={colores.avisoTexto} />
        <Text style={[estilos.pendienteTexto, { color: colores.avisoTexto }]}>{texto}</Text>
      </View>
      <Text style={[estilos.pendienteEstado, { color: colores.avisoTexto }]}>Lista para subir</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  portada: {
    height: ALTO_PORTADA,
    justifyContent: 'flex-end',
  },
  sinFoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volver: {
    position: 'absolute',
    left: 12,
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volverTexto: {
    color: '#FFFFFF',
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
  },
  tituloPortada: {
    paddingHorizontal: 16,
    // Deja lugar para la curva del contenido que sube 16 px.
    paddingBottom: 28,
    gap: 2,
  },
  categoria: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: tipografia.cuerpo - 2,
  },
  nombre: {
    color: '#FFFFFF',
    fontSize: tipografia.titulo + 2,
    fontWeight: '700',
  },
  contenido: {
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 16,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  tarjetaFoto: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  rotulo: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  datoNombre: {
    fontSize: tipografia.cuerpo - 1,
  },
  datoValor: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valorFuerte: {
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
    textAlign: 'right',
  },
  valorSuave: {
    fontSize: tipografia.cuerpo - 1,
  },
  aviso: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  avisoTitulo: {
    flex: 1,
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
  },
  filaPendiente: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pendienteTexto: {
    fontSize: tipografia.cuerpo - 3,
  },
  pendienteEstado: {
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
  },
  avisoPie: {
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '600',
  },
  nota: {
    fontSize: tipografia.cuerpo,
    fontStyle: 'italic',
    lineHeight: tipografia.cuerpo * 1.45,
  },
  cabeceraFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipTexto: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '700',
  },
  foto: {
    width: '100%',
    height: 240,
  },
  accionesFoto: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  accionFoto: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accionFotoTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  accionSola: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  textoFotoAfuera: {
    flex: 1,
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '600',
  },
  guardandoFoto: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  agregarFoto: {
    minHeight: 64,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  presionado: {
    opacity: 0.5,
  },
});
