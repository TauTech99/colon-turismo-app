// Lista cada comando: qué hace y qué corre por detrás.

import type { Consola } from '../nucleo/Consola.ts';
import { Comando, type RegistroDeComandos } from './Comando.ts';

export class Glosario extends Comando {
  readonly nombre = 'glosario';
  readonly titulo = 'Glosario: qué hace cada comando';
  readonly queHace = 'Muestra esta lista: para qué sirve cada opción y qué comandos corre por detrás, para poder hacerlo también a mano.';
  readonly porDetras = ['(nada: solo muestra texto)'];
  readonly enIngles = {
    titulo: 'Glossary: what each command does',
    queHace:
      'Shows this list: what each option is for and which commands it runs behind the scenes, so you can also do it by hand.',
    porDetras: [
      '(nothing: it only prints text)',
    ],
  };

  private readonly consola: Consola;
  private readonly registro: RegistroDeComandos;

  constructor(dependencias: { consola: Consola; registro: RegistroDeComandos }) {
    super();
    this.consola = dependencias.consola;
    this.registro = dependencias.registro;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Glosario');
    this.consola.texto(this.consola.tenue('Cada opción del menú también se corre directo: node playbook/playbook.ts <comando>'));
    this.registro.todos.forEach((comando, i) => {
      this.consola.texto();
      this.consola.texto(`${i + 1}. ${this.consola.resaltado(comando.nombre)} — ${comando.titulo}`);
      this.consola.texto(`   ${comando.queHace}`);
      this.consola.texto(this.consola.tenue('   Por detrás:'));
      comando.porDetras.forEach((linea) => this.consola.porDetras(linea));
    });
  }
}
