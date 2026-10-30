// Dueño: A — Cuenta y plataforma
// Preferencias en kv-store. Proximidad (C) lee con leerPreferenciasGuardadas().

import { createContext, createElement, useCallback, useContext, useState, type ReactNode } from 'react';
import Storage from 'expo-sqlite/kv-store';

import { actualizarYo } from '@/servicios/yo';
import type { Preferencias, Tema } from '@/tipos/usuario';

import { leerToken } from './secure-store';

// kv-store = una cajita clave → texto, adentro de SQLite.
// Sirve para preferencias (tema, radio, aviso). NO para el token:
// esa tablita no está cifrada. El token vive en SecureStore.
const CLAVE = 'miciudad.preferencias';

// Las mismas que trae Lucía en el mock. Las escribimos acá
// para no importar mocks/ (las pantallas y hooks no pueden).
export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  categoriasFavoritas: [],
  // Apagado de fábrica: si viene true, al abrir se pide ubicación “siempre”.
  avisarProximidad: false,
  radioAvisoMetros: 250,
  tema: 'sistema',
};

export const RADIOS_AVISO_METROS = [100, 250, 500] as const;

type ValorPreferencias = {
  preferencias: Preferencias;
  guardar: (cambio: Partial<Preferencias>) => Promise<void>;
  // Lo que vino de GET /yo o del login: solo teléfono, no vuelve a la API.
  aplicarDesdeServidor: (siguientes: Preferencias) => Promise<void>;
};

const PreferenciasContext = createContext<ValorPreferencias | null>(null);

function radioValido(valor: unknown): valor is number {
  return valor === 100 || valor === 250 || valor === 500;
}

function temaValido(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema';
}

function parsearPreferencias(crudo: string | null): Preferencias | null {
  if (!crudo) {
    return null;
  }

  try {
    const dato = JSON.parse(crudo) as Partial<Preferencias>;
    const categorias = dato.categoriasFavoritas;

    if (
      !Array.isArray(categorias) ||
      !categorias.every((id) => typeof id === 'string') ||
      typeof dato.avisarProximidad !== 'boolean' ||
      !radioValido(dato.radioAvisoMetros) ||
      !temaValido(dato.tema)
    ) {
      return null;
    }

    return {
      categoriasFavoritas: categorias,
      avisarProximidad: dato.avisarProximidad,
      radioAvisoMetros: dato.radioAvisoMetros,
      tema: dato.tema,
    };
  } catch (error) {
    console.error('[preferencias] El texto guardado no es JSON válido', error);
    return null;
  }
}

function leerPreferencias(): Preferencias {
  try {
    // Sync: al abrir ya sabemos el tema, no hay un destello del otro.
    const crudo = Storage.getItemSync(CLAVE);
    return parsearPreferencias(crudo) ?? PREFERENCIAS_POR_DEFECTO;
  } catch (error) {
    console.error('[preferencias] No se pudieron leer', error);
    return PREFERENCIAS_POR_DEFECTO;
  }
}

// C (proximidad) lee las prefs sin React: la tarea de fondo
// no es un componente y no puede usar usePreferencias().
export function leerPreferenciasGuardadas(): Preferencias {
  return leerPreferencias();
}

export function ProveedorPreferencias({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leerPreferencias);

  const escribirLocal = useCallback(async (siguientes: Preferencias): Promise<void> => {
    setPreferencias(siguientes);
    try {
      await Storage.setItem(CLAVE, JSON.stringify(siguientes));
    } catch (error) {
      console.error('[preferencias] No se pudieron guardar', error);
    }
  }, []);

  const aplicarDesdeServidor = useCallback(
    async (siguientes: Preferencias): Promise<void> => {
      const actuales = leerPreferencias();
      // El aviso de proximidad pide GPS/notificaciones en ESTE teléfono.
      // No se prende solo porque Lucía lo trae true en la API.
      await escribirLocal({
        ...siguientes,
        avisarProximidad: actuales.avisarProximidad,
      });
    },
    [escribirLocal],
  );

  async function guardar(cambio: Partial<Preferencias>): Promise<void> {
    const siguientes = { ...preferencias, ...cambio };
    await escribirLocal(siguientes);

    // Sin token (mapa libre / no ingresó): queda solo en el teléfono.
    const token = await leerToken();
    if (!token) {
      return;
    }

    const respuesta = await actualizarYo({ preferencias: cambio });
    if ('error' in respuesta) {
      console.log('[preferencias] No se pudo guardar en la API', respuesta.error);
    }
  }

  // Este archivo es .ts, no .tsx:
  // no se puede escribir <Provider>. createElement hace lo mismo.
  return createElement(
    PreferenciasContext.Provider,
    { value: { preferencias, guardar, aplicarDesdeServidor } },
    children,
  );
}

export function usePreferencias(): ValorPreferencias {
  const valor = useContext(PreferenciasContext);
  if (!valor) {
    throw new Error('usePreferencias() se usa dentro de <ProveedorPreferencias>.');
  }
  return valor;
}
