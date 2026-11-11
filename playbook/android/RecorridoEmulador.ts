// Mueve el GPS del emulador por los lugares de la ruta, uno cada tantos
// segundos, como si alguien caminara Colón.

import type { Consola } from '../nucleo/Consola.ts';
import type { Adb } from './Adb.ts';
import type { Punto } from './RutaGpx.ts';

export class RecorridoEmulador {
  private readonly consola: Consola;
  private readonly adb: Adb;
  private cortar = false;

  constructor(consola: Consola, adb: Adb) {
    this.consola = consola;
    this.adb = adb;
  }

  detener(): void {
    this.cortar = true;
  }

  async recorrer(serial: string, lugares: Punto[], segundosPorLugar: number): Promise<void> {
    this.cortar = false;
    for (const [i, lugar] of lugares.entries()) {
      if (this.cortar) {
        return;
      }
      await this.adb.ponerGps(serial, lugar.latitud, lugar.longitud);
      this.consola.texto(`  ${String(i + 1).padStart(2)}/${lugares.length}  ${lugar.nombre}`);
      await this.esperar(segundosPorLugar * 1000);
    }
  }

  // Espera de a poco para poder cortar enseguida.
  private async esperar(ms: number): Promise<void> {
    const limite = Date.now() + ms;
    while (!this.cortar && Date.now() < limite) {
      await new Promise((resolver) => setTimeout(resolver, 250));
    }
  }
}
