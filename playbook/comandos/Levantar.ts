// El comando del día a día: prende la API y Metro, conecta el celu o el
// emulador por adb y abre la app. Ctrl+C apaga todo.

import type { Adb, Dispositivo } from '../android/Adb.ts';
import type { SelectorDeDispositivo } from '../android/SelectorDeDispositivo.ts';
import type { Configuracion } from '../nucleo/Configuracion.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import { PAQUETE_ANDROID, type Proyecto } from '../nucleo/Proyecto.ts';
import type { ProcesoDeFondo, Terminal } from '../nucleo/Terminal.ts';
import type { Api } from '../servicios/Api.ts';
import type { Metro } from '../servicios/Metro.ts';
import { PuenteTcp } from '../servicios/PuenteTcp.ts';
import { Comando } from './Comando.ts';
import type { Instalar } from './Instalar.ts';

// El build de desarrollo siempre busca a Metro en el 8081 del equipo.
const PUERTO_METRO_EN_EL_EQUIPO = 8081;

export class Levantar extends Comando {
  readonly nombre = 'levantar';
  readonly titulo = 'Levantar todo y abrir la app';
  readonly queHace =
    'Prende la API (si no está prendida), conecta el celu o el emulador por adb, prende Metro y abre Mi Ciudad. Ahí mismo se ven los errores y con "r" se recarga la app. Ctrl+C apaga todo.';
  readonly porDetras = [
    'cd api-mi-ciudad && pnpm dev  (de fondo; registro en playbook/registros/api.log)',
    'adb -s <equipo> reverse tcp:<puerto API> tcp:<puerto API>',
    'adb -s <equipo> reverse tcp:8081 tcp:<puerto Metro>',
    'cd MiCiudad && npx expo start --port <puerto Metro>  (--clear si cambió el .env)',
    'adb -s <equipo> shell monkey -p com.miciudad.colon 1  (abre la app)',
  ];
  readonly enIngles = {
    titulo: 'Start everything and open the app',
    queHace:
      'Starts the API (if it is not running), connects the phone or emulator through adb, starts Metro and opens Mi Ciudad. Errors show up right there and "r" reloads the app. Ctrl+C stops everything.',
    porDetras: [
      'cd api-mi-ciudad && pnpm dev  (in the background; log in playbook/registros/api.log)',
      'adb -s <device> reverse tcp:<API port> tcp:<API port>',
      'adb -s <device> reverse tcp:8081 tcp:<Metro port>',
      'cd MiCiudad && npx expo start --port <Metro port>  (--clear if the .env changed)',
      'adb -s <device> shell monkey -p com.miciudad.colon 1  (opens the app)',
    ],
  };

  private readonly consola: Consola;
  private readonly plataforma: Plataforma;
  private readonly terminal: Terminal;
  private readonly proyecto: Proyecto;
  private readonly configuracion: Configuracion;
  private readonly selector: SelectorDeDispositivo;
  private readonly adb: Adb;
  private readonly api: Api;
  private readonly metro: Metro;
  private readonly instalar: Instalar;

  constructor(dependencias: {
    consola: Consola;
    plataforma: Plataforma;
    terminal: Terminal;
    proyecto: Proyecto;
    configuracion: Configuracion;
    selector: SelectorDeDispositivo;
    adb: Adb;
    api: Api;
    metro: Metro;
    instalar: Instalar;
  }) {
    super();
    this.consola = dependencias.consola;
    this.plataforma = dependencias.plataforma;
    this.terminal = dependencias.terminal;
    this.proyecto = dependencias.proyecto;
    this.configuracion = dependencias.configuracion;
    this.selector = dependencias.selector;
    this.adb = dependencias.adb;
    this.api = dependencias.api;
    this.metro = dependencias.metro;
    this.instalar = dependencias.instalar;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Levantar Mi Ciudad');
    if (!this.estaPreparado()) {
      return;
    }
    const limpiarCache = await this.apuntarAppALaApiLocal();

    const dispositivo = await this.selector.elegir();
    if (!dispositivo || !(await this.appInstalada(dispositivo))) {
      return;
    }

    const api = await this.prenderApi();
    if (api === false) {
      return;
    }
    const puentes = await this.abrirPuentes();
    try {
      await this.conectar(dispositivo);
      await this.prenderMetroYAbrirApp(dispositivo, limpiarCache);
    } finally {
      api?.detener();
      puentes.forEach((puente) => puente.cerrar());
      this.consola.ok('Apagado.');
    }
  }

  private estaPreparado(): boolean {
    const { envApi, envApp } = this.proyecto;
    if (envApi.existe && envApp.existe && this.proyecto.tieneDependenciasApi && this.proyecto.tieneDependenciasApp) {
      return true;
    }
    this.consola.error('Falta preparar el proyecto (.env o dependencias). Corré "preparar" primero.');
    return false;
  }

  // Devuelve true si la URL cambió: Expo lee el .env al arrancar, hay que limpiar la caché.
  private async apuntarAppALaApiLocal(): Promise<boolean> {
    const { envApp, urlApiLocal } = this.proyecto;
    const actual = envApp.valor('EXPO_PUBLIC_URL_API');
    if (actual !== urlApiLocal) {
      const cambiar =
        !actual ||
        (await this.consola.confirmar(
          `La app apunta a ${actual}. Por USB o en el emulador tiene que ser ${urlApiLocal}. ¿La cambio?`,
        ));
      if (cambiar) {
        envApp.poner('EXPO_PUBLIC_URL_API', urlApiLocal);
        this.consola.ok(`MiCiudad/.env → EXPO_PUBLIC_URL_API=${urlApiLocal}`);
      }
    }
    const final = envApp.valor('EXPO_PUBLIC_URL_API') ?? '';
    const cambio = this.configuracion.ultimaUrlApi !== final;
    if (cambio && !this.terminal.simular) {
      this.configuracion.recordarUrlApi(final);
    }
    return cambio;
  }

  private async appInstalada(dispositivo: Dispositivo): Promise<boolean> {
    if (await this.adb.estaInstalada(dispositivo.serial, PAQUETE_ANDROID)) {
      return true;
    }
    this.consola.aviso(`Mi Ciudad no está instalada en ${dispositivo.nombre}.`);
    if (!(await this.consola.confirmar('¿La instalo ahora?'))) {
      return false;
    }
    return this.instalar.instalarEn(dispositivo);
  }

  // null: ya estaba prendida (no la apagamos al salir). false: no arrancó.
  private async prenderApi(): Promise<ProcesoDeFondo | null | false> {
    if (await this.api.responde()) {
      this.consola.ok(`La API ya estaba prendida en el puerto ${this.proyecto.puertoApi}.`);
      return null;
    }
    this.consola.texto('Prendiendo la API…');
    const proceso = await this.api.levantar();
    if (!proceso && !this.terminal.simular) {
      this.consola.error(`La API no arrancó. Mirá ${this.proyecto.registro('api.log')}`);
      return false;
    }
    this.consola.ok(`API prendida en el puerto ${this.proyecto.puertoApi}.`);
    return proceso;
  }

  private async abrirPuentes(): Promise<PuenteTcp[]> {
    const puentes: PuenteTcp[] = [];
    if (this.plataforma.esWindows) {
      puentes.push(new PuenteTcp('::1', this.proyecto.puertoApi, this.proyecto.puertoApi));
    }
    if (this.metro.puerto !== PUERTO_METRO_EN_EL_EQUIPO) {
      puentes.push(new PuenteTcp('127.0.0.1', PUERTO_METRO_EN_EL_EQUIPO, this.metro.puerto));
    }
    const abiertos: PuenteTcp[] = [];
    for (const puente of puentes) {
      if (this.terminal.simular) {
        this.consola.porDetras(`puente ${puente.descripcion}`);
      } else if (await puente.abrir()) {
        abiertos.push(puente);
      }
    }
    return abiertos;
  }

  private async conectar(dispositivo: Dispositivo): Promise<void> {
    const { puertoApi } = this.proyecto;
    const api = await this.adb.redirigir(dispositivo.serial, puertoApi, puertoApi);
    const metro = await this.adb.redirigir(dispositivo.serial, PUERTO_METRO_EN_EL_EQUIPO, this.metro.puerto);
    if (api && metro) {
      this.consola.ok(`${dispositivo.nombre} conectado: ve la API y Metro como localhost.`);
    } else {
      this.consola.aviso('adb reverse falló. Desenchufá y volvé a enchufar el celu, y aceptá el cartel de depuración.');
    }
  }

  private async prenderMetroYAbrirApp(dispositivo: Dispositivo, limpiarCache: boolean): Promise<void> {
    if (await this.metro.estaCorriendo()) {
      this.consola.ok(`Metro ya estaba prendido en el puerto ${this.metro.puerto}.`);
      await this.adb.abrirApp(dispositivo.serial, PAQUETE_ANDROID);
      await this.consola.preguntar('La app está abierta. Apretá Enter para terminar');
      return;
    }

    this.consola.texto(`Prendiendo Metro${limpiarCache ? ' con la caché limpia (cambió el .env)' : ''}. La app se abre sola cuando esté listo.`);
    this.consola.texto(this.consola.tenue('  r = recargar la app · j = depurador · Ctrl+C = apagar todo'));
    if (this.terminal.simular) {
      await this.adb.abrirApp(dispositivo.serial, PAQUETE_ANDROID);
    } else {
      void this.metro.esperarQueArranque().then((listo) => {
        if (listo) {
          void this.adb.abrirApp(dispositivo.serial, PAQUETE_ANDROID);
        }
      });
    }

    // Ctrl+C corta Metro; sin esto, también cortaría el playbook antes de apagar la API.
    const ignorar = () => {};
    process.on('SIGINT', ignorar);
    try {
      await this.metro.arrancar(limpiarCache);
    } finally {
      process.off('SIGINT', ignorar);
    }
  }
}
