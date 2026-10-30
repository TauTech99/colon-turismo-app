// Dueño: D — Recorrido y audioguías
// UI del reproductor. B lo monta en el detalle de lugar.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SEGUNDOS_ADELANTO, useAudioguia } from '@/audioguias/useAudioguia';
import { BORDE_BOTON, BORDE_CAJA, tipografia, useTema } from '@/compartido/tema';
import type { Audioguia } from '@/tipos/lugar';

type Props = {
  audioguia: Audioguia;
  titulo: string;
};

// "252" → "4:12". El wireframe de Valeria muestra la duración en el botón.
function textoTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  const restoTexto = resto < 10 ? `0${resto}` : String(resto);
  return `${minutos}:${restoTexto}`;
}

// Un solo bloque (play · ±15 · barra · faltan), no dos botones sueltos.
// Controles a la vista. Solo se monta si el lugar tiene audioguía
// (una sola pista, sin selector de idioma). Solo audio, sin video.
// Sin botón Descargar: la copia en disco es automática.
export function ReproductorAudio({ audioguia, titulo }: Props) {
  const { colores } = useTema();
  const {
    reproduciendo,
    cargando,
    error,
    tiempoActualSegundos,
    duracionSegundos,
    tiempoRestanteSegundos,
    guardadaEnDisco,
    alternarReproduccion,
    adelantar,
    retroceder,
  } = useAudioguia(audioguia, titulo);
  const [falloSalto, setFalloSalto] = useState(false);

  const duracionTexto = textoTiempo(duracionSegundos);
  const actualTexto = textoTiempo(tiempoActualSegundos);
  const faltaTexto = textoTiempo(tiempoRestanteSegundos);
  const progreso =
    duracionSegundos > 0
      ? Math.min(1, Math.max(0, tiempoActualSegundos / duracionSegundos))
      : 0;

  async function alSaltar(hacia: 'adelante' | 'atras') {
    setFalloSalto(false);
    try {
      if (hacia === 'adelante') {
        await adelantar();
      } else {
        await retroceder();
      }
    } catch {
      setFalloSalto(true);
    }
  }

  return (
    <View
      style={[
        estilos.bloque,
        { borderColor: colores.borde, backgroundColor: colores.fondoElevado },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Audioguía de ${titulo}. Dura ${duracionTexto}. Faltan ${faltaTexto}.`}
    >
      <Text style={[estilos.titulo, { color: colores.texto }]}>
        Audioguía · {titulo}
      </Text>
      {guardadaEnDisco ? (
        <Text style={[estilos.aviso, { color: colores.textoSuave }]}>
          Guardada en el teléfono: sirve sin señal.
        </Text>
      ) : (
        <Text style={[estilos.aviso, { color: colores.textoSuave }]}>
          Duración {duracionTexto}
        </Text>
      )}
      {cargando ? (
        <Text style={[estilos.aviso, { color: colores.textoSuave }]}>Cargando audio…</Text>
      ) : null}
      {error ? (
        <Text style={[estilos.aviso, { color: colores.peligro }]}>
          No se pudo reproducir la audioguía.
        </Text>
      ) : null}
      {falloSalto ? (
        <Text style={[estilos.aviso, { color: colores.peligro }]}>
          Todavía no se puede saltar.
        </Text>
      ) : null}

      <View
        style={[estilos.barraFondo, { backgroundColor: colores.borde }]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: Math.round(duracionSegundos),
          now: Math.round(tiempoActualSegundos),
        }}
      >
        <View
          style={[
            estilos.barraProgreso,
            { width: `${progreso * 100}%`, backgroundColor: colores.primario },
          ]}
        />
      </View>
      <View style={estilos.tiempos}>
        <Text style={[estilos.tiempo, { color: colores.texto }]}>{actualTexto}</Text>
        <Text style={[estilos.tiempo, { color: colores.texto }]}>Faltan {faltaTexto}</Text>
      </View>

      <View style={estilos.controles}>
        <Pressable
          onPress={() => {
            void alSaltar('atras');
          }}
          style={({ pressed }) => [
            estilos.salto,
            { borderColor: colores.primario, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Retroceder ${SEGUNDOS_ADELANTO} segundos`}
        >
          <Text style={[estilos.saltoTexto, { color: colores.primario }]}>
            −{SEGUNDOS_ADELANTO} s
          </Text>
        </Pressable>

        <Pressable
          onPress={alternarReproduccion}
          style={({ pressed }) => [estilos.playEnvoltorio, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={reproduciendo ? 'Pausa' : 'Play'}
        >
          <View style={[estilos.play, { backgroundColor: colores.primario }]}>
            <Ionicons
              name={reproduciendo ? 'pause' : 'play'}
              size={36}
              color={colores.textoSobrePrimario}
              style={reproduciendo ? undefined : estilos.playIcono}
            />
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            void alSaltar('adelante');
          }}
          style={({ pressed }) => [
            estilos.salto,
            { borderColor: colores.primario, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Adelantar ${SEGUNDOS_ADELANTO} segundos`}
        >
          <Text style={[estilos.saltoTexto, { color: colores.primario }]}>
            +{SEGUNDOS_ADELANTO} s
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: BORDE_CAJA,
    gap: 8,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  aviso: {
    fontSize: tipografia.cuerpo,
  },
  barraFondo: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  barraProgreso: {
    height: '100%',
    borderRadius: 999,
  },
  tiempos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tiempo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  salto: {
    minWidth: 72,
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: BORDE_BOTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saltoTexto: {
    fontSize: tipografia.boton,
    fontWeight: '700',
  },
  playEnvoltorio: {
    borderRadius: 999,
  },
  play: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El ícono play de Ionicons queda un poco a la izquierda; lo centramos a ojo.
  playIcono: {
    marginLeft: 4,
  },
});
