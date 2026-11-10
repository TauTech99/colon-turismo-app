// Dueño: A — Cuenta y plataforma
// Sesión que sobrevive al cierre; token solo en SecureStore.
// exigirCuenta() → biometría o pantalla desbloquear.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';

import {
  cerrarSesion as pedirCierreSesion,
  iniciarSesion as pedirInicioSesion,
  registrar as pedirRegistro,
} from '@/servicios/auth';
import { registrarCierrePor401 } from '@/servicios/cliente';
import { obtenerYo } from '@/servicios/yo';
import type { Credenciales, DatosRegistro } from '@/tipos/auth';
import type { Usuario } from '@/tipos/usuario';

import { pedirBiometria } from './biometria';
import { borrarSesion, guardarSesion, leerSesion, leerToken } from './secure-store';
import { usePreferencias } from './usePreferencias';

// Un Context es una caja compartida: cualquier pantalla lee el mismo valor
// (quién está adentro) sin pasarlo de padre a hijo. El Provider es quien
// pone la caja alrededor de la app, en _layout.tsx.

type ValorSesion = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  // En esta apertura ya pasó huella/rostro o la contraseña.
  // Se pierde al matar la app: al reabrir hay que desbloquear de nuevo.
  cuentaDesbloqueada: boolean;
  iniciarSesion: (credenciales: Credenciales) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  exigirCuenta: () => Promise<boolean>;
};

const SesionContext = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cuentaDesbloqueada, setCuentaDesbloqueada] = useState(false);
  // Evita dos diálogos de huella si Yo y otra pantalla llaman a la vez.
  const pedidoEnCurso = useRef<Promise<boolean> | null>(null);
  const { aplicarDesdeServidor } = usePreferencias();

  useEffect(() => {
    let cancelado = false;

    async function recuperar() {
      try {
        const sesion = await leerSesion();
        if (cancelado) {
          return;
        }
        if (sesion) {
          setUsuario(sesion.usuario);
          setToken(sesion.token);

          const actualizado = await obtenerYo();
          if (cancelado || 'error' in actualizado) {
            return;
          }

          const tokenActual = await leerToken();
          if (!tokenActual) {
            return;
          }

          await guardarSesion({ token: tokenActual, usuario: actualizado.datos });
          if (cancelado) {
            return;
          }
          setUsuario(actualizado.datos);
          await aplicarDesdeServidor(actualizado.datos.preferencias);
        }
      } catch (error) {
        console.error('[sesion] No se pudo recuperar la sesión', error);
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    recuperar();

    return () => {
      cancelado = true;
    };
  }, [aplicarDesdeServidor]);

  async function iniciarSesion(credenciales: Credenciales): Promise<void> {
    const respuesta = await pedirInicioSesion(credenciales);
    if ('error' in respuesta) {
      throw new Error(respuesta.error.mensaje);
    }

    await guardarSesion(respuesta.datos);
    setUsuario(respuesta.datos.usuario);
    setToken(respuesta.datos.token);
    await aplicarDesdeServidor(respuesta.datos.usuario.preferencias);
    // Acaba de escribir la contraseña: esta apertura ya está desbloqueada.
    marcarDesbloqueada();
  }

  async function registrar(datos: DatosRegistro): Promise<void> {
    const respuesta = await pedirRegistro(datos);
    if ('error' in respuesta) {
      throw new Error(respuesta.error.mensaje);
    }

    await guardarSesion(respuesta.datos);
    setUsuario(respuesta.datos.usuario);
    setToken(respuesta.datos.token);
    await aplicarDesdeServidor(respuesta.datos.usuario.preferencias);
    marcarDesbloqueada();
  }

  async function cerrarSesion(): Promise<void> {
    try {
      await pedirCierreSesion();
    } catch (error) {
      console.error('[sesion] El servicio no pudo cerrar', error);
    }

    await borrarSesion();
    setUsuario(null);
    setToken(null);
    setCuentaDesbloqueada(false);
  }

  useEffect(() => {
    registrarCierrePor401(cerrarSesion);
  });

  function marcarDesbloqueada() {
    setCuentaDesbloqueada(true);
  }

  // true = se puede seguir con algo de la cuenta.
  // Sin token → /login.
  // Con token, primera vez en esta apertura → huella/rostro;
  //   si no hay o falla → /desbloquear (contraseña).
  // Con token y ya desbloqueó en esta apertura → true, sin preguntar de nuevo.
  // No tapa las tabs: el mapa no llama a esto.
  async function exigirCuenta(): Promise<boolean> {
    if (!token) {
      router.push('/login');
      return false;
    }

    if (cuentaDesbloqueada) {
      return true;
    }

    if (pedidoEnCurso.current) {
      return pedidoEnCurso.current;
    }

    const trabajo = (async () => {
      const ok = await pedirBiometria();
      if (ok) {
        marcarDesbloqueada();
        return true;
      }

      router.push('/desbloquear');
      return false;
    })();

    pedidoEnCurso.current = trabajo;
    try {
      return await trabajo;
    } finally {
      pedidoEnCurso.current = null;
    }
  }

  const valor: ValorSesion = {
    usuario,
    token,
    cargando,
    cuentaDesbloqueada,
    iniciarSesion,
    registrar,
    cerrarSesion,
    exigirCuenta,
  };

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) {
    throw new Error('useSesion() se usa dentro de <ProveedorSesion>.');
  }
  return valor;
}
