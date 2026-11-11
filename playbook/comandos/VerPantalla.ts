// Muestra la pantalla del celu en una ventana de la compu (scrcpy), para
// compartirla en la videollamada de la defensa.

import type { SelectorDeDispositivo } from '../android/SelectorDeDispositivo.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import { Comando } from './Comando.ts';

export class VerPantalla extends Comando {
  readonly nombre = 'pantalla';
  readonly titulo = 'Ver el celu en la compu (para compartir pantalla)';
  readonly queHace =
    'Abre una ventana con la pantalla del celular, que se puede manejar con el mouse. Sirve para compartirla en la videollamada sin usar el emulador. Funciona por USB.';
  readonly porDetras = ['scrcpy -s <equipo> --window-title "Mi Ciudad Colón" --stay-awake'];
  readonly enIngles = {
    titulo: 'Show the phone on the computer (screen sharing)',
    queHace:
      'Opens a window with the phone screen, which can be driven with the mouse. Handy for sharing it in the video call without the emulator. Works over USB.',
    porDetras: [
      'scrcpy -s <device> --window-title "Mi Ciudad Colón" --stay-awake',
    ],
  };

  private readonly consola: Consola;
  private readonly terminal: Terminal;
  private readonly plataforma: Plataforma;
  private readonly selector: SelectorDeDispositivo;

  constructor(dependencias: { consola: Consola; terminal: Terminal; plataforma: Plataforma; selector: SelectorDeDispositivo }) {
    super();
    this.consola = dependencias.consola;
    this.terminal = dependencias.terminal;
    this.plataforma = dependencias.plataforma;
    this.selector = dependencias.selector;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Ver el celu en la compu');
    if (!(await this.terminal.existe('scrcpy'))) {
      this.consola.error('Falta scrcpy. Se instala una vez:');
      this.consola.texto(`    ${this.plataforma.comoInstalar('scrcpy')}`);
      return;
    }
    const dispositivo = await this.selector.elegir();
    if (!dispositivo) {
      return;
    }
    this.terminal.soltar('scrcpy', ['-s', dispositivo.serial, '--window-title', 'Mi Ciudad Colón', '--stay-awake']);
    this.consola.ok('Se abrió la ventana con la pantalla. En la videollamada, compartí esa ventana.');
  }
}
