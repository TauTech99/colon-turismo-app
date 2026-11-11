// Un emulador creado (AVD): lee y cambia su config.ini sin tocar el resto.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class Avd {
  readonly nombre: string;
  private readonly rutaConfig: string;
  private lineas: string[];

  constructor(carpetaAvds: string, nombre: string) {
    this.nombre = nombre;
    this.rutaConfig = join(carpetaAvds, `${nombre}.avd`, 'config.ini');
    this.lineas = existsSync(this.rutaConfig) ? readFileSync(this.rutaConfig, 'utf8').split(/\r?\n/) : [];
  }

  get existe(): boolean {
    return this.lineas.length > 0;
  }

  // "system-images\android-36\google_apis_playstore\x86_64\" → 36
  get api(): number | null {
    const coincide = (this.valor('image.sysdir.1') ?? '').match(/android-(\d+)/);
    return coincide ? Number(coincide[1]) : null;
  }

  get ramMb(): number | null {
    return this.megas(this.valor('hw.ramSize'));
  }

  get nucleos(): number | null {
    const valor = Number(this.valor('hw.cpu.ncore'));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  get conPlayStore(): boolean {
    return (this.valor('tag.id') ?? '').includes('playstore');
  }

  descripcion(nombreAndroid: (api: number | null) => string): string {
    const ram = this.ramMb ? `${(this.ramMb / 1024).toLocaleString('es-AR')} GB de RAM` : 'RAM sin definir';
    const nucleos = this.nucleos ? `${this.nucleos} núcleos` : 'núcleos sin definir';
    return `${nombreAndroid(this.api)}, ${ram}, ${nucleos}`;
  }

  ajustar(valores: { ramMb: number; heapMb: number; nucleos: number; discoGb?: number }, simular: boolean): void {
    this.poner('hw.ramSize', `${valores.ramMb}M`);
    this.poner('vm.heapSize', `${valores.heapMb}M`);
    this.poner('hw.cpu.ncore', String(valores.nucleos));
    if (valores.discoGb) {
      // Nunca achica el disco: se perderían datos.
      const actual = this.megas(this.valor('disk.dataPartition.size')) ?? 0;
      if (actual < valores.discoGb * 1024) {
        this.poner('disk.dataPartition.size', `${valores.discoGb}G`);
      }
    }
    if (!simular) {
      writeFileSync(this.rutaConfig, this.lineas.join('\n'));
    }
  }

  private valor(clave: string): string | undefined {
    const linea = this.lineas.find((l) => l.startsWith(`${clave}=`) || l.startsWith(`${clave} =`));
    return linea?.slice(linea.indexOf('=') + 1).trim();
  }

  private poner(clave: string, valor: string): void {
    const indice = this.lineas.findIndex((l) => l.startsWith(`${clave}=`) || l.startsWith(`${clave} =`));
    if (indice >= 0) {
      this.lineas[indice] = `${clave}=${valor}`;
    } else {
      this.lineas.splice(this.lineas.length && this.lineas[this.lineas.length - 1] === '' ? this.lineas.length - 1 : this.lineas.length, 0, `${clave}=${valor}`);
    }
  }

  // "5120M", "5120", "10G", "512MB" → megas
  private megas(texto: string | undefined): number | null {
    const coincide = (texto ?? '').match(/^(\d+)\s*([MG])?B?$/i);
    if (!coincide) {
      return null;
    }
    const numero = Number(coincide[1]);
    return coincide[2]?.toUpperCase() === 'G' ? numero * 1024 : numero;
  }
}
