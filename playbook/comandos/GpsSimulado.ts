// GPS simulado en Colón: Lockito en el celular, adb en el emulador.

import type { Dispositivo } from '../android/Adb.ts';
import type { Lockito } from '../android/Lockito.ts';
import type { RecorridoEmulador } from '../android/RecorridoEmulador.ts';
import type { RutaGpx } from '../android/RutaGpx.ts';
import type { SelectorDeDispositivo } from '../android/SelectorDeDispositivo.ts';
import type { Adb } from '../android/Adb.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import { Comando } from './Comando.ts';

export class GpsSimulado extends Comando {
  readonly nombre = 'gps';
  readonly titulo = 'GPS simulado en Colón';
  readonly queHace =
    'En el celular deja lista Lockito (la app de GPS simulado): si falta abre su ficha del Play Store, la habilita como ubicación simulada y le copia la ruta de los 23 lugares de Colón. En el emulador pone el GPS en un lugar o lo hace recorrer los 23.';
  readonly porDetras = [
    'adb shell pm list packages fr.dvilleneuve.lockito  (¿está Lockito?)',
    'adb shell am start -d market://details?id=fr.dvilleneuve.lockito  (si falta: la instalás vos)',
    'adb shell appops set fr.dvilleneuve.lockito android:mock_location allow',
    'adb push playbook/gps/colon-recorrido.gpx /sdcard/Download/',
    'emulador: adb emu geo fix <longitud> <latitud>  (un lugar, o uno cada N segundos)',
  ];
  readonly enIngles = {
    titulo: 'Simulated GPS in Colón',
    queHace:
      'On the phone it gets Lockito (the mock GPS app) ready: opens its Play Store page if missing, enables it as the mock location app and copies the route through the 23 Colón places. On the emulator it puts the GPS on one place or walks it through all 23.',
    porDetras: [
      'adb shell pm list packages fr.dvilleneuve.lockito  (is Lockito there?)',
      'adb shell am start -d market://details?id=fr.dvilleneuve.lockito  (if missing: you install it)',
      'adb shell appops set fr.dvilleneuve.lockito android:mock_location allow',
      'adb push playbook/gps/colon-recorrido.gpx /sdcard/Download/',
      'emulator: adb emu geo fix <longitude> <latitude>  (one place, or one every N seconds)',
    ],
  };

  private readonly consola: Consola;
  private readonly terminal: Terminal;
  private readonly selector: SelectorDeDispositivo;
  private readonly adb: Adb;
  private readonly lockito: Lockito;
  private readonly recorrido: RecorridoEmulador;
  private readonly ruta: RutaGpx;

  constructor(dependencias: {
    consola: Consola;
    terminal: Terminal;
    selector: SelectorDeDispositivo;
    adb: Adb;
    lockito: Lockito;
    recorrido: RecorridoEmulador;
    ruta: RutaGpx;
  }) {
    super();
    this.consola = dependencias.consola;
    this.terminal = dependencias.terminal;
    this.selector = dependencias.selector;
    this.adb = dependencias.adb;
    this.lockito = dependencias.lockito;
    this.recorrido = dependencias.recorrido;
    this.ruta = dependencias.ruta;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('GPS simulado en Colón');
    const dispositivo = await this.selector.elegir();
    if (!dispositivo) {
      return;
    }
    if (dispositivo.esEmulador) {
      await this.emulador(dispositivo);
    } else {
      await this.celular(dispositivo);
    }
  }

  private async celular(dispositivo: Dispositivo): Promise<void> {
    if (!(await this.lockito.estaInstalada(dispositivo.serial))) {
      this.consola.aviso(`${dispositivo.nombre} no tiene Lockito. Te abro su ficha en el Play Store del celu: instalala desde ahí.`);
      await this.lockito.abrirEnPlayStore(dispositivo.serial);
      await this.consola.preguntar('Cuando termine de instalarse, apretá Enter');
      if (!(await this.lockito.estaInstalada(dispositivo.serial)) && !this.terminal.simular) {
        this.consola.error('Todavía no aparece instalada. Probá de nuevo cuando termine.');
        return;
      }
    }

    if (await this.lockito.habilitarComoUbicacionSimulada(dispositivo.serial)) {
      this.consola.ok('Lockito quedó como la app de ubicación simulada del celu.');
    } else {
      this.consola.aviso('No pude habilitarla. Hacelo a mano: Opciones de desarrollador → "App de ubicación simulada" → Lockito.');
    }

    const destino = await this.lockito.copiarRuta(dispositivo.serial, this.ruta.archivo);
    if (destino) {
      this.consola.ok(`La ruta de los ${this.ruta.lugares.length} lugares de Colón quedó en ${destino}.`);
    }
    await this.lockito.abrir(dispositivo.serial);
    this.consola.texto('');
    this.consola.texto('Ahora, en Lockito (ya se abrió en el celu):');
    this.consola.texto('  1. Importá el archivo colon-recorrido.gpx de la carpeta Descargas.');
    this.consola.texto('  2. Tocá Play: el GPS empieza a caminar Colón, desde la Peatonal y la Plaza San Martín.');
    this.consola.texto(this.consola.tenue('  Mi Ciudad ve esa ubicación como si fuera real: el mapa, las distancias y el aviso de proximidad.'));
  }

  private async emulador(dispositivo: Dispositivo): Promise<void> {
    this.consola.texto('¿Qué hacemos con el GPS?');
    const opcion = await this.consola.elegir('Número', ['Dejarlo quieto en un lugar', `Recorrer los ${this.ruta.lugares.length} lugares de Colón`]);

    if (opcion === 0) {
      this.consola.texto('¿Dónde?');
      const plaza = Math.max(0, this.ruta.lugares.findIndex((l) => l.nombre.includes('Plaza San Martín')));
      const nombres = this.ruta.lugares.map((l, i) => (i === plaza ? `${l.nombre} ${this.consola.tenue('(la de los E2E)')}` : l.nombre));
      const elegido = this.ruta.lugares[await this.elegirConDefecto(nombres, plaza)];
      await this.adb.ponerGps(dispositivo.serial, elegido.latitud, elegido.longitud);
      this.consola.ok(`GPS del emulador en ${elegido.nombre}.`);
      return;
    }

    const segundos = Number(await this.consola.preguntar('Segundos en cada lugar', '20')) || 20;
    this.consola.texto(this.consola.tenue('  Ctrl+C corta el recorrido.'));
    const cortar = () => this.recorrido.detener();
    process.on('SIGINT', cortar);
    try {
      await this.recorrido.recorrer(dispositivo.serial, this.ruta.lugares, this.terminal.simular ? 0 : segundos);
    } finally {
      process.off('SIGINT', cortar);
    }
    this.consola.ok('Recorrido terminado.');
  }

  private async elegirConDefecto(opciones: string[], porDefecto: number): Promise<number> {
    opciones.forEach((opcion, i) => this.consola.texto(`  ${String(i + 1).padStart(2)}. ${opcion}`));
    const respuesta = Number(await this.consola.preguntar('Número', String(porDefecto + 1)));
    return Number.isInteger(respuesta) && respuesta >= 1 && respuesta <= opciones.length ? respuesta - 1 : porDefecto;
  }
}
