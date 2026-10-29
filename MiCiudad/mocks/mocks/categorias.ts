import type { Categoria } from '@/tipos/categoria';

// Las 7 categorías de filtro que pide el PRD, en el orden de la consigna.
export const CATEGORIAS_MOCK: Categoria[] = [
  {
    id: 'cat-playas',
    nombre: 'Playas',
    icono: 'umbrella-outline',
    color: '#2E86AB',
    orden: 1,
  },
  {
    id: 'cat-termas',
    nombre: 'Termas',
    icono: 'water-outline',
    color: '#1B998B',
    orden: 2,
  },
  {
    id: 'cat-museos',
    nombre: 'Museos y patrimonio',
    icono: 'business-outline',
    color: '#8E5A4A',
    orden: 3,
  },
  {
    id: 'cat-gastronomia',
    nombre: 'Gastronomía',
    icono: 'restaurant-outline',
    color: '#C0392B',
    orden: 4,
  },
  {
    id: 'cat-artesanias',
    nombre: 'Artesanías',
    icono: 'color-palette-outline',
    color: '#B5651D',
    orden: 5,
  },
  {
    id: 'cat-naturaleza',
    nombre: 'Naturaleza',
    icono: 'leaf-outline',
    color: '#3D6B35',
    orden: 6,
  },
  {
    id: 'cat-alojamiento',
    nombre: 'Alojamiento',
    icono: 'bed-outline',
    color: '#5C4B7A',
    orden: 7,
  },
];
