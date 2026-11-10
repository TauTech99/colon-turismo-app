// Dueño: B — Lugares y datos (guardián de tipos/)
// Envelope Respuesta<T>: {datos,meta} | {error}.

// Forma de todas las respuestas (el "sobre" / envelope).
// Hoy la usan los mocks; mañana, pedir() (Axios) a la API de la cátedra.
// meta es null cuando la respuesta es un solo objeto, no una lista.

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

export type Respuesta<T> =
  | { datos: T; meta: Meta | null }
  | { error: ErrorApi };

// GET /salud. Lo agrega la API; no está en el PRD. El turista no lo ve.
export interface Salud {
  estado: 'ok';
  motor: string;
  almacen: string;
  version: string;
}

// POST /archivos. La API guarda el archivo y devuelve esta URL (http…).
// Esa URL es la que después va en la visita. Un file:// del celular no sirve.
export interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}
