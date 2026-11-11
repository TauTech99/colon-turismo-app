// sdkmanager (baja imágenes de Android) y avdmanager (crea emuladores),
// de las "Command-line Tools" del SDK.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';

export class HerramientasSdk {
  private readonly terminal: Terminal;
  private readonly sdk: string | null;
  private readonly carpetaHerramientas: string | null;
  private readonly plataforma: Plataforma;

  constructor(terminal: Terminal, plataforma: Plataforma) {
    this.terminal = terminal;
    this.plataforma = plataforma;
    this.sdk = plataforma.carpetaSdkAndroid();
    const carpeta = this.sdk ? join(this.sdk, 'cmdline-tools', 'latest', 'bin') : null;
    this.carpetaHerramientas = carpeta && existsSync(carpeta) ? carpeta : null;
  }

  get disponibles(): boolean {
    return this.carpetaHerramientas !== null;
  }

  // "system-images;android-36;google_apis_playstore;x86_64" → ¿está la carpeta?
  imagenInstalada(paquete: string): boolean {
    return this.sdk !== null && existsSync(join(this.sdk, ...paquete.split(';')));
  }

  // Muestra la licencia y la acepta la persona: por eso usa la terminal entera.
  async instalarImagen(paquete: string): Promise<boolean> {
    const codigo = await this.terminal.enPrimerPlano(this.herramienta('sdkmanager'), [paquete]);
    return codigo === 0 && (this.terminal.simular || this.imagenInstalada(paquete));
  }

  async crearAvd(nombre: string, paquete: string, dispositivo: string): Promise<boolean> {
    const { codigo } = await this.terminal.ejecutar(
      this.herramienta('avdmanager'),
      ['create', 'avd', '--name', nombre, '--package', paquete, '--device', dispositivo],
      // Pregunta si se quiere un perfil de hardware a medida: no, se ajusta después.
      { entrada: 'no\n' },
    );
    return codigo === 0;
  }

  private herramienta(nombre: string): string {
    return join(this.carpetaHerramientas ?? '', this.plataforma.script(nombre));
  }
}
