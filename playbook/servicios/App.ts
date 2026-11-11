// La app Expo (MiCiudad): dependencias, tests y el build de desarrollo
// que se instala en el celular o el emulador.

import { existsSync } from 'node:fs';

import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { Terminal } from '../nucleo/Terminal.ts';

export class App {
  private readonly terminal: Terminal;
  private readonly proyecto: Proyecto;
  private readonly plataforma: Plataforma;

  constructor(terminal: Terminal, proyecto: Proyecto, plataforma: Plataforma) {
    this.terminal = terminal;
    this.proyecto = proyecto;
    this.plataforma = plataforma;
  }

  async instalarDependencias(): Promise<boolean> {
    return (await this.terminal.ejecutar('npm', ['install'], { cwd: this.proyecto.carpetaApp })).codigo === 0;
  }

  async correrTests(): Promise<boolean> {
    return (await this.terminal.ejecutar('npm', ['test'], { cwd: this.proyecto.carpetaApp })).codigo === 0;
  }

  // Compila con Gradle (JDK 17) solo para la arquitectura de ese equipo:
  // tarda bastante menos que compilar las cuatro.
  async compilarEInstalar(serial: string, arquitectura: string): Promise<{ ok: boolean; firmaDistinta: boolean }> {
    if (!existsSync(this.proyecto.carpetaAndroid)) {
      const generado = await this.terminal.ejecutar('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
        cwd: this.proyecto.carpetaApp,
      });
      if (generado.codigo !== 0) {
        return { ok: false, firmaDistinta: false };
      }
    }

    const { codigo, salida } = await this.terminal.ejecutar(
      this.plataforma.gradlew(this.proyecto.carpetaAndroid),
      ['app:installDebug', `-PreactNativeArchitectures=${arquitectura}`],
      { cwd: this.proyecto.carpetaAndroid, env: { ANDROID_SERIAL: serial } },
    );
    return { ok: codigo === 0, firmaDistinta: salida.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE') };
  }
}
