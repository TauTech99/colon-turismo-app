// Playbook de Mi Ciudad Colón: levanta el proyecto en Windows, Linux o
// macOS con un menú. Uso: node playbook/playbook.ts [comando] [--simular]
//
// Este archivo solo arma las piezas y les pasa lo que necesitan.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Adb } from './android/Adb.ts';
import { Emulador } from './android/Emulador.ts';
import { SelectorDeDispositivo } from './android/SelectorDeDispositivo.ts';
import { RegistroDeComandos } from './comandos/Comando.ts';
import { CorrerTests } from './comandos/CorrerTests.ts';
import { Glosario } from './comandos/Glosario.ts';
import { Instalar } from './comandos/Instalar.ts';
import { Levantar } from './comandos/Levantar.ts';
import { Preparar } from './comandos/Preparar.ts';
import { ReiniciarDatos } from './comandos/ReiniciarDatos.ts';
import { Revisar } from './comandos/Revisar.ts';
import { VerDocumentacion } from './comandos/VerDocumentacion.ts';
import { VerPantalla } from './comandos/VerPantalla.ts';
import { SitioDeDocumentacion } from './documentacion/SitioDeDocumentacion.ts';
import { Menu } from './Menu.ts';
import { Configuracion } from './nucleo/Configuracion.ts';
import { Consola } from './nucleo/Consola.ts';
import { Plataforma } from './nucleo/Plataforma.ts';
import { Proyecto } from './nucleo/Proyecto.ts';
import { Terminal } from './nucleo/Terminal.ts';
import { Api } from './servicios/Api.ts';
import { App } from './servicios/App.ts';
import { Java } from './servicios/Java.ts';
import { Metro } from './servicios/Metro.ts';

async function main(argumentos: string[]): Promise<number> {
  const simular = argumentos.includes('--simular');
  const pedido = argumentos.find((argumento) => !argumento.startsWith('--'));

  const consola = new Consola();
  const plataforma = new Plataforma();
  const terminal = new Terminal(consola, plataforma, simular);
  const carpetaPlaybook = dirname(fileURLToPath(import.meta.url));
  const configuracion = new Configuracion(join(carpetaPlaybook, 'playbook.config.json'));

  const raiz = Proyecto.buscarRaiz(carpetaPlaybook, configuracion.repo);
  if (!raiz) {
    consola.error('No encuentro el repo (una carpeta con MiCiudad/ y api-mi-ciudad/).');
    consola.texto('  Poné la carpeta "playbook" en la raíz del repo, o indicá "repo" en playbook/playbook.config.json.');
    return 1;
  }
  const proyecto = new Proyecto(raiz, carpetaPlaybook, simular);

  const adb = new Adb(terminal, plataforma);
  const emulador = new Emulador(terminal, plataforma, adb);
  const selector = new SelectorDeDispositivo(consola, adb, emulador);
  const java = new Java(terminal, plataforma);
  const api = new Api(terminal, proyecto);
  const app = new App(terminal, proyecto, plataforma);
  const metro = new Metro(terminal, proyecto, configuracion.puertoMetro);

  const registro = new RegistroDeComandos();
  const instalar = new Instalar({ consola, plataforma, selector, adb, app, java });
  registro.agregar(new Revisar({ consola, terminal, plataforma, proyecto, adb, emulador, java, api, metro }));
  registro.agregar(new Preparar({ consola, proyecto, api, app }));
  registro.agregar(new Levantar({ consola, plataforma, terminal, proyecto, configuracion, selector, adb, api, metro, instalar }));
  registro.agregar(instalar);
  registro.agregar(new VerPantalla({ consola, terminal, plataforma, selector }));
  registro.agregar(new CorrerTests({ consola, terminal, plataforma, proyecto, selector, adb, api, app }));
  registro.agregar(new ReiniciarDatos({ consola, api }));
  registro.agregar(new VerDocumentacion({ consola, terminal, plataforma, sitio: new SitioDeDocumentacion(proyecto, registro) }));
  registro.agregar(new Glosario({ consola, registro }));

  if (simular) {
    consola.aviso('Modo simulación: muestra los comandos, pero no cambia nada.');
  }

  if (!pedido) {
    await new Menu(consola, registro, simular).mostrar();
    return 0;
  }
  const comando = registro.buscar(pedido === 'ayuda' ? 'glosario' : pedido);
  if (!comando) {
    consola.error(`No existe el comando "${pedido}".`);
    consola.texto(`  Comandos: ${registro.todos.map((c) => c.nombre).join(', ')}`);
    return 1;
  }
  await comando.ejecutar();
  consola.liberarTeclado();
  return 0;
}

main(process.argv.slice(2)).then(
  (codigo) => process.exit(codigo),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
