import type { Visita } from '@/tipos/visita';

// Recorrido de ejemplo: con foto y sin foto, una todavía sin subir (cola).
export const VISITAS_MOCK: Visita[] = [
  {
    id: 'vis-311',
    usuarioId: 'usr-201',
    lugarId: 'lug-004',
    fechaHora: '2026-11-13T16:42:00-03:00',
    origen: 'qr',
    fotoUri: 'file:///data/user/0/com.miciudad.colon/files/visitas/vis-311.jpg',
    nota: 'Hacía 38 grados pero valió la pena',
    sincronizada: false,
  },
  {
    id: 'vis-312',
    usuarioId: 'usr-201',
    lugarId: 'lug-006',
    fechaHora: '2026-11-13T18:05:00-03:00',
    origen: 'gps',
    fotoUri: null,
    nota: null,
    sincronizada: true,
  },
  {
    id: 'vis-313',
    usuarioId: 'usr-201',
    lugarId: 'lug-003',
    fechaHora: '2026-11-14T11:20:00-03:00',
    origen: 'manual',
    fotoUri: 'file:///data/user/0/com.miciudad.colon/files/visitas/vis-313.jpg',
    nota: 'Cerraba a las 12, entramos justo',
    sincronizada: true,
  },
];
