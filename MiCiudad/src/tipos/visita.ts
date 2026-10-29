// Dueño: B — Lugares y datos (guardián de tipos/)
// Visita + OrigenVisita (manual | qr | gps). D las crea; B cuida el tipo.

// Cómo se registró que el turista estuvo en el lugar.
export type OrigenVisita = 'qr' | 'gps' | 'manual';

// Una visita al recorrido. sincronizada: false = está en la cola del teléfono
// (sin señal frente al molino) y se sube cuando vuelve la red.
export interface Visita {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri: string | null;
  nota: string | null;
  sincronizada: boolean;
}
