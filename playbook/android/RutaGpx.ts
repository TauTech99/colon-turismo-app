// La ruta de Colón (playbook/gps/colon-recorrido.gpx): los 23 lugares de
// los datos de demo como puntos con nombre, unidos por un recorrido.

import { readFileSync } from 'node:fs';

export type Punto = { nombre: string; latitud: number; longitud: number };

export class RutaGpx {
  readonly archivo: string;
  readonly lugares: Punto[];

  constructor(archivo: string) {
    this.archivo = archivo;
    const texto = readFileSync(archivo, 'utf8');
    this.lugares = [...texto.matchAll(/<wpt lat="([-\d.]+)" lon="([-\d.]+)">\s*<name>([^<]*)<\/name>/g)].map((m) => ({
      latitud: Number(m[1]),
      longitud: Number(m[2]),
      nombre: m[3].replace(/&amp;/g, '&'),
    }));
  }

  buscar(texto: string): Punto | undefined {
    const buscado = texto.toLowerCase();
    return this.lugares.find((lugar) => lugar.nombre.toLowerCase().includes(buscado));
  }
}
