// Vuelve la base de la API a los datos de demo de la cátedra.

import type { Consola } from '../nucleo/Consola.ts';
import type { Api } from '../servicios/Api.ts';
import { Comando } from './Comando.ts';

export class ReiniciarDatos extends Comando {
  readonly nombre = 'reiniciar';
  readonly titulo = 'Volver los datos de demo a cero';
  readonly queHace =
    'Borra las cuentas, visitas y guardados que se crearon probando y vuelve a cargar los datos de demo (3 usuarios, 27 lugares, 8 eventos). Útil antes de una demo.';
  readonly porDetras = ['cd api-mi-ciudad && pnpm db:reiniciar'];
  readonly enIngles = {
    titulo: 'Reset the demo data',
    queHace:
      'Deletes the accounts, visits and saved items created while testing and reloads the demo data (3 users, 27 places, 8 events). Useful before a demo.',
    porDetras: [
      'cd api-mi-ciudad && pnpm db:reiniciar',
    ],
  };

  private readonly consola: Consola;
  private readonly api: Api;

  constructor(dependencias: { consola: Consola; api: Api }) {
    super();
    this.consola = dependencias.consola;
    this.api = dependencias.api;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Volver los datos a cero');
    if (!(await this.consola.confirmar('Se borra todo lo creado probando. ¿Seguir?', false))) {
      return;
    }
    if (await this.api.cargarDatosDeDemo()) {
      this.consola.ok('Datos de demo cargados. Usuarios: lucia@mail.com / lucia1234 y nuevo@demo.ar / nuevo1234.');
    } else {
      this.consola.error('No se pudo. Revisá el mensaje de arriba.');
    }
  }
}
