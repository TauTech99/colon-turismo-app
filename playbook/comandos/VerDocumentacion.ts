// Abre la documentación del proyecto en el navegador.

import type { SitioDeDocumentacion } from '../documentacion/SitioDeDocumentacion.ts';
import type { Consola } from '../nucleo/Consola.ts';
import type { Plataforma } from '../nucleo/Plataforma.ts';
import type { Terminal } from '../nucleo/Terminal.ts';
import { Comando } from './Comando.ts';

export class VerDocumentacion extends Comando {
  readonly nombre = 'docs';
  readonly titulo = 'Ver la documentación en el navegador';
  readonly queHace =
    'Junta en una sola página la documentación del proyecto (docs/), la guía del playbook, el glosario y la de la API, y la abre en el navegador. Se lee en castellano o inglés, en modo claro u oscuro. Los diagramas se dibujan con internet; sin red se ve su texto.';
  readonly porDetras = [
    'leer docs/*.md, playbook/README.md y api-mi-ciudad/README.md + docs/',
    'escribir <carpeta temporal>/mi-ciudad-documentacion.html',
    'abrirlo: explorer.exe (Windows) · xdg-open (Linux) · open (macOS)',
  ];
  readonly enIngles = {
    titulo: 'Open the documentation in the browser',
    queHace:
      'Puts the project documentation (docs/), the playbook guide, the glossary and the API docs together in one page and opens it in the browser, in Spanish or English and in light or dark mode.',
    porDetras: [
      'read docs/*.md, playbook/README.md and api-mi-ciudad/README.md + docs/',
      'write <temp folder>/mi-ciudad-documentacion.html',
      'open it: explorer.exe (Windows) · xdg-open (Linux) · open (macOS)',
    ],
  };

  private readonly consola: Consola;
  private readonly terminal: Terminal;
  private readonly plataforma: Plataforma;
  private readonly sitio: SitioDeDocumentacion;

  constructor(dependencias: { consola: Consola; terminal: Terminal; plataforma: Plataforma; sitio: SitioDeDocumentacion }) {
    super();
    this.consola = dependencias.consola;
    this.terminal = dependencias.terminal;
    this.plataforma = dependencias.plataforma;
    this.sitio = dependencias.sitio;
  }

  async ejecutar(): Promise<void> {
    this.consola.titulo('Documentación');
    const fuentes = this.sitio.fuentes();
    fuentes.forEach((fuente) =>
      this.consola.texto(`  · ${fuente.titulo.es}${fuente.rutaEn ? this.consola.tenue('  (también en inglés)') : ''}`),
    );
    const archivo = this.sitio.generar();
    const { programa, argumentos } = this.plataforma.comandoAbrir(archivo);
    this.terminal.soltar(programa, argumentos);
    this.consola.ok(`Abierta en el navegador. Si no se abrió, está en: ${archivo}`);
  }
}
