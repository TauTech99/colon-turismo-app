// Dueño: D — Recorrido y audioguías
// Play/pausa/adelantar con expo-audio; usa copia local si hay.

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import {
  asegurarAudioguiaEnDisco,
  uriLocalSiExiste,
} from '@/audioguias/descargas';
import { hayRedAhora } from '@/compartido/useRed';
import type { Audioguia } from '@/tipos/lugar';

// Cuántos segundos salta "Adelantar". 15 es el salto habitual
// del botón de la pantalla bloqueada.
export const SEGUNDOS_ADELANTO = 15;

// --- CÓDIGO VIEJO DEL MOCK (no borrar) ---
// Metro necesita un require() escrito a mano por cada archivo.
// El mock guardaba URLs tipo …/audio/molino-es.m4a y acá se buscaba
// el mp3 empaquetado por ese nombre. La API manda otros archivos
// (semilla-audio-guide-mill.mp3…): este mapa ya no pega.
//
// const AUDIOS_LOCALES: Record<string, number> = {
//   'casa-cultura-es.m4a': require('../../assets/audioguias/lug-003-casa-de-la-cultura.mp3'),
//   'molino-es.m4a': require('../../assets/audioguias/lug-004-molino-forclaz.mp3'),
//   'iglesia-es.m4a': require('../../assets/audioguias/lug-005-iglesia-nuestra-senora-del-carmen.mp3'),
//   'puerto-es.m4a': require('../../assets/audioguias/lug-006-puerto-viejo.mp3'),
//   'palmar-es.m4a': require('../../assets/audioguias/lug-007-parque-nacional-el-palmar.mp3'),
// };
//
// function assetIdParaUrl(url: string): number | undefined {
//   const archivo = url.split('/').pop();
//   if (!archivo) {
//     return undefined;
//   }
//   return AUDIOS_LOCALES[archivo];
// }

// Prioridad: 1) archivo ya bajado en Paths.document, 2) URL de la API.
function fuenteParaReproducir(url: string): AudioSource {
  const enDisco = uriLocalSiExiste(url);
  if (enDisco) {
    return { uri: enDisco };
  }

  // CÓDIGO VIEJO DEL MOCK (no borrar): reproducía el require() empaquetado.
  // const assetId = assetIdParaUrl(url);
  // if (assetId !== undefined) {
  //   return { assetId, name: url };
  // }

  return url;
}

type ControlesAudioguia = {
  reproduciendo: boolean;
  cargando: boolean;
  error: string | null;
  // Posición y duración para la barra / "0:09" · "Faltan 1:08".
  tiempoActualSegundos: number;
  duracionSegundos: number;
  tiempoRestanteSegundos: number;
  // true cuando ya hay copia en Paths.document/audioguias/
  guardadaEnDisco: boolean;
  alternarReproduccion: () => void;
  adelantar: () => Promise<void>;
  retroceder: () => Promise<void>;
};

// Un hook es una función de React que guarda estado y se llama
// desde un componente. Este arma el reproductor de expo-audio
// y, con red, deja la audioguía guardada sola.
export function useAudioguia(audioguia: Audioguia, titulo: string): ControlesAudioguia {
  const [guardadaEnDisco, setGuardadaEnDisco] = useState(
    () => uriLocalSiExiste(audioguia.url) !== null,
  );

  // false cuando el componente se desmontó o cambió de audioguía.
  // Sirve para no llamar play/replace sobre un player ya liberado.
  const vivoRef = useRef(true);

  // useAudioPlayer recrea el player si cambia JSON.stringify(source).
  // Cuando el cache termina, en el próximo render fuenteParaReproducir
  // ya ve el archivo en disco → nueva fuente → player nuevo. No hace
  // falta player.replace (y es peligroso: el viejo ya se liberó).
  const player = useAudioPlayer(fuenteParaReproducir(audioguia.url), {
    updateInterval: 500,
  });
  // estado: los datos que cambian mientras suena (segundo actual, si está en play).
  const estado = useAudioPlayerStatus(player);

  useEffect(() => {
    // Sesión de audio para el bolsillo. doNotMix lo pide la doc de
    // Expo para que la pantalla bloqueada muestre los controles.
    // shouldPlayInBackground: true. Si queda en false (el default),
    // el audio se corta al apagar la pantalla.
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  // Al abrir el lugar con red, guardar sola en disco.
  // Sin botón Descargar. Sin red no intenta bajar.
  // No llamamos player.replace: al setear guardadaEnDisco el render
  // siguiente ya pasa la uri de documento a useAudioPlayer.
  useEffect(() => {
    vivoRef.current = true;
    let cancelado = false;

    async function cachearSiHayRed() {
      const yaLocal = uriLocalSiExiste(audioguia.url);
      if (yaLocal) {
        if (!cancelado && vivoRef.current) {
          setGuardadaEnDisco(true);
        }
        return;
      }

      const online = await hayRedAhora();
      if (!online || cancelado || !vivoRef.current) {
        return;
      }

      // CÓDIGO VIEJO DEL MOCK: el 2.º arg era assetIdParaUrl(audioguia.url).
      const uri = await asegurarAudioguiaEnDisco(audioguia.url);
      // Después del await el usuario pudo haber salido: el player
      // de useAudioPlayer ya se liberó. Solo actualizamos estado.
      if (cancelado || !vivoRef.current || !uri) {
        return;
      }

      setGuardadaEnDisco(true);
    }

    void cachearSiHayRed();

    return () => {
      cancelado = true;
      vivoRef.current = false;
    };
  }, [audioguia.url]);

  // No limpiar la pantalla bloqueada en un useEffect de desmontaje:
  // useAudioPlayer ya libera el player al salir, y si llamamos
  // clearLockScreenControls después, Android tira el error
  // "shared object that was already released".

  const duracionSegundos =
    estado.duration > 0 ? estado.duration : audioguia.duracionSegundos;
  const tiempoActualSegundos = Math.max(0, estado.currentTime);
  const tiempoRestanteSegundos = Math.max(0, duracionSegundos - tiempoActualSegundos);

  function activarPantallaApagada() {
    // En Android, sin esto el audio se corta a los ~3 minutos
    // con la pantalla apagada (límite del sistema).
    if (!vivoRef.current) {
      return;
    }
    try {
      player.setActiveForLockScreen(
        true,
        { title: titulo, artist: 'Mi Ciudad Colón' },
        { showSeekForward: true, showSeekBackward: true },
      );
    } catch {
      // Player liberado (desmontaje / cambio de fuente).
    }
  }

  function alternarReproduccion() {
    if (!vivoRef.current) {
      return;
    }

    try {
      if (estado.playing) {
        player.pause();
        // Acá el player todavía existe: se puede sacar de la pantalla bloqueada.
        player.clearLockScreenControls();
        return;
      }

      activarPantallaApagada();

      const termino =
        estado.didJustFinish ||
        (duracionSegundos > 0 && tiempoActualSegundos >= duracionSegundos - 0.3);

      if (termino) {
        // seekTo es async: el play va cuando el salto ya llegó al inicio.
        // Si mientras tanto desmontaron, no tocamos el player liberado.
        void player.seekTo(0).then(() => {
          if (!vivoRef.current) {
            return;
          }
          try {
            player.play();
          } catch {
            // Liberado entre el seek y el play.
          }
        });
        return;
      }

      player.play();
    } catch {
      // Liberado justo al tocar Play/Pausa.
    }
  }

  async function adelantar() {
    if (!vivoRef.current) {
      return;
    }
    const destino = Math.min(tiempoActualSegundos + SEGUNDOS_ADELANTO, duracionSegundos);
    await player.seekTo(destino);
  }

  async function retroceder() {
    if (!vivoRef.current) {
      return;
    }
    const destino = Math.max(0, tiempoActualSegundos - SEGUNDOS_ADELANTO);
    await player.seekTo(destino);
  }

  return {
    reproduciendo: estado.playing,
    cargando: estado.isBuffering || !estado.isLoaded,
    error: estado.error,
    tiempoActualSegundos,
    duracionSegundos,
    tiempoRestanteSegundos,
    guardadaEnDisco,
    alternarReproduccion,
    adelantar,
    retroceder,
  };
}
