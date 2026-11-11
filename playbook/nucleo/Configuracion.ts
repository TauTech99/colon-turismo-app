// Preferencias de esta compu (no se suben): playbook/playbook.config.json.
// Sin el archivo se usan los valores del equipo.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

type Datos = {
  // Carpeta del repo, por si el playbook se corre desde otro lado.
  repo?: string;
  // Puerto de Metro en la PC. El celu siempre lo ve como 8081.
  puertoMetro?: number;
  // Última URL de la API escrita en el .env de la app (para saber si limpiar caché).
  ultimaUrlApi?: string;
};

export class Configuracion {
  private readonly ruta: string;
  private datos: Datos;

  constructor(ruta: string) {
    this.ruta = ruta;
    this.datos = existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as Datos) : {};
  }

  get repo(): string | undefined {
    return process.env.MICIUDAD_REPO ?? this.datos.repo;
  }

  get puertoMetro(): number {
    return Number(process.env.PUERTO_METRO ?? this.datos.puertoMetro ?? 8081);
  }

  get ultimaUrlApi(): string | undefined {
    return this.datos.ultimaUrlApi;
  }

  recordarUrlApi(url: string): void {
    this.datos.ultimaUrlApi = url;
    writeFileSync(this.ruta, `${JSON.stringify(this.datos, null, 2)}\n`);
  }
}
