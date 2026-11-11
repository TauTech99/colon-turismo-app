// Dónde está cada parte del repo y qué puertos usa.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { ArchivoEnv } from './ArchivoEnv.ts';

export const PAQUETE_ANDROID = 'com.miciudad.colon';

export class Proyecto {
  readonly raiz: string;
  readonly carpetaApi: string;
  readonly carpetaApp: string;
  readonly carpetaPlaybook: string;
  readonly envApi: ArchivoEnv;
  readonly envApp: ArchivoEnv;

  constructor(raiz: string, carpetaPlaybook: string, simular: boolean) {
    this.raiz = raiz;
    this.carpetaApi = join(raiz, 'api-mi-ciudad');
    this.carpetaApp = join(raiz, 'MiCiudad');
    this.carpetaPlaybook = carpetaPlaybook;
    this.envApi = new ArchivoEnv(join(this.carpetaApi, '.env'), simular);
    this.envApp = new ArchivoEnv(join(this.carpetaApp, '.env'), simular);
  }

  // Sube desde `desde` hasta encontrar la carpeta con la API y la app.
  static buscarRaiz(desde: string, sugerida?: string): string | null {
    if (sugerida && Proyecto.esRaiz(resolve(sugerida))) {
      return resolve(sugerida);
    }
    let actual = resolve(desde);
    for (;;) {
      if (Proyecto.esRaiz(actual)) {
        return actual;
      }
      const padre = dirname(actual);
      if (padre === actual) {
        return null;
      }
      actual = padre;
    }
  }

  private static esRaiz(carpeta: string): boolean {
    return existsSync(join(carpeta, 'api-mi-ciudad')) && existsSync(join(carpeta, 'MiCiudad'));
  }

  get puertoApi(): number {
    return Number(this.envApi.valor('PUERTO') ?? 3000);
  }

  // Con `adb reverse` el celu y el emulador ven la API como localhost.
  get urlApiLocal(): string {
    return `http://localhost:${this.puertoApi}`;
  }

  get ejemploEnvApi(): string {
    return join(this.carpetaApi, '.env.example');
  }

  get ejemploEnvApp(): string {
    return join(this.carpetaApp, '.env.example');
  }

  get tieneDependenciasApi(): boolean {
    return existsSync(join(this.carpetaApi, 'node_modules'));
  }

  get tieneDependenciasApp(): boolean {
    return existsSync(join(this.carpetaApp, 'node_modules'));
  }

  // Base SQLite de demo (el modo por defecto del equipo).
  get baseSqlite(): string | null {
    const motor = this.envApi.valor('DB_MOTOR') ?? 'better-sqlite3';
    if (!motor.includes('sqlite') || this.envApi.valor('DB_URL')) {
      return null;
    }
    return join(this.carpetaApi, this.envApi.valor('DB_ARCHIVO') ?? 'datos/api.sqlite');
  }

  get carpetaAndroid(): string {
    return join(this.carpetaApp, 'android');
  }

  get carpetaFlujosE2E(): string {
    return join(this.carpetaApp, '.maestro');
  }

  registro(nombre: string): string {
    return join(this.carpetaPlaybook, 'registros', nombre);
  }
}
