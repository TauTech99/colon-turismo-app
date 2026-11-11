// Datos de prueba: valores por defecto razonables que cada test pisa con lo que le importa.

import type { Evento } from '@/tipos/evento';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';

export const CENTRO_COLON = { latitud: -32.2236, longitud: -58.1419 };

export function crearEvento(datos: Partial<Evento> = {}): Evento {
  return {
    id: 'evt-1',
    titulo: 'Peña',
    descripcion: '',
    lugarId: null,
    direccionLibre: 'Costanera',
    coordenadas: null,
    inicio: '2026-11-13T23:00:00Z',
    fin: null,
    imagenUrl: null,
    precio: null,
    estado: 'programado',
    ...datos,
  };
}

export function crearLugar(datos: Partial<Lugar> = {}): Lugar {
  return {
    id: 'lug-1',
    nombre: 'Molino Forclaz',
    categoriaId: 'cat-historia',
    descripcionCorta: '',
    descripcion: '',
    coordenadas: CENTRO_COLON,
    direccion: 'Colón',
    imagenes: [],
    horarios: [],
    telefono: null,
    sitioWeb: null,
    precioEntrada: null,
    audioguia: null,
    codigoQr: 'COLON:lug-1',
    accesible: false,
    activo: true,
    actualizadoEn: '2026-11-01T00:00:00-03:00',
    ...datos,
  };
}

export function crearFavorito(datos: Partial<Favorito> = {}): Favorito {
  return { id: 'fav-1', usuarioId: 'usr-1', lugarId: 'lug-1', creadoEn: '2026-11-01T00:00:00Z', ...datos };
}
