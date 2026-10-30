// Reloj de Colón (America/Argentina/Buenos_Aires).
// Horarios, temporada y agenda tienen que usar esta zona, no la del teléfono:
// un turista de Brasil o un emulador en UTC verían mal "abierto ahora".

export const ZONA_COLON = 'America/Argentina/Buenos_Aires';

export type RelojColon = {
  anio: number;
  mes: number;
  diaMes: number;
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  horas: number;
  minutos: number;
};

const DIA_CORTO: Record<string, RelojColon['diaSemana']> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function valorParte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return partes.find((parte) => parte.type === tipo)?.value ?? '';
}

export function relojEnColon(fecha: Date): RelojColon {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_COLON,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(fecha);

  const horasCrudas = Number(valorParte(partes, 'hour'));
  return {
    anio: Number(valorParte(partes, 'year')),
    mes: Number(valorParte(partes, 'month')),
    diaMes: Number(valorParte(partes, 'day')),
    diaSemana: DIA_CORTO[valorParte(partes, 'weekday')] ?? 0,
    horas: horasCrudas === 24 ? 0 : horasCrudas,
    minutos: Number(valorParte(partes, 'minute')),
  };
}

export function claveDiaEnColon(valor: string | Date): string {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_COLON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

export function comienzoDelDiaColon(clave: string): Date {
  return new Date(`${clave}T00:00:00-03:00`);
}
