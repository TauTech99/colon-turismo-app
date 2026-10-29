// Dueño: B — Lugares y datos (guardián de tipos/)
// Contratos del PRD: Lugar, Horario, Coordenadas, Audioguia…
// Cambios acá = PR types: aprobado por los 4.

// Tipos del lugar (el corazón del producto).
// Copiados del PRD. temporada es extra de los mocks; la API no la manda.

// Un punto en el mapa. Son números decimales, no texto.
export interface Coordenadas {
  latitud: number;
  longitud: number;
}

// "verano" = 1 dic a 31 mar. "invierno" = 1 abr a 30 nov.
// "todoElAnio" = el lugar no cambia de horario (la mayoría).
export type Temporada = 'verano' | 'invierno' | 'todoElAnio';

// Un renglón de la grilla de horarios. dia 0 = domingo, como en JavaScript.
// abre y cierra van como texto "09:00", no como Date.
export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  abre: string;
  cierra: string;
  temporada?: Temporada;
}

// Audio del lugar, si existe. idioma prevé inglés y portugués (fuera de alcance de la UI).
export interface Audioguia {
  url: string;
  duracionSegundos: number;
  idioma: 'es' | 'en' | 'pt';
}

// Lo que la app guarda y muestra de cada lugar del catálogo.
export interface Lugar {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcionCorta: string;
  descripcion: string;
  coordenadas: Coordenadas;
  direccion: string;
  imagenes: string[];
  horarios: Horario[];
  telefono: string | null;
  sitioWeb: string | null;
  precioEntrada: number | null;
  audioguia: Audioguia | null;
  codigoQr: string | null;
  accesible: boolean;
  activo: boolean;
  actualizadoEn: string;
}
