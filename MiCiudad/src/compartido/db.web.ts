import type { SQLiteDatabase } from 'expo-sqlite';

// Metro, al arrancar, también intenta armar un bundle web
// (el template traía output: "static"). expo-sqlite en web pide
// un archivo .wasm que el paquete no trae, y rompe la terminal.
// Este archivo se usa SOLO si alguien abre el navegador.
// En el teléfono Metro elige db.ts (el de B).

export const NOMBRE_BASE = 'miciudad.db';
export const VERSION_BASE = 1;

const MENSAJE = 'SQLite no corre en el navegador. Abrí la app en el teléfono.';

export function abrirBase(): Promise<SQLiteDatabase> {
  return Promise.reject(new Error(MENSAJE));
}

export function obtenerBase(): SQLiteDatabase {
  throw new Error(MENSAJE);
}
