// Preferencias que el usuario elige en la pestaña Yo.
// radioAvisoMetros solo admite 100, 250 o 500 (el PRD lo fija).

export type Tema = 'claro' | 'oscuro' | 'sistema';

export interface Preferencias {
  categoriasFavoritas: string[];
  avisarProximidad: boolean;
  radioAvisoMetros: number;
  tema: Tema;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  creadoEn: string;
  preferencias: Preferencias;
}
