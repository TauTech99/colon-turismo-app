// Dueño: B — Lugares y datos
// "Abierto ahora / Cerrado" con funciones puras (temporada, días cerrados).

import { relojEnColon } from '@/compartido/zonaColon';
import type { Horario, Lugar, Temporada } from '@/tipos/lugar';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export type ProximoCambio = {
  tipo: 'cierra' | 'abre';
  hora: string;
  dia: Horario['dia'];
};

// "verano" = 1 dic a 31 mar. "invierno" = 1 abr a 30 nov.
// Meses de temporada turística de Colón, en hora de Buenos Aires.
export function temporadaDe(fecha: Date): Exclude<Temporada, 'todoElAnio'> {
  const mes = relojEnColon(fecha).mes;
  if (mes === 12 || mes <= 3) {
    return 'verano';
  }
  return 'invierno';
}

function temporadaDeFila(temporada: string): string {
  if (temporada === 'todo-el-anio' || temporada === 'todoElAnio') {
    return 'todoElAnio';
  }
  return temporada;
}

// Una fila vale si no trae temporada (la API ya recortó), si es de
// todo el año, o si coincide con la temporada de hoy.
export function horarioValeEn(horario: Horario, fecha: Date): boolean {
  if (horario.temporada == null) {
    return true;
  }
  const temporada = temporadaDeFila(horario.temporada);
  if (temporada === 'todoElAnio') {
    return true;
  }
  return temporada === temporadaDe(fecha);
}

// Filas de horario que aplican hoy (todoElAnio o la temporada actual).
export function horariosVigentes(lugar: Lugar, ahora: Date): Horario[] {
  return lugar.horarios.filter((horario) => horarioValeEn(horario, ahora));
}

// "09:00" → 540 minutos desde las 00:00. Así se comparan horas como números.
function minutosDesdeMedianoche(hora: string): number {
  const [horasTexto, minutosTexto] = hora.split(':');
  const horas = Number(horasTexto);
  const minutos = Number(minutosTexto);
  return horas * 60 + minutos;
}

function minutosDelDia(fecha: Date): number {
  const reloj = relojEnColon(fecha);
  return reloj.horas * 60 + reloj.minutos;
}

// Un tramo cruza la medianoche si cierra "antes" de abrir: 20:30 a 01:00.
// También cubre "00:00" en cierra (medianoche = fin del día).
function cruzaMedianoche(horario: Horario): boolean {
  return minutosDesdeMedianoche(horario.cierra) <= minutosDesdeMedianoche(horario.abre);
}

// Si cruza, el cierre cae al día siguiente: se le suman 24 h (1440 min).
// 01:00 → 1500. Así, el viernes a las 22:00 la parrilla no queda "Cerrado".
function minutosCierre(horario: Horario): number {
  const cierre = minutosDesdeMedianoche(horario.cierra);
  return cruzaMedianoche(horario) ? cierre + 24 * 60 : cierre;
}

function estaEnFranja(minutos: number, horario: Horario): boolean {
  return minutos >= minutosDesdeMedianoche(horario.abre) && minutos < minutosCierre(horario);
}

// La franja abierta ahora: una de hoy, o la de ayer que cruzó la medianoche
// (sábado 00:30 sigue abierto el tramo del viernes 20:30 a 01:00).
function franjaAbierta(lugar: Lugar, ahora: Date): Horario | null {
  const vigentes = horariosVigentes(lugar, ahora);
  const dia = relojEnColon(ahora).diaSemana;
  const minutos = minutosDelDia(ahora);

  const deHoy = vigentes.find((horario) => horario.dia === dia && estaEnFranja(minutos, horario));
  if (deHoy) {
    return deHoy;
  }

  const ayer = (dia + 6) % 7;
  const deAyer = vigentes.find(
    (horario) =>
      horario.dia === ayer &&
      cruzaMedianoche(horario) &&
      minutos < minutosDesdeMedianoche(horario.cierra),
  );
  return deAyer ?? null;
}

// Función pura: mismos argumentos → mismo resultado.
// No mira el reloj sola: recibe `ahora` para poder probarla con cualquier fecha.
export function estaAbiertoAhora(lugar: Lugar, ahora: Date): boolean {
  if (!lugar.activo) {
    return false;
  }

  return franjaAbierta(lugar, ahora) !== null;
}

// Si está abierto: a qué hora cierra esta franja.
// Si está cerrado: cuándo abre de nuevo (hoy o en otro día).
// Si no hay horarios: null.
export function proximoCambio(lugar: Lugar, ahora: Date): ProximoCambio | null {
  const vigentes = horariosVigentes(lugar, ahora);
  if (vigentes.length === 0) {
    return null;
  }

  const dia = relojEnColon(ahora).diaSemana;
  const minutos = minutosDelDia(ahora);
  const deHoy = vigentes.filter((horario) => horario.dia === dia);

  const franjaActual = franjaAbierta(lugar, ahora);
  if (franjaActual) {
    return { tipo: 'cierra', hora: franjaActual.cierra, dia };
  }

  const abreMasTardeHoy = deHoy
    .filter((horario) => minutosDesdeMedianoche(horario.abre) > minutos)
    .sort((a, b) => minutosDesdeMedianoche(a.abre) - minutosDesdeMedianoche(b.abre))[0];

  if (abreMasTardeHoy) {
    return { tipo: 'abre', hora: abreMasTardeHoy.abre, dia };
  }

  for (let suma = 1; suma <= 7; suma += 1) {
    const diaFuturo = ((dia + suma) % 7) as Horario['dia'];
    const primero = vigentes
      .filter((horario) => horario.dia === diaFuturo)
      .sort((a, b) => minutosDesdeMedianoche(a.abre) - minutosDesdeMedianoche(b.abre))[0];

    if (primero) {
      return { tipo: 'abre', hora: primero.abre, dia: diaFuturo };
    }
  }

  return null;
}

// El renglón que pide el wireframe: "Abierto ahora - cierra 19:00" / "Cerrado".
// Lista vacía = cerrado: la API ya recortó la temporada (playas en invierno)
// o el lugar no abre nunca por horario (Anfiteatro).
export function textoEstadoHorario(lugar: Lugar, ahora: Date): string {
  if (!lugar.activo) {
    return 'Cerrado';
  }
  if (estaAbiertoAhora(lugar, ahora)) {
    const cambio = proximoCambio(lugar, ahora);
    if (cambio?.tipo === 'cierra') {
      return `Abierto ahora - cierra ${cambio.hora}`;
    }
    return 'Abierto ahora';
  }
  return 'Cerrado';
}

// Versión corta para tarjetas y listas. Mismo criterio que textoEstadoHorario.
export type EstadoCorto = 'abierto' | 'cerrado';

export function estadoCorto(lugar: Lugar, ahora: Date): EstadoCorto {
  return estaAbiertoAhora(lugar, ahora) ? 'abierto' : 'cerrado';
}

// Lista para leer debajo del estado. Filas vigentes (sin filtrar si no hay temporada).
export function renglonesHorario(lugar: Lugar, ahora: Date): string[] {
  const vigentes = horariosVigentes(lugar, ahora).slice().sort((a, b) => {
    if (a.dia !== b.dia) {
      return a.dia - b.dia;
    }
    return minutosDesdeMedianoche(a.abre) - minutosDesdeMedianoche(b.abre);
  });

  if (vigentes.length === 0) {
    return [];
  }

  const porDia: { dia: number; horas: string }[] = [];
  for (let dia = 0; dia <= 6; dia += 1) {
    const franjas = vigentes.filter((horario) => horario.dia === dia);
    if (franjas.length === 0) {
      continue;
    }
    porDia.push({
      dia,
      horas: franjas.map((horario) => `${horario.abre} – ${horario.cierra}`).join(' y '),
    });
  }

  const primeraHoras = porDia[0]?.horas;
  const todasIguales =
    porDia.length === 7 && porDia.every((item) => item.horas === primeraHoras);

  if (todasIguales && primeraHoras) {
    return [`Todos los días ${primeraHoras}`];
  }

  return porDia.map((item) => `${NOMBRES_DIA[item.dia]} ${item.horas}`);
}
