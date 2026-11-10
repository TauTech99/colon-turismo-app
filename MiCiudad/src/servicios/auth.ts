// Dueño: A — Cuenta y plataforma
// Ingreso y registro contra la API. Cerrar sesión = borrar el token en el teléfono.

import type { Respuesta } from '@/tipos/api';
import type { Credenciales, DatosRegistro, Sesion } from '@/tipos/auth';

import { pedir } from './cliente';

export async function iniciarSesion(credenciales: Credenciales): Promise<Respuesta<Sesion>> {
  return pedir<Sesion>('/auth/ingreso', {
    metodo: 'POST',
    cuerpo: credenciales,
  });
}

export async function registrar(datos: DatosRegistro): Promise<Respuesta<Sesion>> {
  return pedir<Sesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: datos,
  });
}

// La API no tiene logout. El Context borra SecureStore.
export async function cerrarSesion(): Promise<Respuesta<null>> {
  return { datos: null, meta: null };
}
