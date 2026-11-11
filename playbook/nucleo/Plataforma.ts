// Lo único que cambia entre Windows, Linux y macOS: rutas, nombres de
// ejecutables, cómo abrir el navegador y qué sugerir para instalar.

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type SistemaOperativo = 'windows' | 'linux' | 'mac';

export class Plataforma {
  readonly sistema: SistemaOperativo;

  constructor(plataformaNode: string = process.platform) {
    if (plataformaNode === 'win32') {
      this.sistema = 'windows';
    } else if (plataformaNode === 'darwin') {
      this.sistema = 'mac';
    } else {
      this.sistema = 'linux';
    }
  }

  get esWindows(): boolean {
    return this.sistema === 'windows';
  }

  get nombre(): string {
    return { windows: 'Windows', linux: 'Linux', mac: 'macOS' }[this.sistema];
  }

  // En Windows los ejecutables de Android terminan en .exe.
  ejecutable(nombre: string): string {
    return this.esWindows ? `${nombre}.exe` : nombre;
  }

  // Gradle trae un script por sistema: gradlew.bat o gradlew. Va con ruta
  // completa: algunas consolas de Windows no buscan en la carpeta actual.
  gradlew(carpetaAndroid: string): string {
    return join(carpetaAndroid, this.esWindows ? 'gradlew.bat' : 'gradlew');
  }

  // sdkmanager, avdmanager: en Windows son .bat.
  script(nombre: string): string {
    return this.esWindows ? `${nombre}.bat` : nombre;
  }

  // Donde Android Studio guarda los emuladores creados.
  carpetaAvds(): string {
    if (process.env.ANDROID_AVD_HOME) {
      return process.env.ANDROID_AVD_HOME;
    }
    return join(process.env.ANDROID_USER_HOME ?? join(homedir(), '.android'), 'avd');
  }

  carpetaSdkAndroid(): string | null {
    const candidatas = [
      process.env.ANDROID_HOME,
      process.env.ANDROID_SDK_ROOT,
      this.esWindows && process.env.LOCALAPPDATA
        ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
        : undefined,
      this.sistema === 'mac' ? join(homedir(), 'Library', 'Android', 'sdk') : undefined,
      join(homedir(), 'Android', 'Sdk'),
    ];
    for (const carpeta of candidatas) {
      if (carpeta && existsSync(carpeta)) {
        return carpeta;
      }
    }
    return null;
  }

  // Comando para abrir un archivo o una URL con el programa por defecto.
  comandoAbrir(destino: string): { programa: string; argumentos: string[] } {
    if (this.esWindows) {
      return { programa: 'explorer.exe', argumentos: [destino] };
    }
    if (this.sistema === 'mac') {
      return { programa: 'open', argumentos: [destino] };
    }
    return { programa: 'xdg-open', argumentos: [destino] };
  }

  comoInstalar(herramienta: 'java17' | 'pnpm' | 'scrcpy' | 'android' | 'maestro'): string {
    const sugerencias: Record<string, Record<SistemaOperativo, string>> = {
      java17: {
        windows: 'winget install EclipseAdoptium.Temurin.17.JDK  (y JAVA_HOME apuntando a esa carpeta)',
        linux: 'sudo apt install openjdk-17-jdk',
        mac: 'brew install --cask temurin@17',
      },
      pnpm: {
        windows: 'corepack enable  (en una terminal abierta como administrador)',
        linux: 'sudo corepack enable',
        mac: 'corepack enable',
      },
      scrcpy: {
        windows: 'winget install --exact Genymobile.scrcpy',
        linux: 'sudo apt install scrcpy',
        mac: 'brew install scrcpy',
      },
      android: {
        windows: 'Instalar Android Studio: trae el SDK, adb y el emulador',
        linux: 'Instalar Android Studio (o sudo apt install adb para usar solo el celular)',
        mac: 'Instalar Android Studio',
      },
      maestro: {
        windows: 'Descargar maestro.zip de github.com/mobile-dev-inc/maestro/releases y agregar bin/ al PATH',
        linux: 'curl -fsSL "https://get.maestro.mobile.dev" | bash',
        mac: 'curl -fsSL "https://get.maestro.mobile.dev" | bash',
      },
    };
    return sugerencias[herramienta][this.sistema];
  }
}
