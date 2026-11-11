// Lockito: la app de GPS simulado para el celular real (el emulador no la
// necesita: su GPS se mueve por adb). La instala la persona desde Play
// Store, porque los términos los acepta ella.

import { basename } from 'node:path';

import type { Terminal } from '../nucleo/Terminal.ts';
import type { Adb } from './Adb.ts';

export const PAQUETE_LOCKITO = 'fr.dvilleneuve.lockito';
// Donde Lockito encuentra la ruta al importar: la carpeta Descargas.
const CARPETA_EN_EL_CELU = '/sdcard/Download';

export class Lockito {
  private readonly terminal: Terminal;
  private readonly adb: Adb;

  constructor(terminal: Terminal, adb: Adb) {
    this.terminal = terminal;
    this.adb = adb;
  }

  estaInstalada(serial: string): Promise<boolean> {
    return this.adb.estaInstalada(serial, PAQUETE_LOCKITO);
  }

  // Abre la ficha de Lockito en el Play Store del celu.
  async abrirEnPlayStore(serial: string): Promise<void> {
    await this.terminal.ejecutar(
      this.adb.programa,
      ['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `market://details?id=${PAQUETE_LOCKITO}`],
      { sinSalida: true },
    );
  }

  // Lo mismo que elegirla en Opciones de desarrollador → "App de ubicación simulada".
  async habilitarComoUbicacionSimulada(serial: string): Promise<boolean> {
    const { codigo } = await this.terminal.ejecutar(
      this.adb.programa,
      ['-s', serial, 'shell', 'appops', 'set', PAQUETE_LOCKITO, 'android:mock_location', 'allow'],
      { sinSalida: true },
    );
    return codigo === 0;
  }

  // Copia la ruta a Descargas del celu; devuelve dónde quedó.
  async copiarRuta(serial: string, archivoGpx: string): Promise<string | null> {
    const destino = `${CARPETA_EN_EL_CELU}/${basename(archivoGpx)}`;
    const { codigo } = await this.terminal.ejecutar(this.adb.programa, ['-s', serial, 'push', archivoGpx, destino], { sinSalida: true });
    return codigo === 0 ? destino : null;
  }

  async abrir(serial: string): Promise<void> {
    await this.adb.abrirApp(serial, PAQUETE_LOCKITO);
  }

  // Lo que se hace "de camino" en Levantar: sin preguntar nada.
  async dejarLista(serial: string, archivoGpx: string): Promise<'lista' | 'noInstalada' | 'falla'> {
    if (!(await this.estaInstalada(serial))) {
      return 'noInstalada';
    }
    const habilitada = await this.habilitarComoUbicacionSimulada(serial);
    const ruta = await this.copiarRuta(serial, archivoGpx);
    return habilitada && ruta ? 'lista' : 'falla';
  }
}
