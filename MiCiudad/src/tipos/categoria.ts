// Las 7 categorías de filtro del PRD (playas, termas, museos, etc.).

export interface Categoria {
  id: string;
  nombre: string;
  // Nombre del ícono de Ionicons, por ejemplo "business-outline".
  icono: string;
  // Color en hexadecimal, por ejemplo "#8E5A4A".
  color: string;
  orden: number;
}
