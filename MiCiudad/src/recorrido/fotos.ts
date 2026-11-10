// Dueño: D — Recorrido y audioguías
// Copia la foto de la visita a disco permanente.

import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Copia la foto de una visita a disco permanente.
// Paths.document = carpeta de la app que sobrevive si la cerrás.
// La API vieja (writeAsStringAsync, etc.) tira en runtime: solo
// File / Directory / Paths (SDK 57).
//
// Antes de copiar se achica (cátedra: expo-image-manipulator).
// El POST /archivos manda esa copia, no el jpeg original de la cámara.
//
// La copia local queda en fotoUri (file://). Si ya se subió, la
// cuenta trae una URL http. Las dos se pueden mostrar.

const LADO_MAXIMO = 1280;
const CALIDAD_JPEG = 0.7;

function carpetaVisitas(): Directory {
  const carpeta = new Directory(Paths.document, 'visitas');
  if (!carpeta.exists) {
    // idempotent: si ya existe, no falla.
    carpeta.create({ intermediates: true, idempotent: true });
  }
  return carpeta;
}

// Lado largo > 1280 → se achica. Si ya es chica, solo se comprime a jpeg.
// Si el manipulator falla, se usa la original: la visita no se pierde.
async function achicarFoto(uri: string): Promise<string> {
  const contexto = ImageManipulator.manipulate(uri);
  try {
    const original = await contexto.renderAsync();
    try {
      const ladoLargo = Math.max(original.width, original.height);
      if (ladoLargo > LADO_MAXIMO) {
        contexto.reset();
        if (original.width >= original.height) {
          contexto.resize({ width: LADO_MAXIMO });
        } else {
          contexto.resize({ height: LADO_MAXIMO });
        }
        const achicada = await contexto.renderAsync();
        try {
          const resultado = await achicada.saveAsync({
            format: SaveFormat.JPEG,
            compress: CALIDAD_JPEG,
          });
          console.log(
            `[fotos] Achicada ${original.width}x${original.height} → ${achicada.width}x${achicada.height}`,
          );
          return resultado.uri;
        } finally {
          achicada.release();
        }
      }

      const resultado = await original.saveAsync({
        format: SaveFormat.JPEG,
        compress: CALIDAD_JPEG,
      });
      return resultado.uri;
    } finally {
      original.release();
    }
  } finally {
    contexto.release();
  }
}

// uriTemporal: lo que devolvió la cámara o la galería (suele ser
// un archivo en caché que el sistema puede borrar).
// visitaId: mismo id que la fila en SQLite (ej. vis-1712…). Al cambiar
// la foto se pasa id + hora: con otro nombre, expo-image no muestra la vieja de caché.
// Devuelve la uri permanente (file:///…/visitas/vis-….jpg).
export async function guardarFotoVisita(uriTemporal: string, visitaId: string): Promise<string> {
  const carpeta = carpetaVisitas();
  const destino = new File(carpeta, `${visitaId}.jpg`);
  const origen = new File(uriTemporal);

  if (!origen.exists) {
    throw new Error('No se encontró la foto temporal.');
  }

  let uriParaCopiar = uriTemporal;
  try {
    uriParaCopiar = await achicarFoto(uriTemporal);
  } catch (error) {
    console.log('[fotos] No se pudo achicar; se guarda la original', error);
  }

  const archivoListo = new File(uriParaCopiar);
  if (!archivoListo.exists) {
    throw new Error('No se encontró la foto temporal.');
  }

  // Si ya había un archivo con ese nombre, lo pisamos.
  if (destino.exists) {
    destino.delete();
  }

  await archivoListo.copy(destino);
  console.log(`[fotos] Guardada ${destino.uri}`);
  return destino.uri;
}

export function esUrlRemota(uri: string | null): uri is string {
  return typeof uri === 'string' && /^https?:\/\//.test(uri);
}

// ¿El archivo está en ESTE teléfono? Un file:// de otro aparato no existe.
export function fotoEnEsteTelefono(uri: string | null): boolean {
  if (!uri || esUrlRemota(uri)) {
    return false;
  }
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

// Se puede dibujar: archivo local o URL de POST /archivos.
export function sePuedeMostrarFoto(uri: string | null): uri is string {
  return esUrlRemota(uri) || fotoEnEsteTelefono(uri);
}

// Tiene foto, pero no es http y el archivo no está acá.
export function fotoSoloEnOtroTelefono(uri: string | null): boolean {
  return uri !== null && !sePuedeMostrarFoto(uri);
}

// Borra del disco la foto de una visita (al tocar "Quitar foto").
// Una URL del servidor no se borra acá. Si el archivo ya no estaba, no pasa nada.
export function borrarFotoVisita(uri: string): void {
  if (esUrlRemota(uri)) {
    return;
  }
  const archivo = new File(uri);
  if (archivo.exists) {
    archivo.delete();
    console.log(`[fotos] Borrada ${uri}`);
  }
}
