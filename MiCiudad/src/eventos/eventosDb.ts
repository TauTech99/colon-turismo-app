// Dueño: C — Mapa y agenda
// Caché SQLite de eventos + eventos guardados (Avisarme).

import { abrirBase } from '@/compartido/db';
import type { EstadoEvento, Evento } from '@/tipos/evento';

// Lectura y escritura de las tablas `eventos` (caché) y
// `eventos_guardados` (esta persona guardó este evento).
// Las columnas las creó compartido/db.ts (B). Este archivo
// NO hace CREATE TABLE.
//
// Por qué SQLite: si la persona ya abrió la agenda con red, después
// tiene que ver los eventos sin señal.
// `eventos_guardados` es otra cosa: "yo quiero que me avisen".

type FilaEvento = {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  latitud: number | null;
  longitud: number | null;
  inicio: string;
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: string;
};

// Si la agenda y el catálogo de B tocan la base a la vez, el segundo
// espera. No usamos BEGIN (withTransactionAsync): B guarda lugares
// con una transacción. SQLite no deja dos a la vez
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
      console.log(`[eventos] La base estaba ocupada. Reintento ${intento}.`);
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

const SQL_REEMPLAZAR = `
  INSERT OR REPLACE INTO eventos (
    id, titulo, descripcion, lugarId, direccionLibre,
    latitud, longitud, inicio, fin, imagenUrl, precio, estado
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function parametrosEvento(evento: Evento): (string | number | null)[] {
  return [
    evento.id,
    evento.titulo,
    evento.descripcion,
    evento.lugarId,
    evento.direccionLibre,
    evento.coordenadas?.latitud ?? null,
    evento.coordenadas?.longitud ?? null,
    evento.inicio,
    evento.fin,
    evento.imagenUrl,
    evento.precio,
    evento.estado,
  ];
}

function filaAEvento(fila: FilaEvento): Evento {
  const hayCoordenadas = fila.latitud !== null && fila.longitud !== null;

  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugarId: fila.lugarId,
    direccionLibre: fila.direccionLibre,
    coordenadas: hayCoordenadas
      ? { latitud: fila.latitud as number, longitud: fila.longitud as number }
      : null,
    inicio: fila.inicio,
    fin: fila.fin,
    imagenUrl: fila.imagenUrl,
    precio: fila.precio,
    estado: fila.estado as EstadoEvento,
  };
}

export async function leerEventos(): Promise<Evento[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<FilaEvento>('SELECT * FROM eventos ORDER BY inicio');
    return filas.map(filaAEvento);
  });
}

export async function leerEventoPorId(id: string): Promise<Evento | null> {
  return enFila(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaEvento>('SELECT * FROM eventos WHERE id = ?', [id]);
    if (!fila) {
      return null;
    }
    return filaAEvento(fila);
  });
}

// Reemplaza el caché entero. Una lista vacía borra lo guardado
// (es la respuesta "vacío" del servicio, no un error de red).
// Escrituras sueltas: un DELETE y varios INSERT, sin BEGIN.
export async function guardarEventos(eventos: Evento[]): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('DELETE FROM eventos');
    for (const evento of eventos) {
      await db.runAsync(SQL_REEMPLAZAR, parametrosEvento(evento));
    }
    console.log(`[cache] Eventos guardados: ${eventos.length}`);
  });
}

// Un solo evento (el detalle). INSERT OR REPLACE = una sola sentencia.
export async function guardarEvento(evento: Evento): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync(SQL_REEMPLAZAR, parametrosEvento(evento));
    console.log(`[cache] Evento guardado: ${evento.id}`);
  });
}

// --- eventos_guardados ---
// "Esta persona quiere que le avisen de este evento".
// No es el caché de la agenda. La tabla la crea compartido/db.ts.
// UNIQUE (usuarioId, eventoId): no se inserta dos veces.

type FilaEventoGuardado = {
  id: string;
  usuarioId: string;
  eventoId: string;
  creadoEn: string;
};

export type EventoGuardado = FilaEventoGuardado;

export async function leerIdsEventosGuardados(): Promise<string[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<{ eventoId: string }>(
      'SELECT eventoId FROM eventos_guardados',
    );
    return filas.map((fila) => fila.eventoId);
  });
}

export async function leerEventosGuardados(usuarioId: string): Promise<EventoGuardado[]> {
  return enFila(async () => {
    const db = await abrirBase();
    return db.getAllAsync<EventoGuardado>(
      'SELECT * FROM eventos_guardados WHERE usuarioId = ?',
      [usuarioId],
    );
  });
}

export async function leerEventoGuardado(
  usuarioId: string,
  eventoId: string,
): Promise<EventoGuardado | null> {
  return enFila(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaEventoGuardado>(
      'SELECT * FROM eventos_guardados WHERE usuarioId = ? AND eventoId = ?',
      [usuarioId, eventoId],
    );
    return fila ?? null;
  });
}

export async function insertarEventoGuardado(fila: EventoGuardado): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync(
      'INSERT OR IGNORE INTO eventos_guardados (id, usuarioId, eventoId, creadoEn) VALUES (?, ?, ?, ?)',
      [fila.id, fila.usuarioId, fila.eventoId, fila.creadoEn],
    );
    console.log(`[eventos] Guardado ${fila.eventoId} de ${fila.usuarioId}`);
  });
}

export async function borrarEventoGuardado(usuarioId: string, eventoId: string): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.runAsync('DELETE FROM eventos_guardados WHERE usuarioId = ? AND eventoId = ?', [
      usuarioId,
      eventoId,
    ]);
    console.log(`[eventos] Quitado ${eventoId} de ${usuarioId}`);
  });
}
