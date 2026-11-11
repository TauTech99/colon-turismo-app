// Valores recomendados para el emulador de esta compu.
// La versión de Android sigue a la app; la RAM y los núcleos, a la compu.

import { arch, cpus, totalmem } from 'node:os';

// La app compila contra Android 16 (compileSdk/targetSdk 36 de Expo SDK 57).
// Las versiones preview fallan por cosas que no son del código.
export const API_DE_LA_APP = 36;

const NOMBRES_ANDROID: Record<number, string> = {
  33: 'Android 13',
  34: 'Android 14',
  35: 'Android 15',
  36: 'Android 16',
  37: 'Android 17',
};

export function nombreAndroid(api: number | null): string {
  if (api === null) {
    return 'versión desconocida';
  }
  return `${NOMBRES_ANDROID[api] ?? `Android API ${api}`} (API ${api})`;
}

export class RecomendacionEmulador {
  readonly api = API_DE_LA_APP;
  // Con Play Store: Google Maps y las apps de GPS simulado (Lockito) lo necesitan.
  readonly etiqueta = 'google_apis_playstore';
  readonly dispositivo = 'pixel_7';
  readonly heapMb = 512;
  readonly discoGb = 8;
  readonly abi: string;
  readonly ramMb: number;
  readonly nucleos: number;
  readonly ramDeLaCompuGb: number;

  constructor(memoriaTotal: number = totalmem(), procesadores: number = cpus().length, arquitectura: string = arch()) {
    this.abi = arquitectura === 'arm64' ? 'arm64-v8a' : 'x86_64';
    this.ramDeLaCompuGb = Math.round(memoriaTotal / 2 ** 30);
    // Con 2 GB Android "no responde"; con más de 4 GB le saca memoria a Metro, la API y Gradle.
    if (this.ramDeLaCompuGb >= 15) {
      this.ramMb = 4096;
    } else if (this.ramDeLaCompuGb >= 7) {
      this.ramMb = 3072;
    } else {
      this.ramMb = 2048;
    }
    this.nucleos = Math.max(2, Math.min(4, Math.floor(procesadores / 2)));
  }

  get paqueteImagen(): string {
    return `system-images;android-${this.api};${this.etiqueta};${this.abi}`;
  }

  // Con poca RAM conviene más el celular por USB que el emulador.
  get compuJusta(): boolean {
    return this.ramDeLaCompuGb < 7;
  }

  resumen(): string {
    return `${nombreAndroid(this.api)} con Play Store, ${this.ramMb / 1024} GB de RAM, ${this.nucleos} núcleos, ${this.abi}`;
  }
}
