// Reenvía conexiones de un puerto a otro dentro de la PC.
// Hace falta en dos casos:
//  - En Windows, `adb reverse` entra por ::1 (IPv6) y la API solo escucha IPv4.
//  - Si Metro no usa el 8081, el emulador igual lo busca en el 8081.

import { connect, createServer, type Server } from 'node:net';

export class PuenteTcp {
  private readonly desdeHost: string;
  private readonly desdePuerto: number;
  private readonly haciaPuerto: number;
  private servidor: Server | null = null;

  constructor(desdeHost: string, desdePuerto: number, haciaPuerto: number) {
    this.desdeHost = desdeHost;
    this.desdePuerto = desdePuerto;
    this.haciaPuerto = haciaPuerto;
  }

  get descripcion(): string {
    return `${this.desdeHost}:${this.desdePuerto} → 127.0.0.1:${this.haciaPuerto}`;
  }

  // false si el puerto ya está en uso (otro programa ya lo atiende) o no hay IPv6.
  abrir(): Promise<boolean> {
    return new Promise((resolver) => {
      const servidor = createServer((cliente) => {
        const destino = connect(this.haciaPuerto, '127.0.0.1');
        cliente.pipe(destino).pipe(cliente);
        destino.on('error', () => cliente.destroy());
        cliente.on('error', () => destino.destroy());
      });
      servidor.once('error', () => resolver(false));
      servidor.listen(this.desdePuerto, this.desdeHost, () => {
        this.servidor = servidor;
        resolver(true);
      });
    });
  }

  cerrar(): void {
    this.servidor?.close();
    this.servidor = null;
  }
}
