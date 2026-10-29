import type { Favorito } from '@/tipos/favorito';

// Favoritos de Lucía (usr-201). El usuarioId está porque tienen que
// poder ir a otro teléfono.
export const FAVORITOS_MOCK: Favorito[] = [
  {
    id: 'fav-088',
    usuarioId: 'usr-201',
    lugarId: 'lug-004',
    creadoEn: '2026-11-12T09:05:00-03:00',
  },
  {
    id: 'fav-089',
    usuarioId: 'usr-201',
    lugarId: 'lug-001',
    creadoEn: '2026-11-12T09:10:00-03:00',
  },
];
