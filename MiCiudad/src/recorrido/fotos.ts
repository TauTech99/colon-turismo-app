// Dueño: D — Recorrido y audioguías
// Copia la foto de la visita a disco permanente.

import { Directory, File, Paths } from 'expo-file-system';

// Copia la foto de una visita a disco permanente.
// Paths.document = carpeta de la app que sobrevive si la cerrás.
// La API vieja (writeAsStringAsync, etc.) tira en runtime: solo
// File / Directory / Paths (SDK 57).
//
// La copia local queda en fotoUri (file://). Si ya se subió, la
// cuenta trae una URL http. Las dos se pueden mostrar.

function carpetaVisitas(): Directory {
  const carpeta = new Directory(Paths.document, 'visitas');
  if (!carpeta.exists) {
    // idempotent: si ya existe, no falla.
    carpeta.create({ intermediates: true, idempotent: true });
  }
  return carpeta;
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

  // Si ya había un archivo con ese nombre, lo pisamos.
  if (destino.exists) {
    destino.delete();
  }

  await origen.copy(destino);
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
