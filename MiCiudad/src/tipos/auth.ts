import type { Usuario } from './usuario';

// Este archivo NO viene del PRD. La cátedra pide login; el PRD no lista los campos.
// Es el único de tipos/ que se puede cambiar cuando publiquen los endpoints.

// Lo que se manda para ingresar.
export interface Credenciales {
  email: string;
  contrasena: string;
}

// Lo que se manda para crear una cuenta.
export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
}

// Lo que queda después de un login o registro correcto.
// El token va a expo-secure-store, nunca al kv-store.
export interface Sesion {
  token: string;
  usuario: Usuario;
}
