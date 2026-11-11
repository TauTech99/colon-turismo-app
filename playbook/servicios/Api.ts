// La API de la cátedra (api-mi-ciudad): dependencias, datos de demo,
// levantarla y saber si responde.

import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { ProcesoDeFondo, Terminal } from '../nucleo/Terminal.ts';
import { esperarHasta, leer } from './Http.ts';

export class Api {
  private readonly terminal: Terminal;
  private readonly proyecto: Proyecto;

  constructor(terminal: Terminal, proyecto: Proyecto) {
    this.terminal = terminal;
    this.proyecto = proyecto;
  }

  get urlSalud(): string {
    return `http://127.0.0.1:${this.proyecto.puertoApi}/salud`;
  }

  async responde(): Promise<boolean> {
    return (await leer(this.urlSalud)) !== null;
  }

  async instalarDependencias(): Promise<boolean> {
    return (await this.terminal.ejecutar('pnpm', ['install'], { cwd: this.proyecto.carpetaApi })).codigo === 0;
  }

  // Borra la base y la vuelve a llenar con los usuarios, lugares y eventos de demo.
  async cargarDatosDeDemo(): Promise<boolean> {
    return (await this.terminal.ejecutar('pnpm', ['db:reiniciar'], { cwd: this.proyecto.carpetaApi })).codigo === 0;
  }

  async correrTests(): Promise<boolean> {
    return (await this.terminal.ejecutar('pnpm', ['test'], { cwd: this.proyecto.carpetaApi })).codigo === 0;
  }

  // `pnpm dev` queda corriendo de fondo; devuelve null si no llegó a responder.
  async levantar(): Promise<ProcesoDeFondo | null> {
    const registro = this.proyecto.registro('api.log');
    const proceso = this.terminal.enSegundoPlano('pnpm', ['dev'], registro, { cwd: this.proyecto.carpetaApi });
    if (this.terminal.simular) {
      return null;
    }
    const respondio = await esperarHasta(() => this.responde(), 120_000);
    if (!respondio) {
      proceso?.detener();
      return null;
    }
    return proceso;
  }
}
