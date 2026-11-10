// Dueño: B — Lugares y datos
// Caché SQLite del catálogo: con red guarda, sin red lee.

import { abrirBase } from '@/compartido/db';
import type { Categoria } from '@/tipos/categoria';
import type { Audioguia, Horario, Lugar } from '@/tipos/lugar';

// Lectura y escritura de las tablas `lugares` y `categorias`.
// Las tablas las crea compartido/db.ts. Este archivo no
// hace CREATE TABLE: solo guarda el catálogo y lo vuelve a leer.

// Una fila de la tabla, tal como la devuelve SQLite.
// imagenes, horarios y audioguia son texto JSON (SQLite no tiene
// arrays ni objetos). accesible y activo son 0 o 1.
type FilaLugar = {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcionCorta: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion: string;
  imagenes: string;
  horarios: string;
  telefono: string | null;
  sitioWeb: string | null;
  precioEntrada: number | null;
  audioguia: string | null;
  codigoQr: string | null;
  accesible: number;
  activo: number;
  actualizadoEn: string;
};

type FilaCategoria = {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
};

// Los `?` no pegan el texto adentro del SQL: expo-sqlite los reemplaza.
// Así un nombre con comillas no rompe la consulta.
const SQL_INSERTAR_LUGAR = `
  INSERT INTO lugares (
    id, nombre, categoriaId, descripcionCorta, descripcion,
    latitud, longitud, direccion, imagenes, horarios,
    telefono, sitioWeb, precioEntrada, audioguia, codigoQr,
    accesible, activo, actualizadoEn
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const SQL_ACTUALIZAR_LUGAR = `
  UPDATE lugares SET
    nombre = ?,
    categoriaId = ?,
    descripcionCorta = ?,
    descripcion = ?,
    latitud = ?,
    longitud = ?,
    direccion = ?,
    imagenes = ?,
    horarios = ?,
    telefono = ?,
    sitioWeb = ?,
    precioEntrada = ?,
    audioguia = ?,
    codigoQr = ?,
    accesible = ?,
    activo = ?,
    actualizadoEn = ?
  WHERE id = ?
`;

// Si Buscar y el detalle tocan la base a la vez, el segundo espera.
// Si no, un BEGIN queda adentro de otro BEGIN, o un SELECT ve la tabla
// a medias (el DELETE ya corrió y los INSERT todavía no).
let cola: Promise<unknown> = Promise.resolve();

function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

function parametrosLugar(lugar: Lugar): (string | number | null)[] {
  return [
    lugar.id,
    lugar.nombre,
    lugar.categoriaId,
    lugar.descripcionCorta,
    lugar.descripcion,
    lugar.coordenadas.latitud,
    lugar.coordenadas.longitud,
    lugar.direccion,
    JSON.stringify(lugar.imagenes),
    JSON.stringify(lugar.horarios),
    lugar.telefono,
    lugar.sitioWeb,
    lugar.precioEntrada,
    lugar.audioguia ? JSON.stringify(lugar.audioguia) : null,
    lugar.codigoQr,
    lugar.accesible ? 1 : 0,
    lugar.activo ? 1 : 0,
    lugar.actualizadoEn,
  ];
}

function filaALugar(fila: FilaLugar): Lugar {
  return {
    id: fila.id,
    nombre: fila.nombre,
    categoriaId: fila.categoriaId,
    descripcionCorta: fila.descripcionCorta,
    descripcion: fila.descripcion,
    coordenadas: { latitud: fila.latitud, longitud: fila.longitud },
    direccion: fila.direccion,
    imagenes: JSON.parse(fila.imagenes) as string[],
    horarios: JSON.parse(fila.horarios) as Horario[],
    telefono: fila.telefono,
    sitioWeb: fila.sitioWeb,
    precioEntrada: fila.precioEntrada,
    audioguia: fila.audioguia ? (JSON.parse(fila.audioguia) as Audioguia) : null,
    codigoQr: fila.codigoQr,
    accesible: fila.accesible === 1,
    activo: fila.activo === 1,
    actualizadoEn: fila.actualizadoEn,
  };
}

export async function leerLugares(): Promise<Lugar[]> {
  return enFila(async () => {
    const db = await abrirBase();
    // rowid es el número interno de la fila. Al insertar en el orden
    // del servicio, el listado queda igual que el mock.
    const filas = await db.getAllAsync<FilaLugar>('SELECT * FROM lugares ORDER BY rowid');
    return filas.map(filaALugar);
  });
}

export async function leerLugarPorId(id: string): Promise<Lugar | null> {
  return enFila(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaLugar>('SELECT * FROM lugares WHERE id = ?', [id]);
    if (!fila) {
      return null;
    }
    return filaALugar(fila);
  });
}

// Reemplaza el catálogo entero. Una lista vacía borra lo guardado
// (es la respuesta "vacío" del servicio, no un error de red).
export async function guardarLugares(lugares: Lugar[]): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM lugares');
      for (const lugar of lugares) {
        await db.runAsync(SQL_INSERTAR_LUGAR, parametrosLugar(lugar));
      }
    });
    console.log(`[cache] Lugares guardados: ${lugares.length}`);
  });
}

// Un solo lugar (el detalle). Si ya estaba, se actualiza y no se
// mueve de lugar en la lista: UPDATE no cambia el rowid.
export async function guardarLugar(lugar: Lugar): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    const yaEsta = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM lugares WHERE id = ?',
      [lugar.id],
    );
    if (yaEsta) {
      // parametrosLugar empieza con el id. El UPDATE no cambia el id:
      // lo demás va al SET, y el id va al final (el WHERE).
      const valores = parametrosLugar(lugar);
      const sinId = valores.slice(1);
      await db.runAsync(SQL_ACTUALIZAR_LUGAR, [...sinId, lugar.id]);
    } else {
      await db.runAsync(SQL_INSERTAR_LUGAR, parametrosLugar(lugar));
    }
    console.log(`[cache] Lugar guardado: ${lugar.id}`);
  });
}

export async function leerCategorias(): Promise<Categoria[]> {
  return enFila(async () => {
    const db = await abrirBase();
    const filas = await db.getAllAsync<FilaCategoria>(
      'SELECT * FROM categorias ORDER BY orden',
    );
    return filas;
  });
}

export async function guardarCategorias(categorias: Categoria[]): Promise<void> {
  await enFila(async () => {
    const db = await abrirBase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM categorias');
      for (const categoria of categorias) {
        await db.runAsync(
          'INSERT INTO categorias (id, nombre, icono, color, orden) VALUES (?, ?, ?, ?, ?)',
          [categoria.id, categoria.nombre, categoria.icono, categoria.color, categoria.orden],
        );
      }
    });
    console.log(`[cache] Categorías guardadas: ${categorias.length}`);
  });
}
