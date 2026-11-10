// Dueño: D — Recorrido y audioguías
// Sube la foto al servidor (POST /archivos). enviarVisita usa la URL que vuelve.

import type { ArchivoSubido, Respuesta } from '@/tipos/api';

import { pedir } from './cliente';

// React Native no manda un Blob de web: manda { uri, name, type }.
type ArchivoDelTelefono = {
  uri: string;
  name: string;
  type: string;
};

function nombreDesdeUri(uri: string): string {
  const limpia = uri.split('?')[0] ?? '';
  const partes = limpia.split('/');
  return partes[partes.length - 1] || 'foto.jpg';
}

function tipoDesdeUri(uri: string): string {
  const limpia = (uri.split('?')[0] ?? '').toLowerCase();
  if (limpia.endsWith('.png')) {
    return 'image/png';
  }
  if (limpia.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

// uriLocal: file:///…/visitas/vis-….jpg (lo que guardó fotos.ts).
// Campo obligatorio: "archivo". Hace falta sesión (Bearer lo pone pedir()).
export async function subirArchivo(uriLocal: string): Promise<Respuesta<ArchivoSubido>> {
  const formulario = new FormData();
  const archivo: ArchivoDelTelefono = {
    uri: uriLocal,
    name: nombreDesdeUri(uriLocal),
    type: tipoDesdeUri(uriLocal),
  };
  formulario.append('archivo', archivo as unknown as Blob);

  return pedir<ArchivoSubido>('/archivos', {
    metodo: 'POST',
    cuerpo: formulario,
  });
}
