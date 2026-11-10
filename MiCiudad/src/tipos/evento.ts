// Dueño: B — Lugares y datos (guardián de tipos/)
// Evento + EstadoEvento. C los consume; B cuida el tipo.

import type { Coordenadas } from './lugar';

// Cómo está el evento hoy. "suspendido" es por lluvia u otro motivo temporal.
export type EstadoEvento = 'programado' | 'suspendido' | 'cancelado' | 'finalizado';

// Puede estar atado a un lugar del catálogo (lugarId) o a una dirección suelta.
// Si hay lugarId, coordenadas y direccionLibre van en null (convención del PRD).
export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null;
  inicio: string;
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: EstadoEvento;
}
