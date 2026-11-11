// Todo lo que se escribe o se pregunta en la terminal pasa por acá.

import { createInterface, type Interface } from 'node:readline/promises';

const conColor = process.stdout.isTTY && !process.env.NO_COLOR;

function pintar(codigo: string, texto: string): string {
  return conColor ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;
}

export class Consola {
  private lector: Interface | null = null;
  // Si la entrada viene de un archivo o un pipe y se terminó, se usan los valores por defecto.
  private entradaTerminada = false;

  titulo(texto: string): void {
    console.log(`\n${pintar('1;33', texto)}\n${pintar('2', '─'.repeat(Math.min(texto.length, 60)))}`);
  }

  texto(texto = ''): void {
    console.log(texto);
  }

  ok(texto: string): void {
    console.log(`${pintar('32', '✔')} ${texto}`);
  }

  aviso(texto: string): void {
    console.log(`${pintar('33', '!')} ${texto}`);
  }

  error(texto: string): void {
    console.log(`${pintar('31', '✖')} ${texto}`);
  }

  // Para mostrar qué se ejecuta por detrás (lo que haría una persona a mano).
  porDetras(comando: string): void {
    console.log(pintar('2', `  ▸ ${comando}`));
  }

  tenue(texto: string): string {
    return pintar('2', texto);
  }

  resaltado(texto: string): string {
    return pintar('1;36', texto);
  }

  async preguntar(pregunta: string, porDefecto = ''): Promise<string> {
    const sufijo = porDefecto ? pintar('2', ` [${porDefecto}]`) : '';
    if (this.entradaTerminada) {
      this.texto(`${pregunta}${sufijo}: ${porDefecto}`);
      return porDefecto;
    }
    try {
      const respuesta = (await this.abrirLector().question(`${pregunta}${sufijo}: `)).trim();
      return respuesta || porDefecto;
    } catch {
      this.entradaTerminada = true;
      this.texto();
      return porDefecto;
    }
  }

  async confirmar(pregunta: string, porDefecto = true): Promise<boolean> {
    const opciones = porDefecto ? 'S/n' : 's/N';
    const respuesta = (await this.preguntar(`${pregunta} (${opciones})`)).toLowerCase();
    if (!respuesta) {
      return porDefecto;
    }
    return respuesta.startsWith('s') || respuesta.startsWith('y');
  }

  // Devuelve el índice elegido (0..n-1).
  async elegir(pregunta: string, opciones: string[]): Promise<number> {
    if (opciones.length === 1) {
      return 0;
    }
    opciones.forEach((opcion, i) => this.texto(`  ${pintar('1', String(i + 1))}. ${opcion}`));
    for (;;) {
      const respuesta = Number(await this.preguntar(pregunta, '1'));
      if (Number.isInteger(respuesta) && respuesta >= 1 && respuesta <= opciones.length) {
        return respuesta - 1;
      }
      this.aviso(`Elegí un número del 1 al ${opciones.length}.`);
    }
  }

  // Un proceso que usa la terminal (Metro, Gradle) necesita el teclado libre.
  liberarTeclado(): void {
    this.lector?.close();
    this.lector = null;
  }

  private abrirLector(): Interface {
    if (!this.lector) {
      const lector = createInterface({ input: process.stdin, output: process.stdout });
      lector.on('close', () => {
        if (process.stdin.readableEnded) {
          this.entradaTerminada = true;
        }
        if (this.lector === lector) {
          this.lector = null;
        }
      });
      this.lector = lector;
    }
    return this.lector;
  }
}
