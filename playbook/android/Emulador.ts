// Lista y arranca los emuladores de Android Studio (AVD).

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import type { Adb, Dispositivo } from './Adb.ts';

export class Emulador {
  private readonly terminal: Terminal;
  private readonly adb: Adb;
  private readonly programa: string | null;

  constructor(terminal: Terminal, plataforma: Plataforma, adb: Adb) {
    this.terminal = terminal;
    this.adb = adb;
    const sdk = plataforma.carpetaSdkAndroid();
    const ruta = sdk ? join(sdk, 'emulator', plataforma.ejecutable('emulator')) : null;
    this.programa = ruta && existsSync(ruta) ? ruta : null;
  }

  get disponible(): boolean {
    return this.programa !== null;
  }

  async lista(): Promise<string[]> {
    if (!this.programa) {
      return [];
    }
    const { salida } = await this.terminal.consultar(this.programa, ['-list-avds']);
    return salida
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea && !linea.startsWith('INFO') && !linea.includes('|'));
  }

  // ¿Ese emulador ya está prendido? Devuelve su serial (emulator-5554…).
  async serialSiEstaPrendido(avd: string): Promise<string | null> {
    for (const dispositivo of await this.adb.dispositivos()) {
      if (dispositivo.esEmulador && (await this.adb.nombreAvd(dispositivo.serial)) === avd) {
        return dispositivo.serial;
      }
    }
    return null;
  }

  // Arranca en otra ventana y espera a que Android termine de iniciar.
  // `borrarDatos` lo deja como recién creado (sin apps ni cuentas).
  async arrancar(avd: string, { borrarDatos = false, esperaMaxima = 300_000 } = {}): Promise<Dispositivo | null> {
    if (!this.programa) {
      return null;
    }
    const antes = new Set((await this.adb.dispositivos()).map((d) => d.serial));
    this.terminal.soltar(this.programa, borrarDatos ? ['-avd', avd, '-wipe-data', '-no-snapshot-load'] : ['-avd', avd]);
    if (this.terminal.simular) {
      return { serial: 'emulator-5554', nombre: avd, esEmulador: true };
    }

    const limite = Date.now() + esperaMaxima;
    while (Date.now() < limite) {
      await esperar(3000);
      const nuevo = (await this.adb.dispositivos()).find((d) => d.esEmulador && !antes.has(d.serial));
      if (nuevo && (await this.adb.terminoDeArrancar(nuevo.serial))) {
        return { ...nuevo, nombre: avd };
      }
    }
    return null;
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
