// Habla con el celular o el emulador por adb (Android Debug Bridge).

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';

export type Dispositivo = {
  serial: string;
  nombre: string;
  esEmulador: boolean;
};

export class Adb {
  private readonly terminal: Terminal;
  readonly programa: string;

  constructor(terminal: Terminal, plataforma: Plataforma) {
    this.terminal = terminal;
    const sdk = plataforma.carpetaSdkAndroid();
    const enSdk = sdk ? join(sdk, 'platform-tools', plataforma.ejecutable('adb')) : null;
    this.programa = enSdk && existsSync(enSdk) ? enSdk : 'adb';
  }

  async disponible(): Promise<boolean> {
    const { codigo } = await this.terminal.consultar(this.programa, ['version']);
    return codigo === 0;
  }

  async dispositivos(): Promise<Dispositivo[]> {
    const { codigo, salida } = await this.terminal.consultar(this.programa, ['devices', '-l']);
    if (codigo !== 0) {
      return [];
    }
    return salida
      .split(/\r?\n/)
      .slice(1)
      .map((linea) => linea.trim().split(/\s+/))
      .filter((partes) => partes[1] === 'device')
      .map((partes) => {
        const serial = partes[0];
        const modelo = partes.find((parte) => parte.startsWith('model:'))?.slice(6).replace(/_/g, ' ');
        const esEmulador = serial.startsWith('emulator-');
        return { serial, esEmulador, nombre: modelo ?? (esEmulador ? 'Emulador' : serial) };
      });
  }

  // El celu llama a localhost:puertoCelu y adb lo manda a la PC por el cable.
  async redirigir(serial: string, puertoCelu: number, puertoPc: number): Promise<boolean> {
    const { codigo } = await this.terminal.ejecutar(this.programa, ['-s', serial, 'reverse', `tcp:${puertoCelu}`, `tcp:${puertoPc}`], { sinSalida: true });
    return codigo === 0;
  }

  async estaInstalada(serial: string, paquete: string): Promise<boolean> {
    const { salida } = await this.terminal.consultar(this.programa, ['-s', serial, 'shell', 'pm', 'list', 'packages', paquete]);
    return salida.split(/\r?\n/).some((linea) => linea.trim() === `package:${paquete}`);
  }

  async abrirApp(serial: string, paquete: string): Promise<void> {
    await this.terminal.ejecutar(this.programa, ['-s', serial, 'shell', 'monkey', '-p', paquete, '-c', 'android.intent.category.LAUNCHER', '1'], { sinSalida: true });
  }

  async instalarApk(serial: string, archivo: string): Promise<{ ok: boolean; firmaDistinta: boolean }> {
    const { codigo, salida } = await this.terminal.ejecutar(this.programa, ['-s', serial, 'install', '-r', archivo]);
    return { ok: codigo === 0, firmaDistinta: salida.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE') };
  }

  async desinstalar(serial: string, paquete: string): Promise<void> {
    await this.terminal.ejecutar(this.programa, ['-s', serial, 'uninstall', paquete]);
  }

  // arm64-v8a (casi todos los celus) o x86_64 (emulador en una PC).
  async arquitectura(serial: string): Promise<string> {
    const { salida } = await this.terminal.consultar(this.programa, ['-s', serial, 'shell', 'getprop', 'ro.product.cpu.abi']);
    return salida.trim() || 'arm64-v8a';
  }

  async terminoDeArrancar(serial: string): Promise<boolean> {
    const { salida } = await this.terminal.consultar(this.programa, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']);
    return salida.trim() === '1';
  }

  // Solo emulador: fija la ubicación. Usa proveedores de prueba de Android
  // (lo mismo que Maestro): `emu geo fix` no llega a la app en las imágenes
  // nuevas, porque solo mueve el GPS y la app pide ubicación por red.
  async ponerGps(serial: string, latitud: number, longitud: number): Promise<void> {
    const shell = ['-s', serial, 'shell'];
    this.terminal.mostrar(`adb -s ${serial} shell cmd location providers set-test-provider-location gps|network|fused --location ${latitud},${longitud}`);
    if (this.terminal.simular) {
      return;
    }
    await this.terminal.consultar(this.programa, [...shell, 'appops', 'set', 'com.android.shell', 'android:mock_location', 'allow']);
    let funciono = true;
    for (const proveedor of ['gps', 'network', 'fused']) {
      // Si ya existe, add-test-provider falla: no importa.
      await this.terminal.consultar(this.programa, [...shell, 'cmd', 'location', 'providers', 'add-test-provider', proveedor]);
      await this.terminal.consultar(this.programa, [...shell, 'cmd', 'location', 'providers', 'set-test-provider-enabled', proveedor, 'true']);
      const { codigo, salida } = await this.terminal.consultar(this.programa, [
        ...shell, 'cmd', 'location', 'providers', 'set-test-provider-location', proveedor,
        '--location', `${latitud},${longitud}`, '--accuracy', '5',
      ]);
      funciono &&= codigo === 0 && !/unknown|error|exception/i.test(salida);
    }
    // Android 11 o anterior no tiene esos comandos: queda el GPS de la consola del emulador.
    if (!funciono) {
      await this.terminal.consultar(this.programa, ['-s', serial, 'emu', 'geo', 'fix', String(longitud), String(latitud)]);
    }
  }

  // Solo emulador: qué AVD es ("MiCiudad_Pixel").
  async nombreAvd(serial: string): Promise<string | null> {
    const { codigo, salida } = await this.terminal.consultar(this.programa, ['-s', serial, 'emu', 'avd', 'name']);
    return codigo === 0 ? (salida.split(/\r?\n/)[0]?.trim() ?? null) : null;
  }

  // Solo emulador: lo apaga.
  async apagarEmulador(serial: string): Promise<void> {
    await this.terminal.ejecutar(this.programa, ['-s', serial, 'emu', 'kill'], { sinSalida: true });
  }

  // Celu real: deja que Maestro simule el GPS.
  async permitirUbicacionSimulada(serial: string): Promise<void> {
    await this.terminal.consultar(this.programa, ['-s', serial, 'shell', 'appops', 'set', 'dev.mobile.maestro', 'android:mock_location', 'allow']);
  }

  // Solo emulador: el tutorial del lápiz tapa el teclado al escribir.
  async apagarTutorialLapiz(serial: string): Promise<void> {
    await this.terminal.consultar(this.programa, ['-s', serial, 'shell', 'settings', 'put', 'secure', 'stylus_handwriting_enabled', '0']);
  }
}
