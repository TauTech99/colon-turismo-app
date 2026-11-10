// Dueño: D — Recorrido y audioguías
// Visitas de esta cuenta. Quién es "yo" = Bearer. No se manda usuarioId.

import type { Respuesta } from '@/tipos/api';
import type { Visita } from '@/tipos/visita';

import { subirArchivo } from './archivos';
import { pedir } from './cliente';

function esUrlRemota(uri: string | null): uri is string {
  return typeof uri === 'string' && /^https?:\/\//.test(uri);
}

function esFotoLocal(uri: string | null): uri is string {
  return typeof uri === 'string' && uri.startsWith('file:');
}

function cuerpoVisita(visita: Visita, fotoUri: string | null) {
  return {
    id: visita.id,
    lugarId: visita.lugarId,
    fechaHora: visita.fechaHora,
    origen: visita.origen,
    nota: visita.nota,
    ...(fotoUri ? { fotoUri } : {}),
  };
}

// file:// → POST /archivos → URL http. Si ya es http, se usa. Si no hay foto, null.
async function urlDeFoto(uri: string | null): Promise<Respuesta<string | null>> {
  if (esUrlRemota(uri)) {
    return { datos: uri, meta: null };
  }
  if (!esFotoLocal(uri)) {
    return { datos: null, meta: null };
  }

  const subida = await subirArchivo(uri);
  if ('error' in subida) {
    return subida;
  }
  return { datos: subida.datos.url, meta: null };
}

// `_usuarioId` queda en la firma: la cola lo pasa. La API no lo usa.
export async function obtenerVisitas(_usuarioId: string): Promise<Respuesta<Visita[]>> {
  return pedir<Visita[]>('/yo/visitas?porPagina=500');
}

export async function enviarVisita(visita: Visita): Promise<Respuesta<Visita>> {
  const foto = await urlDeFoto(visita.fotoUri);
  if ('error' in foto) {
    return foto;
  }

  const creada = await pedir<Visita>('/yo/visitas', {
    metodo: 'POST',
    cuerpo: cuerpoVisita(visita, foto.datos),
  });
  if ('error' in creada) {
    return creada;
  }

  // POST es idempotente: si la visita ya estaba, no cambia la foto.
  // La foto puede llegar después → PATCH.
  if (foto.datos && creada.datos.fotoUri !== foto.datos) {
    return pedir<Visita>(`/yo/visitas/${encodeURIComponent(visita.id)}`, {
      metodo: 'PATCH',
      cuerpo: { fotoUri: foto.datos },
    });
  }

  return creada;
}
