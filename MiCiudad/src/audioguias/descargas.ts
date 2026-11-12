// Dueño: D — Recorrido y audioguías
// Cache en disco: al sync del catálogo con red, y al abrir la ficha.
// Play sin señal desde esa copia.

import { Directory, File, Paths } from 'expo-file-system';

import type { Lugar } from '@/tipos/lugar';

// Guarda la audioguía en disco para El Palmar / modo avión.
// Precarga al guardar el catálogo con red; también al abrir la ficha.
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
export async function asegurarAudioguiaEnDisco(url: string): Promise<string | null> {
  const destino = archivoLocal(url);

  if (destino.exists) {
    return destino.uri;
  }

  try {
    const bajado = await File.downloadFileAsync(url, destino, { idempotent: true });
    console.log(`[audioguias] Descargada ${bajado.uri}`);
    return bajado.uri;
  } catch (error) {
    console.log('[audioguias] No se pudo guardar en disco', error);
    return null;
  }
}

// Hotel con Wi‑Fi: baja todas las audioguías del catálogo al disco.
// Una detrás de otra; si ya está, asegurarAudioguiaEnDisco no vuelve a pedir.
// Fire-and-forget desde useLugares: no bloquea el mapa.
export async function precargarAudioguiasDeLugares(lugares: Lugar[]): Promise<void> {
  const urls: string[] = [];
  for (const lugar of lugares) {
    const url = lugar.audioguia?.url;
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  if (urls.length === 0) {
    return;
  }

  console.log(`[audioguias] Precargando ${urls.length}…`);
  for (const url of urls) {
    await asegurarAudioguiaEnDisco(url);
  }
  console.log(`[audioguias] Precarga lista (${urls.length})`);
}
