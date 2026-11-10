// Dueño: A — Cuenta y plataforma
// Lectura/escritura del token en SecureStore (nunca kv-store).

import * as SecureStore from 'expo-secure-store';

import type { Sesion } from '@/tipos/auth';
import type { Usuario } from '@/tipos/usuario';

// Caja fuerte del teléfono (Keystore / Keychain). Ahí va el token.
// Nunca en kv-store: kv-store es una tablita de SQLite sin cifrar
// (preferencias). El token es la llave de la cuenta.
const CLAVE_TOKEN = 'miciudad.token';
const CLAVE_USUARIO = 'miciudad.usuario';
// Último email que entró en este teléfono. No es una llave (sin contraseña
// no abre nada): queda al cerrar sesión para no tener que escribirlo de nuevo.
const CLAVE_ULTIMO_EMAIL = 'miciudad.ultimoEmail';

export async function guardarSesion(sesion: Sesion): Promise<void> {
  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return;
  }

  await SecureStore.setItemAsync(CLAVE_TOKEN, sesion.token);
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
  await SecureStore.setItemAsync(CLAVE_ULTIMO_EMAIL, sesion.usuario.email);
}

// El login lo usa para dejar el email ya escrito.
export async function leerUltimoEmail(): Promise<string | null> {
  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return null;
  }
  return (await SecureStore.getItemAsync(CLAVE_ULTIMO_EMAIL)) ?? null;
}

// "Usar otro email" en el login: el teléfono deja de recordarlo.
export async function olvidarUltimoEmail(): Promise<void> {
  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE_ULTIMO_EMAIL);
}

export async function leerSesion(): Promise<Sesion | null> {
  const token = await leerToken();
  if (!token) {
    return null;
  }

  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return null;
  }

  const usuarioTexto = await SecureStore.getItemAsync(CLAVE_USUARIO);
  if (!usuarioTexto) {
    return null;
  }

  try {
    const usuario = JSON.parse(usuarioTexto) as Usuario;
    return { token, usuario };
  } catch (error) {
    console.error('[sesion] No se pudo leer el usuario guardado', error);
    return null;
  }
}

// Lo usa cliente.ts para armar Authorization: Bearer <token>.
export async function leerToken(): Promise<string | null> {
  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return null;
  }

  const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
  return token ?? null;
}

// Cerrar sesión: se va la llave (token) y el usuario. El último email
// queda a propósito (ver CLAVE_ULTIMO_EMAIL).
export async function borrarSesion(): Promise<void> {
  const disponible = await SecureStore.isAvailableAsync();
  if (!disponible) {
    return;
  }

  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_USUARIO);
}
