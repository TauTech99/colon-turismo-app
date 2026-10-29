// Dueño: B — Lugares y datos
// Delay, envelope {datos,meta}/{error}, Bearer, escenario mock.
// Con API real, los servicios cambian responderMock por pedir().
// Una sola vía HTTP: Axios vive acá. Las pantallas no lo importan.

import axios from 'axios';

import { borrarSesion, leerToken } from '@/cuenta/secure-store';
import type { ErrorApi, Meta, Respuesta } from '@/tipos/api';

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type OpcionesPedir = {
  metodo?: MetodoHttp;
  // JSON (objetos) o FormData (foto: POST /archivos). No poner Content-Type
  // a mano: Axios pone json o multipart con el borde que hace falta.
  cuerpo?: unknown;
};

// Expo inyecta las EXPO_PUBLIC_* del .env al arrancar Metro.
// Emulador Android: http://10.0.2.2:3000
// Teléfono (misma wifi): http://<IP-de-la-PC>:3000
// Esta PC / navegador: http://localhost:3000
function urlBase(): string {
  return (process.env.EXPO_PUBLIC_URL_API ?? '').replace(/\/$/, '');
}

// Cómo se comporta el mock hoy. Se cambia a mano para la demo:
//   "normal" → datos de src/mocks/
//   "vacio"  → listas vacías (para probar la pantalla vacía)
//   "error"  → error de red (para probar la pantalla de error)
export type EscenarioMock = 'normal' | 'vacio' | 'error';

export const ESCENARIO_MOCK: EscenarioMock = 'normal';

export const ERROR_RED: ErrorApi = {
  codigo: 'ERROR_RED',
  mensaje: 'No hay conexión. Probá de nuevo en un rato.',
};

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, milisegundos);
  });
}

// Espera entre 300 y 800 ms para que las pantallas ya se sientan "de red".
export async function esperarMock(): Promise<void> {
  const extra = Math.floor(Math.random() * 501);
  await esperar(300 + extra);
}

// Arma el sobre {datos, meta}. Si el escenario es error o vacío, lo fuerza acá
// para no repetirlo en cada servicio.
export async function responderMock<T>(datos: T, meta: Meta | null = null): Promise<Respuesta<T>> {
  await esperarMock();

  if (ESCENARIO_MOCK === 'error') {
    return { error: ERROR_RED };
  }

  if (ESCENARIO_MOCK === 'vacio' && Array.isArray(datos)) {
    return {
      datos: [] as T,
      meta: { total: 0, pagina: 1, porPagina: 20 },
    };
  }

  return { datos, meta };
}

function esSobre<T>(valor: unknown): valor is Respuesta<T> {
  if (!valor || typeof valor !== 'object') {
    return false;
  }
  return 'datos' in valor || 'error' in valor;
}

// Lo engancha SesionContext: un 401 cierra la sesión en un solo lugar.
let alCerrarPor401: (() => Promise<void>) | null = null;

export function registrarCierrePor401(fn: () => Promise<void>): void {
  alCerrarPor401 = fn;
}

async function reaccionar401(): Promise<void> {
  if (alCerrarPor401) {
    await alCerrarPor401();
    return;
  }
  await borrarSesion();
}

// Pide a la API. GET por defecto; también POST, PUT, PATCH, DELETE.
// El token lo guarda A en SecureStore; acá se lee para el Bearer.
// 204 (borrar) no trae cuerpo. 401 cierra la sesión.
export async function pedir<T>(
  ruta: string,
  opciones: OpcionesPedir = {},
): Promise<Respuesta<T>> {
  const base = urlBase();
  if (!base) {
    return {
      error: {
        codigo: 'ERROR_RED',
        mensaje: 'Falta EXPO_PUBLIC_URL_API en el .env de Mi Ciudad.',
      },
    };
  }

  const metodo = opciones.metodo ?? 'GET';
  const cabeceras: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = await leerToken();
  if (token) {
    cabeceras.Authorization = `Bearer ${token}`;
  }

  try {
    // FormData: no poner Content-Type. Si lo fijamos, se pierde el "borde"
    // y la API no ve el campo archivo.
    const respuestaHttp = await axios.request({
      url: `${base}${ruta}`,
      method: metodo,
      ...(opciones.cuerpo !== undefined ? { data: opciones.cuerpo } : {}),
      headers: cabeceras,
      timeout: 15000,
      validateStatus: () => true,
    });

    // 401 en ingreso/registro = clave mala, no "sesión vencida".
    const esAuthPublico = ruta === '/auth/ingreso' || ruta === '/auth/registro';
    if (respuestaHttp.status === 401 && token && !esAuthPublico) {
      await reaccionar401();
    }

    if (respuestaHttp.status === 204) {
      return { datos: null as T, meta: null };
    }

    const cuerpo = respuestaHttp.data;

    if (respuestaHttp.status < 200 || respuestaHttp.status >= 300) {
      if (esSobre<T>(cuerpo) && 'error' in cuerpo) {
        return cuerpo;
      }
      return {
        error: {
          codigo: 'ERROR_RED',
          mensaje: `La API respondió ${respuestaHttp.status}.`,
        },
      };
    }

    if (esSobre<T>(cuerpo)) {
      return cuerpo;
    }

    return { error: ERROR_RED };
  } catch {
    return { error: ERROR_RED };
  }
}
