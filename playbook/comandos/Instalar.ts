// Instala Mi Ciudad en el celular o el emulador.

import { existsSync } from 'node:fs';

import type { Adb, Dispositivo } from '../android/Adb.ts';
import type { SelectorDeDispositivo } from '../android/SelectorDeDispositivo.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import { PAQUETE_ANDROID } from '../nucleo/Proyecto.ts';
import type { App } from '../servicios/App.ts';
import { VERSION_JAVA_DEL_PROYECTO, type Java } from '../servicios/Java.ts';
import { Comando } from './Comando.ts';

type Instalacion = () => Promise<{ ok: boolean; firmaDistinta: boolean }>;

export class Instalar extends Comando {
  readonly nombre = 'instalar';
  readonly titulo = 'Instalar la app en el celu o el emulador';
  readonly queHace =
    'Compila el build de desarrollo con Gradle (JDK 17) y lo instala, o instala un APK que ya tengas (por ejemplo el preview de EAS). Se hace una vez por equipo, o cuando cambia algo nativo.';
  readonly porDetras = [
    'adb shell getprop ro.product.cpu.abi  (para compilar solo esa arquitectura)',
    'npx expo prebuild --platform android  (solo si no existe MiCiudad/android)',
    'cd MiCiudad/android && ANDROID_SERIAL=<equipo> gradlew app:installDebug -PreactNativeArchitectures=<abi>',
    'o bien: adb -s <equipo> install -r <archivo.apk>',
  ];
  readonly enIngles = {
    titulo: 'Install the app on the phone or emulator',
    queHace:
      'Builds the development build with Gradle (JDK 17) and installs it, or installs an APK you already have (for example the EAS preview). Needed once per device, or when something native changes.',
    porDetras: [
      'adb shell getprop ro.product.cpu.abi  (to build only that architecture)',
      'npx expo prebuild --platform android  (only if MiCiudad/android is missing)',
      'cd MiCiudad/android && ANDROID_SERIAL=<device> gradlew app:installDebug -PreactNativeArchitectures=<abi>',
      'or: adb -s <device> install -r <file.apk>',
    ],
  };

  private readonly consola: Consola;
  private readonly plataforma: Plataforma;
  private readonly selector: SelectorDeDispositivo;
  private readonly adb: Adb;
  private readonly app: App;
  private readonly java: Java;

  constructor(dependencias: {
    consola: Consola;
    plataforma: Plataforma;
    selector: SelectorDeDispositivo;
    adb: Adb;
    app: App;
    java: Java;
  }) {
    super();
    this.consola = dependencias.consola;
    this.plataforma = dependencias.plataforma;
    this.selector = dependencias.selector;
    this.adb = dependencias.adb;
    this.app = dependencias.app;
    this.java = dependencias.java;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Instalar Mi Ciudad');
    const dispositivo = await this.selector.elegir();
    if (dispositivo) {
      await this.instalarEn(dispositivo);
    }
  }

  // También lo usa "levantar" cuando la app no está instalada.
  async instalarEn(dispositivo: Dispositivo): Promise<boolean> {
    this.consola.texto('¿Qué instalo?');
    const opcion = await this.consola.elegir('Número', [
      'El build de desarrollo (compila en esta compu; la primera vez tarda unos 10 minutos)',
      'Un APK que ya tengo (por ejemplo el preview de EAS)',
    ]);
    const instalacion = opcion === 0 ? await this.buildDeDesarrollo(dispositivo) : await this.apk(dispositivo);
    if (!instalacion) {
      return false;
    }

    let resultado = await instalacion();
    if (!resultado.ok && resultado.firmaDistinta) {
      this.consola.aviso('Ya hay otra Mi Ciudad instalada con otra firma (por ejemplo el APK preview).');
      if (await this.consola.confirmar('¿La desinstalo? Se borran los datos de esa app en el equipo', false)) {
        await this.adb.desinstalar(dispositivo.serial, PAQUETE_ANDROID);
        resultado = await instalacion();
      }
    }

    if (resultado.ok) {
      this.consola.ok(`Mi Ciudad quedó instalada en ${dispositivo.nombre}.`);
    } else {
      this.consola.error('No se pudo instalar. Revisá el mensaje de arriba.');
    }
    return resultado.ok;
  }

  private async buildDeDesarrollo(dispositivo: Dispositivo): Promise<Instalacion | null> {
    const version = await this.java.version();
    if (version !== VERSION_JAVA_DEL_PROYECTO) {
      this.consola.error(`Para compilar hace falta Java ${VERSION_JAVA_DEL_PROYECTO} y encontré ${version ? `Java ${version}` : 'ninguno'}.`);
      this.consola.texto(this.consola.tenue(`    → ${this.plataforma.comoInstalar('java17')}`));
      return null;
    }
    const arquitectura = await this.adb.arquitectura(dispositivo.serial);
    this.consola.texto(`Compilando para ${arquitectura}…`);
    this.consola.liberarTeclado();
    return () => this.app.compilarEInstalar(dispositivo.serial, arquitectura);
  }

  private async apk(dispositivo: Dispositivo): Promise<Instalacion | null> {
    const archivo = (await this.consola.preguntar('Ruta del archivo .apk')).replace(/^["']|["']$/g, '');
    if (!existsSync(archivo)) {
      this.consola.error('No encuentro ese archivo.');
      return null;
    }
    return () => this.adb.instalarApk(dispositivo.serial, archivo);
  }
}
