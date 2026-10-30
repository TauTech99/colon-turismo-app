// Dueño: D — Recorrido y audioguías
// Registrar visita desde Mi recorrido: QR / Estoy acá / Manual + foto y nota.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { distanciaMetros, formatearDistancia } from '@/compartido/distancia';
import { BORDE_BOTON, colorAbierto, tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { fuenteFoto } from '@/lugares/fotos';
import { leerLugares } from '@/lugares/lugaresDb';
import { useUbicacion } from '@/mapa/useUbicacion';
import { borrarBorradorVisita } from '@/recorrido/borradorVisita';
import { RADIO_VISITA_METROS } from '@/recorrido/componentes/BotonRegistrarVisita';
import { EscanerQR } from '@/recorrido/componentes/EscanerQR';
import { SelectorFoto } from '@/recorrido/componentes/SelectorFoto';
import { resolverLugarDesdeQr } from '@/recorrido/qr';
import { useRegistrarVisita } from '@/recorrido/useRegistrarVisita';
import type { Lugar } from '@/tipos/lugar';
import type { OrigenVisita } from '@/tipos/visita';

// Junta las tres formas de registrar (QR, Estoy acá a 100 m y Manual)
// con foto y nota. Usa solo la base local: funciona sin señal.

type LugarElegido = {
  lugar: Lugar;
  // Texto bajo el nombre: "QR leído", "Estás a 85 m", etc.
  detalle: string;
};

const MODOS: { id: OrigenVisita; icono: 'qr-code-outline' | 'locate-outline' | 'create-outline'; etiqueta: string }[] = [
  { id: 'qr', icono: 'qr-code-outline', etiqueta: 'Escanear QR' },
  { id: 'gps', icono: 'locate-outline', etiqueta: 'Estoy acá' },
  { id: 'manual', icono: 'create-outline', etiqueta: 'Manual' },
];

export default function PantallaRegistrarVisita() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { exigirCuenta, cargando: cargandoSesion, token, cuentaDesbloqueada } = useSesion();
  const { registrar, guardando, error: errorGuardar } = useRegistrarVisita();

  const [cuentaOk, setCuentaOk] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [modo, setModo] = useState<OrigenVisita | null>(null);
  const [elegido, setElegido] = useState<LugarElegido | null>(null);
  // Sube para remontar EscanerQR (su bloqueo interno arranca limpio).
  const [claveEscaner, setClaveEscaner] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [uriFoto, setUriFoto] = useState<string | null>(null);
  const [nota, setNota] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  // Pedir cuenta una sola vez, igual que escanear y visita/nueva.
  useEffect(() => {
    if (cargandoSesion) {
      return;
    }

    let vivo = true;
    void (async () => {
      if (token && cuentaDesbloqueada) {
        if (vivo) {
          setCuentaOk(true);
        }
        return;
      }

      const puede = await exigirCuenta();
      if (!vivo) {
        return;
      }
      if (!puede) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
        return;
      }
      setCuentaOk(true);
    })();

    return () => {
      vivo = false;
    };
    // Intencional: solo cuando terminó de cargar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [cargandoSesion]);

  // Catálogo local para "Manual" y "Estoy acá". Sin red también anda.
  useEffect(() => {
    let vivo = true;
    void leerLugares()
      .then((lista) => {
        if (!vivo) {
          return;
        }
        const activos = lista
          .filter((lugar) => lugar.activo)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        setLugares(activos);
      })
      .catch((err: unknown) => {
        console.error('[registrar] No se pudieron leer los lugares', err);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Cambiar de lugar descarta la foto: el borrador va atado al lugarId.
  function cambiarLugar(nuevo: LugarElegido | null) {
    if (uriFoto) {
      void borrarBorradorVisita();
      setUriFoto(null);
    }
    setElegido(nuevo);
  }

  function elegirModo(nuevo: OrigenVisita) {
    if (nuevo === modo) {
      return;
    }
    setModo(nuevo);
    setCodigo('');
    setErrorCodigo(null);
    setClaveEscaner((n) => n + 1);
    cambiarLugar(null);
  }

  // Plan B del QR: escribir el código del cartel. Acepta "COLON:lug-004" o "lug-004".
  async function buscarPorCodigo() {
    const leido = await resolverLugarDesdeQr(codigo);

    if (!leido.ok && leido.motivo === 'invalido') {
      setErrorCodigo('Escribí el código que figura en el cartel, por ejemplo COLON:lug-004.');
      return;
    }
    if (!leido.ok && leido.motivo === 'no-encontrado') {
      setErrorCodigo('No encontramos ese código en el catálogo. Revisalo y probá de nuevo.');
      return;
    }
    if (!leido.ok && leido.motivo === 'inactivo') {
      setErrorCodigo(`${leido.nombre} ya no forma parte de la guía.`);
      return;
    }
    if (!leido.ok && leido.motivo === 'sin-cartel') {
      setErrorCodigo(
        `${leido.nombre} no tiene cartel QR. Registrala a mano o con Estoy acá.`,
      );
      return;
    }

    setErrorCodigo(null);
    cambiarLugar({ lugar: leido.lugar, detalle: 'Código del cartel' });
  }

  function alEnfocarNota() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
  }

  async function alRegistrar() {
    if (!elegido || !modo) {
      return;
    }

    const visita = await registrar({
      lugarId: elegido.lugar.id,
      origen: modo,
      uriFotoTemporal: uriFoto,
      nota: nota.trim() === '' ? null : nota,
    });

    if (!visita) {
      return;
    }

    await borrarBorradorVisita();

    Alert.alert(
      'Visita guardada',
      `Quedó registrada en ${elegido.lugar.nombre}. Si no hay señal, se sube sola cuando vuelva.`,
      [
        {
          text: 'Listo',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/recorrido');
            }
          },
        },
      ],
    );
  }

  if (!cuentaOk) {
    return (
      <>
        <Stack.Screen options={{ title: 'Registrar visita' }} />
        <EstadoCarga mensaje="Comprobando cuenta…" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Registrar visita' }} />
      <KeyboardAvoidingView
        style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          // Abajo: alto de la barra de Android + lugar para el teclado.
          contentContainerStyle={[estilos.contenido, { paddingBottom: 200 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[estilos.pregunta, { color: colores.texto }]}>¿Cómo registrás la visita?</Text>
          <View style={estilos.modos} accessibilityRole="radiogroup">
            {MODOS.map((opcion) => {
              const activo = modo === opcion.id;
              return (
                <Pressable
                  key={opcion.id}
                  onPress={() => elegirModo(opcion.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={opcion.etiqueta}
                  style={[
                    estilos.modo,
                    {
                      borderColor: activo ? colores.primario : colores.borde,
                      backgroundColor: activo ? colores.primario : colores.fondoElevado,
                    },
                  ]}
                >
                  <Ionicons
                    name={opcion.icono}
                    size={28}
                    color={activo ? colores.textoSobrePrimario : colores.primario}
                  />
                  <Text
                    style={[
                      estilos.modoTexto,
                      { color: activo ? colores.textoSobrePrimario : colores.texto },
                    ]}
                  >
                    {opcion.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {modo === 'qr' && !elegido ? (
            <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
              <View style={estilos.cajaEscaner}>
                <EscanerQR
                  key={claveEscaner}
                  enCaja
                  activo={!elegido}
                  onLugarListo={(lugar) => cambiarLugar({ lugar, detalle: 'QR leído' })}
                />
              </View>
              <Text style={[estilos.etiqueta, { color: colores.textoSuave }]}>
                ¿La cámara no lo lee? Escribí el código del cartel:
              </Text>
              <TextInput
                value={codigo}
                onChangeText={(texto) => {
                  setCodigo(texto);
                  setErrorCodigo(null);
                }}
                onSubmitEditing={() => void buscarPorCodigo()}
                placeholder="COLON:lug-004"
                placeholderTextColor={colores.textoSuave}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Código del cartel"
                style={[
                  estilos.campo,
                  estilos.campoCodigo,
                  { color: colores.texto, borderColor: colores.borde, backgroundColor: colores.fondo },
                ]}
              />
              {errorCodigo ? (
                <Text style={[estilos.error, { color: colores.peligro }]}>{errorCodigo}</Text>
              ) : null}
              <Boton
                titulo="Buscar código"
                variante="secundario"
                deshabilitado={codigo.trim() === ''}
                onPress={() => void buscarPorCodigo()}
              />
            </View>
          ) : null}

          {modo === 'gps' && !elegido ? (
            <BuscarCercano
              lugares={lugares}
              onCerca={(lugar, metros) =>
                cambiarLugar({ lugar, detalle: `Estás a ${formatearDistancia(metros)}` })
              }
            />
          ) : null}

          {modo === 'manual' && !elegido ? (
            <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
              <Text style={[estilos.subtitulo, { color: colores.texto }]}>Seleccioná el lugar</Text>
              {lugares.length === 0 ? (
                <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
                  Todavía no hay lugares guardados. Abrí Buscar una vez con conexión.
                </Text>
              ) : (
                lugares.map((lugar) => (
                  <Pressable
                    key={lugar.id}
                    onPress={() => cambiarLugar({ lugar, detalle: 'Registrar visita acá' })}
                    accessibilityRole="button"
                    style={[estilos.filaLugar, { borderColor: colores.borde }]}
                  >
                    <Text style={[estilos.nombreFila, { color: colores.texto }]}>{lugar.nombre}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colores.textoSuave} />
                  </Pressable>
                ))
              )}
            </View>
          ) : null}

          {elegido && modo ? (
            <>
              <TarjetaLugar
                elegido={elegido}
                // En GPS el lugar sale de la ubicación: no hay otro para elegir.
                onCambiar={
                  modo === 'gps'
                    ? undefined
                    : () => {
                        setClaveEscaner((n) => n + 1);
                        cambiarLugar(null);
                      }
                }
                textoCambiar={modo === 'qr' ? 'Escanear otro' : 'Cambiar lugar'}
              />

              <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
                <SelectorFoto lugarId={elegido.lugar.id} uri={uriFoto} onCambiar={setUriFoto} />

                <View style={estilos.bloqueNota}>
                  <Text style={[estilos.subtitulo, { color: colores.texto }]}>Nota (opcional)</Text>
                  <TextInput
                    value={nota}
                    onChangeText={setNota}
                    onFocus={alEnfocarNota}
                    placeholder="Ej. Hacía calor pero valió la pena"
                    placeholderTextColor={colores.textoSuave}
                    multiline
                    maxLength={200}
                    accessibilityLabel="Nota de la visita"
                    style={[
                      estilos.campo,
                      estilos.campoNota,
                      { color: colores.texto, borderColor: colores.borde, backgroundColor: colores.fondo },
                    ]}
                  />
                </View>
              </View>

              {errorGuardar ? (
                <Text style={[estilos.error, { color: colores.peligro }]}>{errorGuardar}</Text>
              ) : null}

              <Boton
                titulo={guardando ? 'Guardando…' : 'Registrar visita'}
                onPress={() => void alRegistrar()}
                deshabilitado={guardando}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// Aparte para que el permiso de ubicación se pida solo al tocar "Estoy acá".
function BuscarCercano({
  lugares,
  onCerca,
}: {
  lugares: Lugar[];
  onCerca: (lugar: Lugar, metros: number) => void;
}) {
  const { colores } = useTema();
  const { coordenadas, permiso } = useUbicacion();

  let masCercano: { lugar: Lugar; metros: number } | null = null;
  if (coordenadas) {
    for (const lugar of lugares) {
      const metros = distanciaMetros(coordenadas, lugar.coordenadas);
      if (!masCercano || metros < masCercano.metros) {
        masCercano = { lugar, metros };
      }
    }
  }

  const estaCerca = masCercano !== null && masCercano.metros <= RADIO_VISITA_METROS;
  const lugarCerca = estaCerca ? masCercano?.lugar : undefined;
  const metrosCerca = estaCerca ? masCercano?.metros : undefined;

  useEffect(() => {
    if (lugarCerca && metrosCerca !== undefined) {
      onCerca(lugarCerca, metrosCerca);
    }
    // Solo cuando aparece un lugar a ≤100 m; onCerca se recrea cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [lugarCerca?.id]);

  let mensaje: string;
  if (permiso === 'denegado') {
    mensaje = 'Sin permiso de ubicación. Podés escanear el QR o registrarla a mano.';
  } else if (!coordenadas) {
    mensaje = 'Buscando tu ubicación…';
  } else if (!masCercano) {
    mensaje = 'Todavía no hay lugares guardados. Abrí Buscar una vez con conexión.';
  } else if (!estaCerca) {
    mensaje = `El lugar más cercano es ${masCercano.lugar.nombre}, a ${formatearDistancia(
      masCercano.metros,
    )}. Para usar “Estoy acá” tenés que estar a ${RADIO_VISITA_METROS} m o menos.`;
  } else {
    mensaje = 'Ubicación detectada.';
  }

  return (
    <View
      style={[estilos.tarjeta, estilos.centrado, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}
    >
      <Ionicons name="locate-outline" size={36} color={colores.primario} />
      <Text style={[estilos.ayuda, estilos.textoCentrado, { color: colores.texto }]}>{mensaje}</Text>
    </View>
  );
}

function TarjetaLugar({
  elegido,
  onCambiar,
  textoCambiar,
}: {
  elegido: LugarElegido;
  onCambiar?: () => void;
  textoCambiar: string;
}) {
  const { colores, oscuro } = useTema();
  const foto = elegido.lugar.imagenes[0] ? fuenteFoto(elegido.lugar.imagenes[0]) : null;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
      <View style={estilos.filaElegido}>
        {foto ? (
          <Image source={foto} style={estilos.miniatura} contentFit="cover" accessible={false} />
        ) : null}
        <View style={estilos.textosElegido}>
          <Text style={[estilos.nombreElegido, { color: colores.texto }]}>{elegido.lugar.nombre}</Text>
          <View style={estilos.filaDetalle}>
            <Ionicons name="checkmark-circle" size={16} color={colorAbierto(oscuro)} />
            <Text style={[estilos.detalle, { color: colorAbierto(oscuro) }]}>{elegido.detalle}</Text>
          </View>
        </View>
      </View>
      {onCambiar ? (
        <Pressable
          onPress={onCambiar}
          accessibilityRole="button"
          style={[estilos.botonCambiar, { borderColor: colores.primario }]}
        >
          <Text style={[estilos.textoCambiar, { color: colores.primario }]}>{textoCambiar}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    padding: 16,
    gap: 16,
  },
  pregunta: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  modos: {
    flexDirection: 'row',
    gap: 8,
  },
  modo: {
    flex: 1,
    minHeight: 88,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  modoTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  centrado: {
    alignItems: 'center',
  },
  textoCentrado: {
    textAlign: 'center',
  },
  cajaEscaner: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
  },
  subtitulo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  etiqueta: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
  },
  campo: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: tipografia.cuerpo,
  },
  campoCodigo: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  campoNota: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
  },
  filaLugar: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombreFila: {
    flex: 1,
    fontSize: tipografia.cuerpo,
  },
  filaElegido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniatura: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  textosElegido: {
    flex: 1,
    gap: 4,
  },
  nombreElegido: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  filaDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detalle: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  botonCambiar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    justifyContent: 'center',
  },
  textoCambiar: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  bloqueNota: {
    gap: 8,
  },
});
