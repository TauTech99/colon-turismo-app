// Deja el proyecto listo la primera vez: .env, dependencias y datos de demo.
// Se puede repetir: lo que ya está, no lo toca.

import { existsSync } from 'node:fs';

import type { Consola } from '../nucleo/Consola.ts';
import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { Api } from '../servicios/Api.ts';
import type { App } from '../servicios/App.ts';
import { Comando } from './Comando.ts';

export class Preparar extends Comando {
  readonly nombre = 'preparar';
  readonly titulo = 'Preparar el proyecto (la primera vez)';
  readonly queHace =
    'Crea los .env que falten (API con SQLite, sin Docker), pide la clave de Google Maps, instala las dependencias y carga los datos de demo. Lo que ya está no lo toca.';
  readonly porDetras = [
    'copiar api-mi-ciudad/.env.example → .env  (si no existe)',
    'cd api-mi-ciudad && pnpm install',
    'cd api-mi-ciudad && pnpm db:reiniciar  (solo si todavía no hay base)',
    'copiar MiCiudad/.env.example → .env y poner EXPO_PUBLIC_URL_API=http://localhost:<puerto API>',
    'cd MiCiudad && npm install',
  ];
  readonly enIngles = {
    titulo: 'Set up the project (first time)',
    queHace:
      'Creates the missing .env files (API with SQLite, no Docker), asks for the Google Maps key, installs the dependencies and loads the demo data. Leaves alone whatever is already there.',
    porDetras: [
      'copy api-mi-ciudad/.env.example → .env  (if missing)',
      'cd api-mi-ciudad && pnpm install',
      'cd api-mi-ciudad && pnpm db:reiniciar  (only if there is no database yet)',
      'copy MiCiudad/.env.example → .env and set EXPO_PUBLIC_URL_API=http://localhost:<API port>',
      'cd MiCiudad && npm install',
    ],
  };

  private readonly consola: Consola;
  private readonly proyecto: Proyecto;
  private readonly api: Api;
  private readonly app: App;

  constructor(dependencias: { consola: Consola; proyecto: Proyecto; api: Api; app: App }) {
    super();
    this.consola = dependencias.consola;
    this.proyecto = dependencias.proyecto;
    this.api = dependencias.api;
    this.app = dependencias.app;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Preparando la API');
    if (!(await this.prepararApi())) {
      return;
    }
    this.consola.titulo('Preparando la app');
    if (!(await this.prepararApp())) {
      return;
    }
    this.consola.texto();
    this.consola.ok('Proyecto listo. Siguiente: "instalar" (solo la primera vez en cada celu) y después "levantar".');
  }

  private async prepararApi(): Promise<boolean> {
    const { envApi } = this.proyecto;
    if (envApi.existe) {
      this.consola.ok('api-mi-ciudad/.env ya existe (no lo toco).');
    } else {
      envApi.crearDesde(this.proyecto.ejemploEnvApi);
      this.consola.ok('Creé api-mi-ciudad/.env: base SQLite de demo, puerto 3000.');
    }

    if (!(await this.api.instalarDependencias())) {
      this.consola.error('pnpm install falló. Revisá el mensaje de arriba.');
      return false;
    }

    const base = this.proyecto.baseSqlite;
    if (base && existsSync(base)) {
      this.consola.ok('Ya hay datos de demo. Para volver a cero: "reiniciar".');
    } else if (base) {
      if (!(await this.api.cargarDatosDeDemo())) {
        this.consola.error('No se pudieron cargar los datos de demo.');
        return false;
      }
      this.consola.ok('Datos de demo cargados (usuarios lucia@mail.com y nuevo@demo.ar).');
    } else {
      this.consola.aviso('La API usa otra base (no SQLite). Si está vacía, corré "reiniciar" para cargar los datos de demo.');
    }
    return true;
  }

  private async prepararApp(): Promise<boolean> {
    const { envApp } = this.proyecto;
    if (envApp.existe) {
      this.consola.ok('MiCiudad/.env ya existe.');
    } else {
      envApp.crearDesde(this.proyecto.ejemploEnvApp);
      this.consola.ok('Creé MiCiudad/.env.');
    }

    if (!envApp.tieneValor('EXPO_PUBLIC_URL_API')) {
      envApp.poner('EXPO_PUBLIC_URL_API', this.proyecto.urlApiLocal);
      this.consola.ok(`La app va a buscar la API en ${this.proyecto.urlApiLocal}.`);
    }

    if (!envApp.tieneValor('GOOGLE_MAPS_KEY')) {
      this.consola.texto('El mapa necesita la clave de Google Maps. Pedísela al equipo por privado: nunca se sube al repo.');
      const clave = await this.consola.preguntar('Pegala acá (Enter para seguir sin mapa)');
      if (clave) {
        envApp.poner('GOOGLE_MAPS_KEY', clave);
        this.consola.ok('Clave guardada en MiCiudad/.env.');
      } else {
        this.consola.aviso('Sin clave: la app anda, pero el mapa se ve gris.');
      }
    }

    if (!(await this.app.instalarDependencias())) {
      this.consola.error('npm install falló. Revisá el mensaje de arriba.');
      return false;
    }
    return true;
  }
}
