// Un favorito es "este usuario marcó este lugar".
// usuarioId existe porque Valeria quiere que viajen a otro teléfono.

export interface Favorito {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
}
