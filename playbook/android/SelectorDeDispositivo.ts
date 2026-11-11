// Decide en qué celular o emulador trabajar. Si no hay ninguno, ofrece
// prender un emulador y lo deja con el GPS en Colón.

import type { Consola } from '../nucleo/Consola.ts';
import type { Adb, Dispositivo } from './Adb.ts';
import type { Emulador } from './Emulador.ts';

// Plaza San Martín, Colón (Entre Ríos): la misma de los flujos E2E.
export const PLAZA_SAN_MARTIN = { latitud: -32.2236, longitud: -58.1427 };

export class SelectorDeDispositivo {
  private readonly consola: Consola;
  private readonly adb: Adb;
  private readonly emulador: Emulador;

  constructor(consola: Consola, adb: Adb, emulador: Emulador) {
    this.consola = consola;
    this.adb = adb;
    this.emulador = emulador;
  }

  async elegir(): Promise<Dispositivo | null> {
    if (!(await this.adb.disponible())) {
      this.consola.error('No encuentro adb. Corré "revisar" para ver cómo instalarlo.');
      return null;
    }

    const conectados = await this.adb.dispositivos();
    const opciones = conectados.map((d) => `${d.nombre} ${this.consola.tenue(`(${d.serial})`)}`);
    const avds = this.emulador.disponible ? await this.emulador.lista() : [];
    if (avds.length) {
      opciones.push('Prender un emulador');
    }

    if (opciones.length === 0) {
      this.consola.error('No hay ningún celular conectado ni emuladores creados.');
      this.consola.texto('  Conectá el celu por USB con la "Depuración por USB" activada y aceptá el cartel en la pantalla.');
      return null;
    }

    this.consola.texto('¿Dónde corre la app?');
    const eleccion = await this.consola.elegir('Número', opciones);
    const dispositivo = eleccion < conectados.length ? conectados[eleccion] : await this.prenderEmulador(avds);
    if (dispositivo?.esEmulador) {
      await this.adb.apagarTutorialLapiz(dispositivo.serial);
      await this.adb.ponerGps(dispositivo.serial, PLAZA_SAN_MARTIN.latitud, PLAZA_SAN_MARTIN.longitud);
      this.consola.ok('GPS del emulador en la Plaza San Martín de Colón.');
    }
    return dispositivo;
  }

  private async prenderEmulador(avds: string[]): Promise<Dispositivo | null> {
    this.consola.texto('¿Cuál emulador?');
    const avd = avds[await this.consola.elegir('Número', avds)];
    this.consola.texto('Prendiendo el emulador (la primera vez puede tardar un par de minutos)…');
    const dispositivo = await this.emulador.arrancar(avd);
    if (!dispositivo) {
      this.consola.error('El emulador no terminó de arrancar. Probá abrirlo desde Android Studio.');
    }
    return dispositivo;
  }
}
