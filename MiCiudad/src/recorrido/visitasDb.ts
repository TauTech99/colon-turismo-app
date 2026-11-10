// Dueño: D — Recorrido y audioguías
// Tabla visitas: alta local, pendientes de sync, marcar sincronizada.

import { abrirBase } from '@/compartido/db';
import type { OrigenVisita, Visita } from '@/tipos/visita';

// Lectura y escritura de la tabla `visitas`.
// Las columnas las creó compartido/db.ts (B). Este archivo
// NO hace CREATE TABLE: solo SELECT / INSERT.
//
// sincronizada: en SQLite es 0 o 1 (no hay boolean). Al leer
// lo pasamos a true/false. Al guardar una visita nueva va 0
// (false). La cola la marca 1 cuando el servicio acepta.

type FilaVisita = {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: string;
  fotoUri: string | null;
  nota: string | null;
  sincronizada: number;
};

// Misma cola que favoritos/eventos: si dos pantallas tocan la base
// a la vez, la segunda espera. Sin BEGIN (B ya usa transacciones).
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
      console.log(`[visitas] La base estaba ocupada. Reintento ${intento}.`);
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

function filaAVisita(fila: FilaVisita): Visita {
  return {
    id: fila.id,
    usuarioId: fila.usuarioId,
    lugarId: fila.lugarId,
    fechaHora: fila.fechaHora,
    origen: fila.origen as OrigenVisita,
    fotoUri: fila.fotoUri,
    nota: fila.nota,
    sincronizada: fila.sincronizada === 1,
  };
}

// Alta local. origen: manual | qr | gps. sincronizada suele ir en false.
// Si el id ya está (dos bajadas a la vez), no pisa la fila ni tira UNIQUE.
export async function insertarVisita(visita: Visita): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    const yaEsta = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM visitas WHERE id = ?',
      [visita.id],
    );
    if (yaEsta) {
      console.log(`[visitas] Ya estaba ${visita.id}, no se inserta de nuevo`);
      return;
    }
    await db.runAsync(
      `INSERT INTO visitas (
        id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visita.id,
        visita.usuarioId,
        visita.lugarId,
        visita.fechaHora,
        visita.origen,
        visita.fotoUri,
        visita.nota,
        visita.sincronizada ? 1 : 0,
      ],
    );
    console.log(`[visitas] Insertada ${visita.id} (${visita.origen})`);
  });
}

// Lista del usuario, más nueva primero. Sirve para comprobar que
// se guardó y la usa el timeline de Mi recorrido.
export async function obtenerVisitas(usuarioId: string): Promise<Visita[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<FilaVisita>(
      'SELECT * FROM visitas WHERE usuarioId = ? ORDER BY fechaHora DESC',
      [usuarioId],
    );
    return filas.map(filaAVisita);
  });
}

// Una sola visita, para la pantalla de detalle (visita/[id]).
export async function obtenerVisitaPorId(id: string): Promise<Visita | null> {
  return enFila(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaVisita>('SELECT * FROM visitas WHERE id = ?', [id]);
    return fila ? filaAVisita(fila) : null;
  });
}

// Cambia (uri nueva) o quita (null) la foto de una visita ya guardada.
// Vuelve a sincronizada = 0 para que la cola suba la fila nueva cuando haya red.
export async function actualizarFotoVisita(id: string, fotoUri: string | null): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('UPDATE visitas SET fotoUri = ?, sincronizada = 0 WHERE id = ?', [fotoUri, id]);
    console.log(`[visitas] Foto ${fotoUri ? 'cambiada' : 'quitada'}: ${id}`);
  });
}

// Pendientes de ESTA cuenta. Sin el usuario, la cola subiría las de
// otra persona con el login de quien está adentro ahora.
// Orden ASC: primero las más viejas (las del modo avión).
export async function leerVisitasPendientes(usuarioId: string): Promise<Visita[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<FilaVisita>(
      'SELECT * FROM visitas WHERE sincronizada = 0 AND usuarioId = ? ORDER BY fechaHora ASC',
      [usuarioId],
    );
    return filas.map(filaAVisita);
  });
}

// La cola llama esto después de un enviarVisita exitoso.
export async function marcarSincronizada(id: string): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('UPDATE visitas SET sincronizada = 1 WHERE id = ?', [id]);
    console.log(`[visitas] Marcada sincronizada: ${id}`);
  });
}
