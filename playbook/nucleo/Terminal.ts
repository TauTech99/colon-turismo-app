// Corre programas externos (npm, adb, gradle…) igual en Windows y Linux.
// Cada comando que cambia algo se muestra antes de correrlo; con
// --simular solo se muestra.

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import type { Consola } from './Consola.ts';
import type { Plataforma } from './Plataforma.ts';

export type Opciones = {
  cwd?: string;
  env?: Record<string, string>;
  // Para comandos con respuesta técnica que no aporta (adb monkey, geo fix).
  sinSalida?: boolean;
  // Lo que se le "escribe" al programa cuando pregunta (avdmanager pregunta por el hardware).
  entrada?: string;
};

export type Resultado = { codigo: number; salida: string };

export class ProcesoDeFondo {
  private readonly proceso: ChildProcess;
  private readonly plataforma: Plataforma;

  constructor(proceso: ChildProcess, plataforma: Plataforma) {
    this.proceso = proceso;
    this.plataforma = plataforma;
  }

  get sigueVivo(): boolean {
    return this.proceso.exitCode === null && !this.proceso.killed;
  }

  // Corta también a los hijos (pnpm → nest → node).
  detener(): void {
    const pid = this.proceso.pid;
    if (!pid || !this.sigueVivo) {
      return;
    }
    if (this.plataforma.esWindows) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    }
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      this.proceso.kill('SIGTERM');
    }
  }
}

export class Terminal {
  private readonly consola: Consola;
  private readonly plataforma: Plataforma;
  readonly simular: boolean;

  constructor(consola: Consola, plataforma: Plataforma, simular: boolean) {
    this.consola = consola;
    this.plataforma = plataforma;
    this.simular = simular;
  }

  // Para cuando un paso son varios comandos: se muestra uno que los resume.
  mostrar(comando: string): void {
    this.consola.porDetras(comando);
  }

  // Solo lee (versiones, dispositivos…): corre siempre, sin mostrarse.
  consultar(programa: string, argumentos: string[], opciones: Opciones = {}): Promise<Resultado> {
    return this.correr(programa, argumentos, opciones, false);
  }

  // Cambia algo: se muestra y la salida se ve en vivo.
  async ejecutar(programa: string, argumentos: string[], opciones: Opciones = {}): Promise<Resultado> {
    this.consola.porDetras(this.comoTexto(programa, argumentos, opciones));
    if (this.simular) {
      return { codigo: 0, salida: '' };
    }
    return this.correr(programa, argumentos, opciones, !opciones.sinSalida);
  }

  // Para procesos largos (la API): la salida va a un archivo de registro.
  enSegundoPlano(
    programa: string,
    argumentos: string[],
    archivoRegistro: string,
    opciones: Opciones = {},
  ): ProcesoDeFondo | null {
    this.consola.porDetras(`${this.comoTexto(programa, argumentos, opciones)}  ${this.consola.tenue(`(registro: ${archivoRegistro})`)}`);
    if (this.simular) {
      return null;
    }
    mkdirSync(dirname(archivoRegistro), { recursive: true });
    const registro = createWriteStream(archivoRegistro, { flags: 'w' });
    const proceso = this.lanzar(programa, argumentos, opciones, ['ignore', 'pipe', 'pipe'], !this.plataforma.esWindows);
    proceso.stdout?.pipe(registro);
    proceso.stderr?.pipe(registro);
    return new ProcesoDeFondo(proceso, this.plataforma);
  }

  // Para lo que usa el teclado (Metro): toma la terminal hasta que termina.
  enPrimerPlano(programa: string, argumentos: string[], opciones: Opciones = {}): Promise<number> {
    this.consola.porDetras(this.comoTexto(programa, argumentos, opciones));
    if (this.simular) {
      return Promise.resolve(0);
    }
    this.consola.liberarTeclado();
    const proceso = this.lanzar(programa, argumentos, opciones, 'inherit', false);
    return new Promise((resolver) => {
      proceso.on('close', (codigo) => resolver(codigo ?? 0));
      proceso.on('error', () => resolver(1));
    });
  }

  // Abre algo y se olvida (navegador, emulador, scrcpy).
  soltar(programa: string, argumentos: string[], opciones: Opciones = {}): void {
    this.consola.porDetras(this.comoTexto(programa, argumentos, opciones));
    if (this.simular) {
      return;
    }
    const proceso = this.lanzar(programa, argumentos, opciones, 'ignore', true);
    proceso.on('error', (error) => this.consola.error(`No se pudo abrir ${programa}: ${error.message}`));
    proceso.unref();
  }

  async existe(programa: string): Promise<boolean> {
    const buscador = this.plataforma.esWindows ? 'where' : 'which';
    const { codigo } = await this.consultar(buscador, [programa]);
    return codigo === 0;
  }

  private correr(programa: string, argumentos: string[], opciones: Opciones, mostrar: boolean): Promise<Resultado> {
    return new Promise((resolver) => {
      let salida = '';
      const entrada = opciones.entrada === undefined ? 'ignore' : 'pipe';
      const proceso = this.lanzar(programa, argumentos, opciones, [entrada, 'pipe', 'pipe'], false);
      if (opciones.entrada !== undefined) {
        proceso.stdin?.end(opciones.entrada);
      }
      const juntar = (parte: Buffer) => {
        const texto = parte.toString();
        salida += texto;
        if (mostrar) {
          process.stdout.write(texto);
        }
      };
      proceso.stdout?.on('data', juntar);
      proceso.stderr?.on('data', juntar);
      proceso.on('error', (error) => resolver({ codigo: 127, salida: error.message }));
      proceso.on('close', (codigo) => resolver({ codigo: codigo ?? 1, salida }));
    });
  }

  // Windows no corre los .cmd (npm, npx, pnpm, gradlew.bat) sin shell.
  private lanzar(
    programa: string,
    argumentos: string[],
    opciones: Opciones,
    stdio: 'inherit' | 'ignore' | Array<'ignore' | 'pipe'>,
    separado: boolean,
  ): ChildProcess {
    const env = { ...process.env, ...opciones.env };
    const usarShell = this.plataforma.esWindows && !/\.exe$/i.test(programa);
    if (usarShell) {
      const linea = [programa, ...argumentos].map((parte) => this.citar(parte)).join(' ');
      return spawn(linea, { cwd: opciones.cwd, env, stdio, shell: true, detached: separado, windowsHide: true });
    }
    return spawn(programa, argumentos, { cwd: opciones.cwd, env, stdio, detached: separado, windowsHide: true });
  }

  private citar(parte: string): string {
    return /[\s"&|<>^();,]/.test(parte) ? `"${parte.replace(/"/g, '""')}"` : parte;
  }

  private comoTexto(programa: string, argumentos: string[], opciones: Opciones): string {
    const variables = Object.entries(opciones.env ?? {})
      .map(([clave, valor]) => `${clave}=${valor}`)
      .join(' ');
    const lugar = opciones.cwd ? this.consola.tenue(`   (en ${opciones.cwd})`) : '';
    // "adb" se lee mejor que la ruta completa al adb.exe del SDK.
    const nombre = basename(programa).replace(/\.exe$/i, '');
    return `${variables ? `${variables} ` : ''}${[nombre, ...argumentos].map((p) => this.citar(p)).join(' ')}${lugar}`;
  }
}
