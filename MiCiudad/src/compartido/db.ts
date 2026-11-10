// Dueño: B — Lugares y datos
// Una sola base SQLite (miciudad.db) + migraciones de todas las tablas.
// Cada dominio escribe en SU *Db.ts (lugares/favoritos/eventos/visitas);
// nadie más abre otro .db. Tabla nueva = PR a este archivo (aprueba B).

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const NOMBRE_BASE = 'miciudad.db';

// Cada vez que cambie el esquema (agregar columna o tabla) se sube
// este número y se agrega un bloque `if (versionActual === N)` abajo.
export const VERSION_BASE = 1;

let base: SQLiteDatabase | null = null;
let promesaApertura: Promise<SQLiteDatabase> | null = null;

// La llaman el layout al abrir la app y, más adelante, los *Db.ts
// y las tareas en segundo plano (no pueden usar hooks de React).
// Si ya está abierta, devuelve la misma. Si dos partes piden a la
// vez, las dos esperan la misma promesa: no se abre dos veces.
export function abrirBase(): Promise<SQLiteDatabase> {
  if (base) {
    return Promise.resolve(base);
  }
  if (!promesaApertura) {
    promesaApertura = abrirPorPrimeraVez();
  }
  return promesaApertura;
}

// Para cuando ya se abrió (el layout ya corrió). Si alguien la pide
// antes, es un error nuestro, no del usuario.
export function obtenerBase(): SQLiteDatabase {
  if (!base) {
    throw new Error('La base todavía no se abrió. Llamá a abrirBase() al iniciar la app.');
  }
  return base;
}

async function abrirPorPrimeraVez(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(NOMBRE_BASE);
  await migrarSiHaceFalta(db);
  base = db;
  await registrarTablasEnConsola(db);
  return db;
}

async function migrarSiHaceFalta(db: SQLiteDatabase): Promise<void> {
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versionActual = fila?.user_version ?? 0;

  console.log(`[db] Base abierta: ${NOMBRE_BASE}`);

  if (versionActual >= VERSION_BASE) {
    console.log(`[db] Versión: ${versionActual}. Ya estaba actualizada, no hay que migrar.`);
    return;
  }

  if (versionActual === 0) {
    // WAL = Write-Ahead Logging: las lecturas no se bloquean tanto
    // cuando alguien está escribiendo. Lo recomienda la doc de expo-sqlite.
    await db.execAsync(`PRAGMA journal_mode = 'wal';`);

    await db.execAsync(`
      CREATE TABLE categorias (
        id TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL,
        icono TEXT NOT NULL,
        color TEXT NOT NULL,
        orden INTEGER NOT NULL
      );

      CREATE TABLE lugares (
        id TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL,
        categoriaId TEXT NOT NULL,
        descripcionCorta TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        direccion TEXT NOT NULL,
        imagenes TEXT NOT NULL,
        horarios TEXT NOT NULL,
        telefono TEXT,
        sitioWeb TEXT,
        precioEntrada REAL,
        audioguia TEXT,
        codigoQr TEXT,
        accesible INTEGER NOT NULL,
        activo INTEGER NOT NULL,
        actualizadoEn TEXT NOT NULL
      );

      CREATE TABLE eventos (
        id TEXT PRIMARY KEY NOT NULL,
        titulo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        lugarId TEXT,
        direccionLibre TEXT,
        latitud REAL,
        longitud REAL,
        inicio TEXT NOT NULL,
        fin TEXT,
        imagenUrl TEXT,
        precio REAL,
        estado TEXT NOT NULL
      );

      CREATE TABLE eventos_guardados (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT NOT NULL,
        eventoId TEXT NOT NULL,
        creadoEn TEXT NOT NULL,
        UNIQUE (usuarioId, eventoId)
      );

      CREATE TABLE favoritos (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT NOT NULL,
        lugarId TEXT NOT NULL,
        creadoEn TEXT NOT NULL,
        UNIQUE (usuarioId, lugarId)
      );

      CREATE TABLE visitas (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT NOT NULL,
        lugarId TEXT NOT NULL,
        fechaHora TEXT NOT NULL,
        origen TEXT NOT NULL,
        fotoUri TEXT,
        nota TEXT,
        sincronizada INTEGER NOT NULL
      );
    `);

    versionActual = 1;
  }

  // if (versionActual === 1) {
  //   Acá van las migraciones futuras (una tabla o columna nueva).
  // }

  await db.execAsync(`PRAGMA user_version = ${VERSION_BASE}`);
  console.log(`[db] Versión: 0 → ${VERSION_BASE}. Se crearon las tablas.`);
}

async function registrarTablasEnConsola(db: SQLiteDatabase): Promise<void> {
  const filas = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name != 'android_metadata'
     ORDER BY name`,
  );
  const nombres = filas.map((fila) => fila.name).join(', ');
  console.log(`[db] Tablas: ${nombres}`);
}
