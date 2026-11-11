// Lee y cambia un .env sin tocar el resto de las líneas.
// Nunca imprime valores: el .env puede tener claves (Google Maps, JWT).

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

export class ArchivoEnv {
  readonly ruta: string;
  private readonly simular: boolean;

  constructor(ruta: string, simular: boolean) {
    this.ruta = ruta;
    this.simular = simular;
  }

  get existe(): boolean {
    return existsSync(this.ruta);
  }

  valor(clave: string): string | undefined {
    if (!this.existe) {
      return undefined;
    }
    for (const linea of readFileSync(this.ruta, 'utf8').split(/\r?\n/)) {
      const coincide = linea.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
      if (coincide && coincide[1] === clave) {
        return coincide[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    return undefined;
  }

  tieneValor(clave: string): boolean {
    return Boolean(this.valor(clave));
  }

  crearDesde(ejemplo: string): void {
    if (!this.simular) {
      copyFileSync(ejemplo, this.ruta);
    }
  }

  // Reemplaza la línea activa de esa clave o la agrega al final.
  poner(clave: string, valor: string): void {
    if (this.simular) {
      return;
    }
    const lineas = this.existe ? readFileSync(this.ruta, 'utf8').split(/\r?\n/) : [];
    const indice = lineas.findIndex((linea) => new RegExp(`^\\s*${clave}\\s*=`).test(linea));
    if (indice >= 0) {
      lineas[indice] = `${clave}=${valor}`;
    } else {
      if (lineas.length && lineas[lineas.length - 1] === '') {
        lineas.pop();
      }
      lineas.push(`${clave}=${valor}`, '');
    }
    writeFileSync(this.ruta, lineas.join('\n'));
  }
}
