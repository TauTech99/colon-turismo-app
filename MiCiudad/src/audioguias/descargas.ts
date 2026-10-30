// Dueño: D — Recorrido y audioguías
// Cache en disco al abrir con red; play sin señal desde esa copia.

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

// Guarda la audioguía en disco para El Palmar / modo avión.
// Automático al abrir el lugar con red; sin botón Descargar.
// Paths.document = carpeta de la app que sobrevive si la cerrás.
// Solo API nueva: File / Directory / Paths (SDK 57). Nunca la API vieja.

function carpetaAudioguias(): Directory {
  const carpeta = new Directory(Paths.document, 'audioguias');
  if (!carpeta.exists) {
    carpeta.create({ intermediates: true, idempotent: true });
  }
  return carpeta;
}

// Nombre en disco = lo que va después de la última / de la URL
// (ej. molino-es.m4a). Así, cuando exista la API, la clave es la misma.
function nombreArchivo(url: string): string {
  const archivo = url.split('/').pop();
  if (!archivo) {
    return 'audioguia.bin';
  }
  return archivo;
}

function archivoLocal(url: string): File {
  return new File(carpetaAudioguias(), nombreArchivo(url));
}

// ¿Ya está en Paths.document/audioguias/? Sync: File.exists es inmediato.
export function uriLocalSiExiste(url: string): string | null {
  const destino = archivoLocal(url);
  if (!destino.exists) {
    return null;
  }
  return destino.uri;
}

// Asegura una copia en disco y devuelve su uri (file:///…).
// assetId: módulo de require() (mocks de hoy). Si no hay asset, baja la URL
// con File.downloadFileAsync (cuando la API exista de verdad).
// Si ya estaba guardada, no vuelve a bajar: solo devuelve la uri.
export async function asegurarAudioguiaEnDisco(
  url: string,
  assetId?: number,
): Promise<string | null> {
  const destino = archivoLocal(url);

  if (destino.exists) {
    return destino.uri;
  }

  try {
    if (assetId !== undefined) {
      // expo-asset deja el archivo en caché del sistema (puede borrarse).
      // Lo copiamos a Paths.document para que quede de antemano.
      const asset = Asset.fromModule(assetId);
      await asset.downloadAsync();
      if (!asset.localUri) {
        console.log('[audioguias] El asset no tiene localUri');
        return null;
      }
      const origen = new File(asset.localUri);
      if (!origen.exists) {
        console.log('[audioguias] No se encontró el asset local');
        return null;
      }
      await origen.copy(destino);
      console.log(`[audioguias] Guardada desde asset ${destino.uri}`);
      return destino.uri;
    }

    // URL real de la API (o mock remoto). idempotent: si ya hay archivo, pisa.
    const bajado = await File.downloadFileAsync(url, destino, { idempotent: true });
    console.log(`[audioguias] Descargada ${bajado.uri}`);
    return bajado.uri;
  } catch (error) {
    console.log('[audioguias] No se pudo guardar en disco', error);
    return null;
  }
}
