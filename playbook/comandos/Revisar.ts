// Revisa que la compu tenga todo lo necesario, sin cambiar nada.

import type { Adb } from '../android/Adb.ts';
import type { Emulador } from '../android/Emulador.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Proyecto } from '../nucleo/Proyecto.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import type { Api } from '../servicios/Api.ts';
import { VERSION_JAVA_DEL_PROYECTO, type Java } from '../servicios/Java.ts';
import type { Metro } from '../servicios/Metro.ts';
import { Comando } from './Comando.ts';

type Chequeo = {
  nombre: string;
  ok: boolean;
  detalle: string;
  // Opcional: si falta, se puede trabajar igual.
  opcional?: boolean;
  comoSeArregla?: string;
};

export class Revisar extends Comando {
  readonly nombre = 'revisar';
  readonly titulo = 'Revisar mi compu';
  readonly queHace =
    'Comprueba que estén Node 24, pnpm, Java 17, Android (adb), los .env y las dependencias. No cambia nada: solo dice qué falta y cómo instalarlo.';
  readonly porDetras = ['node -v · pnpm -v · npm -v · java -version', 'adb devices -l · emulator -list-avds', 'GET http://localhost:<puerto>/salud (API) y /status (Metro)'];
  readonly enIngles = {
    titulo: 'Check my computer',
    queHace:
      'Checks for Node 24, pnpm, Java 17, Android (adb), the .env files and the dependencies. Changes nothing: it only says what is missing and how to install it.',
    porDetras: [
      'node -v · pnpm -v · npm -v · java -version',
      'adb devices -l · emulator -list-avds',
      'GET http://localhost:<port>/salud (API) and /status (Metro)',
    ],
  };

  private readonly consola: Consola;
  private readonly terminal: Terminal;
  private readonly plataforma: Plataforma;
  private readonly proyecto: Proyecto;
  private readonly adb: Adb;
  private readonly emulador: Emulador;
  private readonly java: Java;
  private readonly api: Api;
  private readonly metro: Metro;

  constructor(dependencias: {
    consola: Consola;
    terminal: Terminal;
    plataforma: Plataforma;
    proyecto: Proyecto;
    adb: Adb;
    emulador: Emulador;
    java: Java;
    api: Api;
    metro: Metro;
  }) {
    super();
    this.consola = dependencias.consola;
    this.terminal = dependencias.terminal;
    this.plataforma = dependencias.plataforma;
    this.proyecto = dependencias.proyecto;
    this.adb = dependencias.adb;
    this.emulador = dependencias.emulador;
    this.java = dependencias.java;
    this.api = dependencias.api;
    this.metro = dependencias.metro;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo(`Revisando la compu (${this.plataforma.nombre})`);
    const chequeos = [
      ...(await this.herramientas()),
      ...this.archivos(),
      ...(await this.servicios()),
    ];

    for (const chequeo of chequeos) {
      const linea = `${chequeo.nombre.padEnd(24)} ${chequeo.detalle}`;
      if (chequeo.ok) {
        this.consola.ok(linea);
      } else if (chequeo.opcional) {
        this.consola.aviso(`${linea} ${this.consola.tenue('(opcional)')}`);
      } else {
        this.consola.error(linea);
      }
      if (!chequeo.ok && chequeo.comoSeArregla) {
        this.consola.texto(this.consola.tenue(`    → ${chequeo.comoSeArregla}`));
      }
    }

    const faltan = chequeos.filter((c) => !c.ok && !c.opcional).length;
    this.consola.texto();
    if (faltan === 0) {
      this.consola.ok('Está todo. Siguiente paso: "levantar".');
    } else {
      this.consola.aviso(`Faltan ${faltan} cosas. Las de archivos y dependencias las resuelve "preparar".`);
    }
  }

  private async herramientas(): Promise<Chequeo[]> {
    const node = Number(process.versions.node.split('.')[0]);
    const pnpm = await this.terminal.consultar('pnpm', ['-v']);
    const npm = await this.terminal.consultar('npm', ['-v']);
    const java = await this.java.version();
    const adb = await this.adb.disponible();
    const avds = await this.emulador.lista();
    const scrcpy = await this.terminal.existe('scrcpy');
    const maestro = await this.terminal.existe('maestro');

    return [
      { nombre: 'Node', ok: node >= 24, detalle: `v${process.versions.node}`, comoSeArregla: 'Instalar Node 24 LTS desde https://nodejs.org' },
      { nombre: 'pnpm (API)', ok: pnpm.codigo === 0, detalle: pnpm.codigo === 0 ? pnpm.salida.trim() : 'no está', comoSeArregla: this.plataforma.comoInstalar('pnpm') },
      { nombre: 'npm (app)', ok: npm.codigo === 0, detalle: npm.codigo === 0 ? npm.salida.trim() : 'no está', comoSeArregla: 'Viene con Node' },
      {
        nombre: `Java ${VERSION_JAVA_DEL_PROYECTO} (compilar)`,
        ok: java === VERSION_JAVA_DEL_PROYECTO,
        detalle: java ? `Java ${java}` : 'no está',
        comoSeArregla: this.plataforma.comoInstalar('java17'),
        // Solo hace falta para "instalar" el build de desarrollo.
        opcional: true,
      },
      { nombre: 'Android (adb)', ok: adb, detalle: adb ? 'listo' : 'no está', comoSeArregla: this.plataforma.comoInstalar('android') },
      { nombre: 'Emulador', ok: avds.length > 0, detalle: avds.length ? avds.join(', ') : 'ninguno creado', opcional: true, comoSeArregla: 'Android Studio → Device Manager → Create device' },
      { nombre: 'scrcpy (ver pantalla)', ok: scrcpy, detalle: scrcpy ? 'listo' : 'no está', opcional: true, comoSeArregla: this.plataforma.comoInstalar('scrcpy') },
      { nombre: 'Maestro (E2E)', ok: maestro, detalle: maestro ? 'listo' : 'no está', opcional: true, comoSeArregla: this.plataforma.comoInstalar('maestro') },
    ];
  }

  private archivos(): Chequeo[] {
    const { envApi, envApp } = this.proyecto;
    const mapas = envApp.tieneValor('GOOGLE_MAPS_KEY');
    return [
      { nombre: '.env de la API', ok: envApi.existe, detalle: envApi.existe ? 'está' : 'falta', comoSeArregla: 'Corré "preparar"' },
      { nombre: '.env de la app', ok: envApp.existe, detalle: envApp.existe ? 'está' : 'falta', comoSeArregla: 'Corré "preparar"' },
      {
        nombre: 'URL de la API (app)',
        ok: envApp.tieneValor('EXPO_PUBLIC_URL_API'),
        detalle: envApp.valor('EXPO_PUBLIC_URL_API') || 'vacía',
        comoSeArregla: 'Corré "preparar" (o "levantar", que la ajusta)',
      },
      {
        nombre: 'Clave de Google Maps',
        ok: mapas,
        detalle: mapas ? 'cargada' : 'vacía: el mapa se ve gris',
        opcional: true,
        comoSeArregla: 'Pedísela al equipo por privado y corré "preparar". Nunca la subas al repo.',
      },
      { nombre: 'Dependencias API', ok: this.proyecto.tieneDependenciasApi, detalle: this.proyecto.tieneDependenciasApi ? 'instaladas' : 'faltan', comoSeArregla: 'Corré "preparar"' },
      { nombre: 'Dependencias app', ok: this.proyecto.tieneDependenciasApp, detalle: this.proyecto.tieneDependenciasApp ? 'instaladas' : 'faltan', comoSeArregla: 'Corré "preparar"' },
    ];
  }

  private async servicios(): Promise<Chequeo[]> {
    const api = await this.api.responde();
    const metro = await this.metro.estaCorriendo();
    const dispositivos = await this.adb.dispositivos();
    return [
      { nombre: 'API', ok: api, detalle: api ? `prendida en el puerto ${this.proyecto.puertoApi}` : 'apagada (la prende "levantar")', opcional: true },
      { nombre: 'Metro', ok: metro, detalle: metro ? `prendido en el puerto ${this.metro.puerto}` : 'apagado (lo prende "levantar")', opcional: true },
      {
        nombre: 'Celular / emulador',
        ok: dispositivos.length > 0,
        detalle: dispositivos.length ? dispositivos.map((d) => d.nombre).join(', ') : 'ninguno conectado',
        opcional: true,
        comoSeArregla: 'Conectá el celu por USB con la depuración USB activada, o prendé un emulador',
      },
    ];
  }
}
