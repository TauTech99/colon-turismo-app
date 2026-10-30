// Dueño: A — Cuenta y plataforma
// Tabla favoritos en la base única de B. Offline sin red.

import { abrirBase } from '@/compartido/db';
import type { Favorito } from '@/tipos/favorito';

// Lectura y escritura de la tabla `favoritos`.
// Las columnas las creó compartido/db.ts (B). Este archivo
// NO hace CREATE TABLE: solo lee y escribe.
//
// Por qué SQLite y no kv-store: un favorito es una fila
// (usuario + lugar + fecha). Puede haber muchas. kv-store es una
// clave → un texto (sirve para preferencias). El token va en
// SecureStore, nunca acá.

type FilaFavorito = {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
};

// Si el botón y la lista tocan la base a la vez, el segundo espera.
// No usamos BEGIN (withTransactionAsync): B también escribe el
// catálogo con una transacción. SQLite no deja dos a la vez
// ("cannot start a transaction within a transaction").
let cola: Promise<unknown> = Promise.resolve();

function esChoqueSqlite(error: unknown): boolean {
  const texto = error instanceof Error ? error.message : String(error);
  return (
    texto.includes('transaction') ||
    texto.includes('database is locked') ||
    texto.includes('SQLITE_BUSY')
  );
}

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, milisegundos);
  });
}

async function conReintento<T>(tarea: () => Promise<T>): Promise<T> {
  const maximo = 4;
  for (let intento = 1; intento <= maximo; intento++) {
    try {
      return await tarea();
    } catch (error) {
      if (!esChoqueSqlite(error) || intento === maximo) {
        throw error;
      }
      console.log(`[favoritos] La base estaba ocupada. Reintento ${intento}.`);
      await esperar(80 * intento);
    }
  }
  throw new Error('No se pudo hablar con SQLite.');
}

function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const resultado = cola.then(
    () => conReintento(tarea),
    () => conReintento(tarea),
  );
  cola = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

function filaAFavorito(fila: FilaFavorito): Favorito {
  return {
    id: fila.id,
    usuarioId: fila.usuarioId,
    lugarId: fila.lugarId,
    creadoEn: fila.creadoEn,
  };
}

export async function leerFavoritos(usuarioId: string): Promise<Favorito[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<FilaFavorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? ORDER BY creadoEn DESC',
      [usuarioId],
    );
    return filas.map(filaAFavorito);
  });
}

export async function leerFavorito(usuarioId: string, lugarId: string): Promise<Favorito | null> {
  return enFila(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaFavorito>(
      'SELECT * FROM favoritos WHERE usuarioId = ? AND lugarId = ?',
      [usuarioId, lugarId],
    );
    if (!fila) {
      return null;
    }
    return filaAFavorito(fila);
  });
}

// UNIQUE (usuarioId, lugarId): si ya está, no inserta otra fila.
export async function guardarFavorito(favorito: Favorito): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync(
      'INSERT OR IGNORE INTO favoritos (id, usuarioId, lugarId, creadoEn) VALUES (?, ?, ?, ?)',
      [favorito.id, favorito.usuarioId, favorito.lugarId, favorito.creadoEn],
    );
    console.log(`[favoritos] Guardado ${favorito.lugarId} de ${favorito.usuarioId}`);
  });
}

export async function borrarFavorito(usuarioId: string, lugarId: string): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('DELETE FROM favoritos WHERE usuarioId = ? AND lugarId = ?', [
      usuarioId,
      lugarId,
    ]);
    console.log(`[favoritos] Borrado ${lugarId} de ${usuarioId}`);
  });
}

// Solo se usa la primera vez: el teléfono no tenía filas y el
// servicio (hoy el mock de Lucía) mandó las suyas.
export async function reemplazarFavoritos(usuarioId: string, favoritos: Favorito[]): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('DELETE FROM favoritos WHERE usuarioId = ?', [usuarioId]);
    for (const favorito of favoritos) {
      await db.runAsync(
        'INSERT INTO favoritos (id, usuarioId, lugarId, creadoEn) VALUES (?, ?, ?, ?)',
        [favorito.id, favorito.usuarioId, favorito.lugarId, favorito.creadoEn],
      );
    }
    console.log(`[favoritos] Reemplazados ${favoritos.length} de ${usuarioId}`);
  });
}
