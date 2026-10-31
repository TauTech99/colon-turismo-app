// Dueño: D — Recorrido y audioguías
// Cache en disco al abrir con red; play sin señal desde esa copia.

// CÓDIGO VIEJO DEL MOCK (no borrar): copiaba el require() empaquetado.
// import { Asset } from 'expo-asset';
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
// (ej. semilla-audio-guide-mill.mp3). La clave es el nombre que manda la API.
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
// Baja la URL de la API con File.downloadFileAsync.
// Si ya estaba guardada, no vuelve a bajar: solo devuelve la uri.
//
// --- CÓDIGO VIEJO DEL MOCK (no borrar) ---
// El 2.º arg era assetId (módulo de require()). Si venía, copiaba el
// mp3 empaquetado a Paths.document en vez de bajar la URL.
// export async function asegurarAudioguiaEnDisco(url: string, assetId?: number)
export async function asegurarAudioguiaEnDisco(url: string): Promise<string | null> {
  const destino = archivoLocal(url);

  if (destino.exists) {
    return destino.uri;
  }

  try {
    // CÓDIGO VIEJO DEL MOCK (no borrar): copiaba el require() empaquetado.
    // if (assetId !== undefined) {
    //   // expo-asset deja el archivo en caché del sistema (puede borrarse).
    //   // Lo copiamos a Paths.document para que quede de antemano.
    //   const asset = Asset.fromModule(assetId);
    //   await asset.downloadAsync();
    //   if (!asset.localUri) {
    //     console.log('[audioguias] El asset no tiene localUri');
    //     return null;
    //   }
    //   const origen = new File(asset.localUri);
    //   if (!origen.exists) {
    //     console.log('[audioguias] No se encontró el asset local');
    //     return null;
    //   }
    //   await origen.copy(destino);
    //   console.log(`[audioguias] Guardada desde asset ${destino.uri}`);
    //   return destino.uri;
    // }

    const bajado = await File.downloadFileAsync(url, destino, { idempotent: true });
    console.log(`[audioguias] Descargada ${bajado.uri}`);
    return bajado.uri;
  } catch (error) {
    console.log('[audioguias] No se pudo guardar en disco', error);
    return null;
  }
}
