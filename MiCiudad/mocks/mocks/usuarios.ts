import type { Credenciales } from '@/tipos/auth';
import type { Usuario } from '@/tipos/usuario';

// Usuario de prueba (el ejemplo del PRD).
// La contraseña NO va en Usuario: viaja solo al ingresar (Credenciales).
export const USUARIO_DEMO: Usuario = {
  id: 'usr-201',
  nombre: 'Lucía Méndez',
  email: 'lucia@mail.com',
  avatarUrl: null,
  creadoEn: '2026-09-02T18:20:00-03:00',
  preferencias: {
    categoriasFavoritas: ['cat-museos', 'cat-playas'],
    avisarProximidad: true,
    radioAvisoMetros: 250,
    tema: 'sistema',
  },
};

// Para el login de prueba. Misma casilla de email que USUARIO_DEMO.
export const CREDENCIALES_DEMO: Credenciales = {
  email: 'lucia@mail.com',
  contrasena: 'lucia1234',
};
