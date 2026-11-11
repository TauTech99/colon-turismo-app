// El menú numerado: muestra los comandos y corre el elegido.

import type { RegistroDeComandos } from './comandos/Comando.ts';
import type { Consola } from './nucleo/Consola.ts';

export class Menu {
  private readonly consola: Consola;
  private readonly registro: RegistroDeComandos;
  private readonly simular: boolean;

  constructor(consola: Consola, registro: RegistroDeComandos, simular: boolean) {
    this.consola = consola;
    this.registro = registro;
    this.simular = simular;
  }

  async mostrar(): Promise<void> {
    for (;;) {
      this.consola.titulo(`Mi Ciudad Colón · playbook${this.simular ? ' (simulando: no cambia nada)' : ''}`);
      this.registro.todos.forEach((comando, i) => {
        this.consola.texto(`  ${this.consola.resaltado(String(i + 1).padStart(2))}  ${comando.titulo}  ${this.consola.tenue(comando.nombre)}`);
      });
      this.consola.texto(`  ${this.consola.resaltado(' 0')}  Salir`);

      const respuesta = await this.consola.preguntar('\n¿Qué hacemos?', '');
      if (respuesta === '0' || respuesta.toLowerCase() === 'salir') {
        this.consola.liberarTeclado();
        return;
      }
      const comando = this.registro.todos[Number(respuesta) - 1] ?? this.registro.buscar(respuesta.toLowerCase());
      if (!comando) {
        this.consola.aviso('No conozco esa opción.');
        continue;
      }
      try {
        await comando.ejecutar();
      } catch (error) {
        this.consola.error(`Algo falló: ${error instanceof Error ? error.message : String(error)}`);
      }
      await this.consola.preguntar(this.consola.tenue('\nEnter para volver al menú'));
    }
  }
}
