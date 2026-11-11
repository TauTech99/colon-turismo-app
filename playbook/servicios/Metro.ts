// Metro: el servidor de Expo que le pasa el JavaScript a la app.

import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import { esperarHasta, leer } from './Http.ts';

export class Metro {
  private readonly terminal: Terminal;
  private readonly proyecto: Proyecto;
  readonly puerto: number;

  constructor(terminal: Terminal, proyecto: Proyecto, puerto: number) {
    this.terminal = terminal;
    this.proyecto = proyecto;
    this.puerto = puerto;
  }

  async estaCorriendo(): Promise<boolean> {
    // Mientras arma el bundle, Metro tarda en contestar.
    const estado = await leer(`http://127.0.0.1:${this.puerto}/status`, 5000);
    return estado?.includes('packager-status:running') ?? false;
  }

  esperarQueArranque(): Promise<boolean> {
    return esperarHasta(() => this.estaCorriendo(), 180_000);
  }

  // Toma la terminal: ahí se ven los errores y se puede apretar "r" para recargar.
  // `limpiarCache` hace falta cuando cambia el .env (Expo lo lee al arrancar).
  arrancar(limpiarCache: boolean): Promise<number> {
    const argumentos = ['expo', 'start', '--port', String(this.puerto)];
    if (limpiarCache) {
      argumentos.push('--clear');
    }
    return this.terminal.enPrimerPlano('npx', argumentos, { cwd: this.proyecto.carpetaApp });
  }
}
