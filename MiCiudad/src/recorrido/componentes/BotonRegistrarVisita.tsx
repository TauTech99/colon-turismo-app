// Dueño: D — Recorrido y audioguías
// Tres formas: a mano / QR / Estoy acá (≤100 m). B lo importa.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { distanciaMetros } from '@/compartido/distancia';
import { BORDE_BOTON, tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { useUbicacion } from '@/mapa/useUbicacion';
import { useRegistrarVisita } from '@/recorrido/useRegistrarVisita';
import type { Coordenadas } from '@/tipos/lugar';

type Props = {
  lugarId: string;
  // Coordenadas del lugar del detalle (las pasa B desde lugar/[id].tsx).
  coordenadasLugar: Coordenadas;
};

// Metros fijos para “Estoy acá”.
// No es radioAvisoMetros (100/250/500 de las prefs).
// visita/registrar usa el mismo número.
export const RADIO_VISITA_METROS = 100;

// Va en el detalle (B pone una línea de import).
// Un botón grande; al tocarlo se despliegan las 3 opciones debajo
// y empujan el resto (sin Alert de menú ni pantalla nueva).
// “Estoy acá” siempre en la lista (defensa). Solo guarda si ≤ 100 m.
// Pedir cuenta en cada opción.
// GPS reutiliza useRegistrarVisita (origen "gps"); no toca cola/sync (24).

export function BotonRegistrarVisita({ lugarId, coordenadasLugar }: Props) {
  const { colores } = useTema();
  const { exigirCuenta } = useSesion();
  const { coordenadas: coordenadasUsuario } = useUbicacion();
  const { registrar, guardando } = useRegistrarVisita();
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // ¿El teléfono está dentro del radio de “estuve”?
  // Sin GPS (permiso negado o todavía cargando) → no está cerca.
  const estaCerca =
    coordenadasUsuario !== null &&
    distanciaMetros(coordenadasUsuario, coordenadasLugar) <= RADIO_VISITA_METROS;

  const bloqueado = ocupado || guardando;

  async function conCuenta(accion: () => void | Promise<void>) {
    if (bloqueado) {
      return;
    }

    setOcupado(true);
    try {
      const puede = await exigirCuenta();
      if (!puede) {
        return;
      }
      await accion();
    } finally {
      setOcupado(false);
    }
  }

  async function registrarPorGps() {
    // El botón se ve siempre (defensa: las 3 formas). Solo guarda si ≤ 100 m.
    if (!estaCerca) {
      Alert.alert(
        'Todavía no estás cerca',
        `Para usar “Estoy acá” tenés que estar a ${RADIO_VISITA_METROS} m o menos del lugar. Si estás lejos, usá el QR o registralo a mano.`,
      );
      return;
    }

    const visita = await registrar({
      lugarId,
      origen: 'gps',
      uriFotoTemporal: null,
      nota: null,
    });

    if (!visita) {
      Alert.alert('No se pudo guardar', 'Probá de nuevo en un momento.');
      return;
    }

    Alert.alert(
      'Visita guardada',
      'Quedó registrada porque estás cerca del lugar. La vas a ver en Mi recorrido más adelante.',
    );
  }

  return (
    <View style={estilos.bloque} accessibilityLabel="Registrar visita">
      <Pressable
        onPress={() => {
          setAbierto((antes) => !antes);
        }}
        disabled={bloqueado}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto, disabled: bloqueado }}
        accessibilityLabel="Guardá este momento. Registrá tu visita"
        style={[
          estilos.botonPrincipal,
          {
            borderColor: colores.primario,
            backgroundColor: colores.primario,
            opacity: bloqueado ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[estilos.tituloPrincipal, { color: colores.textoSobrePrimario }]}>
          Guardá este momento
        </Text>
        <Text style={[estilos.subtituloPrincipal, { color: colores.textoSobrePrimario }]}>
          Registrá tu visita
        </Text>
      </Pressable>

      {abierto ? (
        <View style={estilos.opciones}>
          <Pressable
            onPress={() => {
              void conCuenta(() => {
                router.push({ pathname: '/visita/nueva', params: { lugarId } });
              });
            }}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityState={{ disabled: bloqueado }}
            accessibilityLabel="A mano. La cargo yo, sin ubicación ni QR"
            style={[
              estilos.opcion,
              {
                borderColor: colores.primario,
                backgroundColor: colores.fondoElevado,
                opacity: bloqueado ? 0.5 : 1,
              },
            ]}
          >
            <View style={[estilos.iconoCirculo, { borderColor: colores.primario }]}>
              <Ionicons name="create-outline" size={22} color={colores.primario} />
            </View>
            <View style={estilos.opcionTextos}>
              <Text style={[estilos.opcionTitulo, { color: colores.primario }]}>A mano</Text>
              <Text style={[estilos.opcionAyuda, { color: colores.textoSuave }]}>
                La cargo yo, sin ubicación ni QR
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              void conCuenta(() => {
                router.push('/escanear');
              });
            }}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityState={{ disabled: bloqueado }}
            accessibilityLabel="Escanear QR. Con el código del cartel del lugar"
            style={[
              estilos.opcion,
              {
                borderColor: colores.primario,
                backgroundColor: colores.fondoElevado,
                opacity: bloqueado ? 0.5 : 1,
              },
            ]}
          >
            <View style={[estilos.iconoCirculo, { borderColor: colores.primario }]}>
              <Ionicons name="qr-code-outline" size={22} color={colores.primario} />
            </View>
            <View style={estilos.opcionTextos}>
              <Text style={[estilos.opcionTitulo, { color: colores.primario }]}>Escanear QR</Text>
              <Text style={[estilos.opcionAyuda, { color: colores.textoSuave }]}>
                Con el código del cartel del lugar
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              void conCuenta(() => registrarPorGps());
            }}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityState={{ disabled: bloqueado }}
            accessibilityLabel="Estoy acá. Usá tu ubicación para confirmarlo"
            style={[
              estilos.opcion,
              {
                borderColor: colores.primario,
                backgroundColor: colores.fondoElevado,
                opacity: bloqueado ? 0.5 : 1,
              },
            ]}
          >
            <View style={[estilos.iconoCirculo, { borderColor: colores.primario }]}>
              <Ionicons name="locate-outline" size={22} color={colores.primario} />
            </View>
            <View style={estilos.opcionTextos}>
              <Text style={[estilos.opcionTitulo, { color: colores.primario }]}>Estoy acá</Text>
              <Text style={[estilos.opcionAyuda, { color: colores.textoSuave }]}>
                Usá tu ubicación para confirmarlo
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  botonPrincipal: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloPrincipal: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtituloPrincipal: {
    fontSize: tipografia.cuerpo,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  opciones: {
    gap: 8,
  },
  opcion: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconoCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionTextos: {
    flex: 1,
    gap: 2,
  },
  opcionTitulo: {
    fontSize: tipografia.boton,
    fontWeight: '700',
  },
  opcionAyuda: {
    fontSize: tipografia.cuerpo,
  },
});
