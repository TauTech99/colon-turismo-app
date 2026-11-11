// Corre los tests de la app, de la API y los recorridos E2E.

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Adb } from '../android/Adb.ts';
import type { SelectorDeDispositivo } from '../android/SelectorDeDispositivo.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import type { Api } from '../servicios/Api.ts';
import type { App } from '../servicios/App.ts';
import { Comando } from './Comando.ts';

export class CorrerTests extends Comando {
  readonly nombre = 'tests';
  readonly titulo = 'Correr los tests';
  readonly queHace =
    'Tests unitarios de la app (Jest) y de la API (Vitest), y los recorridos end to end de Maestro en el celu o el emulador, con el GPS simulado en Colón.';
  readonly porDetras = [
    'cd MiCiudad && npm test',
    'cd api-mi-ciudad && pnpm test',
    'maestro --device <equipo> test MiCiudad/.maestro  (necesita "levantar" corriendo en otra terminal)',
  ];
  readonly enIngles = {
    titulo: 'Run the tests',
    queHace:
      'App unit tests (Jest) and API tests (Vitest), plus the Maestro end-to-end flows on the phone or emulator, with the GPS simulated in Colón.',
    porDetras: [
      'cd MiCiudad && npm test',
      'cd api-mi-ciudad && pnpm test',
      'maestro --device <device> test MiCiudad/.maestro  (needs "levantar" running in another terminal)',
    ],
  };

  private readonly consola: Consola;
  private readonly terminal: Terminal;
  private readonly plataforma: Plataforma;
  private readonly proyecto: Proyecto;
  private readonly selector: SelectorDeDispositivo;
  private readonly adb: Adb;
  private readonly api: Api;
  private readonly app: App;

  constructor(dependencias: {
    consola: Consola;
    terminal: Terminal;
    plataforma: Plataforma;
    proyecto: Proyecto;
    selector: SelectorDeDispositivo;
    adb: Adb;
    api: Api;
    app: App;
  }) {
    super();
    this.consola = dependencias.consola;
    this.terminal = dependencias.terminal;
    this.plataforma = dependencias.plataforma;
    this.proyecto = dependencias.proyecto;
    this.selector = dependencias.selector;
    this.adb = dependencias.adb;
    this.api = dependencias.api;
    this.app = dependencias.app;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Tests');
    const opcion = await this.consola.elegir('Número', [
      'Tests de la app (Jest)',
      'Tests de la API (Vitest)',
      'Recorridos E2E en el celu o emulador (Maestro)',
      'Los tests de la app y de la API',
    ]);

    const resultados: Array<[string, boolean]> = [];
    if (opcion === 0 || opcion === 3) {
      resultados.push(['App (Jest)', await this.app.correrTests()]);
    }
    if (opcion === 1 || opcion === 3) {
      resultados.push(['API (Vitest)', await this.api.correrTests()]);
    }
    if (opcion === 2) {
      const e2e = await this.correrE2E();
      if (e2e === null) {
        return;
      }
      resultados.push(['E2E (Maestro)', e2e]);
    }

    this.consola.titulo('Resultado');
    for (const [nombre, ok] of resultados) {
      if (ok) {
        this.consola.ok(`${nombre}: pasaron`);
      } else {
        this.consola.error(`${nombre}: hay fallas (mirá arriba)`);
      }
    }
  }

  // null: no se pudo ni empezar.
  private async correrE2E(): Promise<boolean | null> {
    if (!(await this.terminal.existe('maestro'))) {
      this.consola.error('Falta Maestro.');
      this.consola.texto(`    ${this.plataforma.comoInstalar('maestro')}`);
      return null;
    }
    if (!existsSync(this.proyecto.carpetaFlujosE2E)) {
      this.consola.error('No están los flujos en MiCiudad/.maestro.');
      return null;
    }
    if (!(await this.api.responde())) {
      this.consola.error('La API está apagada. Corré "levantar" en otra terminal y volvé.');
      return null;
    }
    const dispositivo = await this.selector.elegir();
    if (!dispositivo) {
      return null;
    }

    // En un celu real, Maestro mueve el GPS como "app de ubicación simulada".
    // Su driver se reinstala en cada corrida, así que el permiso se renueva mientras corre.
    const permiso = dispositivo.esEmulador || this.terminal.simular
      ? null
      : setInterval(() => void this.adb.permitirUbicacionSimulada(dispositivo.serial), 2000);
    // Reporte y capturas de cada paso a playbook/registros/e2e (no se suben).
    const salida = this.proyecto.registro('e2e');
    if (!this.terminal.simular) {
      mkdirSync(salida, { recursive: true });
    }
    try {
      const { codigo } = await this.terminal.ejecutar(
        'maestro',
        [
          '--device',
          dispositivo.serial,
          'test',
          this.proyecto.carpetaFlujosE2E,
          '--format',
          'junit',
          '--output',
          join(salida, 'reporte.xml'),
          '--test-output-dir',
          salida,
        ],
        { cwd: salida },
      );
      this.consola.texto(this.consola.tenue(`  Reporte y capturas: ${salida}`));
      return codigo === 0;
    } finally {
      if (permiso) {
        clearInterval(permiso);
      }
    }
  }
}
