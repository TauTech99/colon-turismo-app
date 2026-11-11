// Qué Java usa Gradle. El proyecto compila con JDK 17.

import { join } from 'node:path';

import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';

export const VERSION_JAVA_DEL_PROYECTO = 17;

export class Java {
  private readonly terminal: Terminal;
  private readonly programa: string;

  constructor(terminal: Terminal, plataforma: Plataforma) {
    this.terminal = terminal;
    // Gradle usa JAVA_HOME si está definida; si no, el java del PATH.
    this.programa = process.env.JAVA_HOME
      ? join(process.env.JAVA_HOME, 'bin', plataforma.ejecutable('java'))
      : 'java';
  }

  async version(): Promise<number | null> {
    const { codigo, salida } = await this.terminal.consultar(this.programa, ['-version']);
    const coincide = salida.match(/version "(\d+)(?:\.(\d+))?/);
    if (codigo !== 0 || !coincide) {
      return null;
    }
    const principal = Number(coincide[1]);
    return principal === 1 ? Number(coincide[2]) : principal;
  }
}
