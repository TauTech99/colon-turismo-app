// Crea o ajusta el emulador con valores recomendados para esta compu:
// versión de Android de la app, RAM y núcleos según la máquina.

import type { Adb } from '../android/Adb.ts';
import { Avd } from '../android/Avd.ts';
import type { Emulador } from '../android/Emulador.ts';
import type { HerramientasSdk } from '../android/HerramientasSdk.ts';
import { nombreAndroid, type RecomendacionEmulador } from '../android/RecomendacionEmulador.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import { Comando } from './Comando.ts';

const NOMBRE_SUGERIDO = 'MiCiudad_Pixel';

export class ConfigurarEmulador extends Comando {
  readonly nombre = 'emulador';
  readonly titulo = 'Configurar el emulador (RAM y versión de Android)';
  readonly queHace =
    'Crea un emulador con los valores recomendados (la versión de Android contra la que compila la app y la RAM y los núcleos según tu compu), ajusta la RAM de uno que ya existe o le borra los datos para dejarlo como recién creado.';
  readonly porDetras = [
    'leer ~/.android/avd/<nombre>.avd/config.ini',
    'sdkmanager "system-images;android-36;google_apis_playstore;x86_64"  (solo si falta la imagen; la licencia la aceptás vos)',
    'avdmanager create avd --name MiCiudad_Pixel --package <imagen> --device pixel_7',
    'config.ini: hw.ramSize=4096M · vm.heapSize=512M · hw.cpu.ncore=4',
    'emulator -avd <nombre> -wipe-data  (borrar los datos)',
  ];
  readonly enIngles = {
    titulo: 'Set up the emulator (RAM and Android version)',
    queHace:
      'Creates an emulator with recommended values (the Android version the app is built against, and RAM and cores sized to your computer), adjusts the RAM of an existing one, or wipes its data so it is like new.',
    porDetras: [
      'read ~/.android/avd/<name>.avd/config.ini',
      'sdkmanager "system-images;android-36;google_apis_playstore;x86_64"  (only if the image is missing; you accept the license)',
      'avdmanager create avd --name MiCiudad_Pixel --package <image> --device pixel_7',
      'config.ini: hw.ramSize=4096M · vm.heapSize=512M · hw.cpu.ncore=4',
      'emulator -avd <name> -wipe-data  (wipe data)',
    ],
  };

  private readonly consola: Consola;
  private readonly plataforma: Plataforma;
  private readonly terminal: Terminal;
  private readonly adb: Adb;
  private readonly emulador: Emulador;
  private readonly sdk: HerramientasSdk;
  private readonly recomendacion: RecomendacionEmulador;

  constructor(dependencias: {
    consola: Consola;
    plataforma: Plataforma;
    terminal: Terminal;
    adb: Adb;
    emulador: Emulador;
    sdk: HerramientasSdk;
    recomendacion: RecomendacionEmulador;
  }) {
    super();
    this.consola = dependencias.consola;
    this.plataforma = dependencias.plataforma;
    this.terminal = dependencias.terminal;
    this.adb = dependencias.adb;
    this.emulador = dependencias.emulador;
    this.sdk = dependencias.sdk;
    this.recomendacion = dependencias.recomendacion;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Configurar el emulador');
    if (!this.emulador.disponible) {
      this.consola.error('No encuentro el emulador de Android.');
      this.consola.texto(`    → ${this.plataforma.comoInstalar('android')}`);
      return;
    }

    const r = this.recomendacion;
    this.consola.texto(`Recomendado para esta compu (${r.ramDeLaCompuGb} GB de RAM): ${this.consola.resaltado(r.resumen())}.`);
    this.consola.texto(this.consola.tenue(`  ${nombreAndroid(r.api)} es la versión contra la que compila la app. Las versiones preview dan errores que no son del código.`));
    if (r.compuJusta) {
      this.consola.aviso(`Con ${r.ramDeLaCompuGb} GB de RAM, el emulador va a andar lento: conviene el celu por USB.`);
    }

    const avds = (await this.emulador.lista()).map((nombre) => new Avd(this.plataforma.carpetaAvds(), nombre));
    this.mostrar(avds);

    const acciones = ['Crear un emulador nuevo con los valores recomendados'];
    if (avds.length) {
      acciones.push('Ajustar la RAM y los núcleos de un emulador', 'Borrar los datos de un emulador (queda como recién creado)');
    }
    this.consola.texto('\n¿Qué hacemos?');
    const accion = await this.consola.elegir('Número', acciones);
    if (accion === 0) {
      await this.crear(avds);
    } else {
      const avd = await this.elegirAvd(avds);
      if (accion === 1) {
        await this.ajustar(avd);
      } else {
        await this.borrarDatos(avd);
      }
    }
  }

  private mostrar(avds: Avd[]): void {
    if (!avds.length) {
      this.consola.aviso('Todavía no hay emuladores creados.');
      return;
    }
    this.consola.texto('\nEmuladores creados:');
    for (const avd of avds) {
      const linea = `${avd.nombre.padEnd(20)} ${avd.descripcion(nombreAndroid)}`;
      const notas = this.diferencias(avd);
      if (notas.length) {
        this.consola.aviso(`${linea} ${this.consola.tenue(`(${notas.join('; ')})`)}`);
      } else {
        this.consola.ok(linea);
      }
    }
  }

  private diferencias(avd: Avd): string[] {
    const r = this.recomendacion;
    const notas: string[] = [];
    if (avd.api !== r.api) {
      notas.push(`recomendado ${nombreAndroid(r.api)}`);
    }
    if (!avd.ramMb || avd.ramMb < r.ramMb) {
      notas.push(`poca RAM: recomendado ${r.ramMb / 1024} GB`);
    }
    if (!avd.conPlayStore) {
      notas.push('sin Play Store');
    }
    return notas;
  }

  private async elegirAvd(avds: Avd[]): Promise<Avd> {
    this.consola.texto('¿Cuál?');
    return avds[await this.consola.elegir('Número', avds.map((a) => a.nombre))];
  }

  private async crear(avds: Avd[]): Promise<void> {
    const r = this.recomendacion;
    if (!this.sdk.disponibles) {
      this.consola.error('Faltan las "Command-line Tools" del SDK de Android.');
      this.consola.texto('    → Android Studio → Settings → Android SDK → SDK Tools → Android SDK Command-line Tools');
      return;
    }
    const existentes = new Set(avds.map((a) => a.nombre));
    const sugerido = existentes.has(NOMBRE_SUGERIDO) ? `${NOMBRE_SUGERIDO}_2` : NOMBRE_SUGERIDO;
    const nombre = (await this.consola.preguntar('Nombre del emulador', sugerido)).replace(/[^\w.-]/g, '_');
    if (existentes.has(nombre)) {
      this.consola.error(`Ya existe un emulador "${nombre}". Elegí otro nombre o usá "Ajustar".`);
      return;
    }

    if (!this.sdk.imagenInstalada(r.paqueteImagen)) {
      this.consola.texto(`Hay que bajar la imagen de ${nombreAndroid(r.api)} (alrededor de 1,5 GB). Al final te muestra la licencia de Google: se acepta escribiendo "y".`);
      if (!(await this.consola.confirmar('¿La bajo?'))) {
        return;
      }
      if (!(await this.sdk.instalarImagen(r.paqueteImagen))) {
        this.consola.error('No se pudo bajar la imagen. Revisá el mensaje de arriba.');
        return;
      }
    }

    if (!(await this.sdk.crearAvd(nombre, r.paqueteImagen, r.dispositivo))) {
      this.consola.error('avdmanager no pudo crear el emulador. Revisá el mensaje de arriba.');
      return;
    }
    new Avd(this.plataforma.carpetaAvds(), nombre).ajustar(
      { ramMb: r.ramMb, heapMb: r.heapMb, nucleos: r.nucleos, discoGb: r.discoGb },
      this.terminal.simular,
    );
    this.consola.ok(`Listo: ${nombre} con ${r.resumen()}.`);
    this.consola.texto(this.consola.tenue('  Ya aparece en "Levantar" → "Prender un emulador".'));
  }

  private async ajustar(avd: Avd): Promise<void> {
    const r = this.recomendacion;
    if (!(await this.apagadoParaCambiar(avd))) {
      return;
    }
    const ramMb = await this.numero('RAM en MB', r.ramMb, 2048, 8192);
    const nucleos = await this.numero('Núcleos', r.nucleos, 1, 8);
    avd.ajustar({ ramMb, heapMb: r.heapMb, nucleos, discoGb: r.discoGb }, this.terminal.simular);
    this.consola.porDetras(`config.ini de ${avd.nombre}: hw.ramSize=${ramMb}M · vm.heapSize=${r.heapMb}M · hw.cpu.ncore=${nucleos}`);
    this.consola.ok(`${avd.nombre}: ${ramMb / 1024} GB de RAM y ${nucleos} núcleos. Se nota la próxima vez que se prende.`);

    if (avd.api !== r.api) {
      this.consola.aviso(
        `${avd.nombre} tiene ${nombreAndroid(avd.api)}. La versión de Android no se cambia en un emulador que ya existe: va atada a su imagen. Para ${nombreAndroid(r.api)}, usá "Crear un emulador nuevo".`,
      );
    }
  }

  private async borrarDatos(avd: Avd): Promise<void> {
    if (!(await this.consola.confirmar(`Se borran las apps, cuentas y datos de ${avd.nombre}. ¿Seguir?`, false))) {
      return;
    }
    if (!(await this.apagadoParaCambiar(avd))) {
      return;
    }
    this.consola.texto('Prendiendo el emulador con los datos borrados (tarda un par de minutos)…');
    const dispositivo = await this.emulador.arrancar(avd.nombre, { borrarDatos: true });
    if (dispositivo) {
      this.consola.ok(`${avd.nombre} quedó como recién creado y prendido.`);
    } else {
      this.consola.error('El emulador no terminó de arrancar. Probá abrirlo desde Android Studio.');
    }
  }

  // Un emulador prendido no toma cambios en su config: hay que apagarlo antes.
  private async apagadoParaCambiar(avd: Avd): Promise<boolean> {
    const serial = await this.emulador.serialSiEstaPrendido(avd.nombre);
    if (!serial) {
      return true;
    }
    if (!(await this.consola.confirmar(`${avd.nombre} está prendido y hay que apagarlo para cambiarlo. ¿Lo apago?`))) {
      return false;
    }
    await this.adb.apagarEmulador(serial);
    // Espera a que se cierre del todo antes de tocar sus archivos.
    for (let i = 0; i < 20 && !this.terminal.simular && (await this.emulador.serialSiEstaPrendido(avd.nombre)); i++) {
      await new Promise((resolver) => setTimeout(resolver, 1500));
    }
    return true;
  }

  private async numero(pregunta: string, recomendado: number, minimo: number, maximo: number): Promise<number> {
    for (;;) {
      const valor = Number(await this.consola.preguntar(`${pregunta} (recomendado ${recomendado})`, String(recomendado)));
      if (Number.isInteger(valor) && valor >= minimo && valor <= maximo) {
        return valor;
      }
      this.consola.aviso(`Tiene que ser un número entre ${minimo} y ${maximo}.`);
    }
  }
}
