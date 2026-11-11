// Junta la documentación del proyecto y el glosario del playbook en una
// sola página, en castellano y en inglés, para leer en el navegador.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import type { RegistroDeComandos } from '../comandos/Comando.ts';
import type { Proyecto } from '../nucleo/Proyecto.ts';
import { escapar, Markdown } from './Markdown.ts';
import { IDIOMAS, PaginaHtml, type Contenido, type Idioma, type Seccion } from './PaginaHtml.ts';

// Cada documento puede tener su versión en inglés al lado: README.en.md.
type Fuente = { titulo: Record<Idioma, string>; ruta: string; rutaEn: string | null };

const AVISO_SOLO_CASTELLANO =
  '<blockquote>This document is only available in Spanish. It is shown as is.</blockquote>';

export class SitioDeDocumentacion {
  private readonly proyecto: Proyecto;
  private readonly registro: RegistroDeComandos;
  private readonly pagina = new PaginaHtml();

  constructor(proyecto: Proyecto, registro: RegistroDeComandos) {
    this.proyecto = proyecto;
    this.registro = registro;
  }

  // Orden: documentación general (docs/), guía del playbook + glosario,
  // y al final la referencia de la API (de la cátedra, solo en castellano).
  fuentes(): Fuente[] {
    const { carpetaApi, carpetaPlaybook } = this.proyecto;
    const fijas: Array<[string, string, string]> = [
      [join(carpetaPlaybook, 'README.md'), 'Playbook: cómo levantar el proyecto', 'Playbook: running the project'],
      [join(carpetaApi, 'README.md'), 'API: cómo arrancarla y usarla', 'API: getting started'],
      [join(carpetaApi, 'docs', 'SPECIFICATION.md'), 'API: especificación', 'API: specification'],
      [join(carpetaApi, 'docs', 'DECISIONS.md'), 'API: decisiones', 'API: decisions'],
      [join(carpetaApi, 'docs', 'NOTIFICATIONS.md'), 'API: notificaciones', 'API: notifications'],
    ];
    return [
      ...this.documentacionGeneral(),
      ...fijas.map(([ruta, es, en]) => ({ titulo: { es, en }, ruta, rutaEn: this.versionEnIngles(ruta) })),
    ].filter((fuente) => existsSync(fuente.ruta));
  }

  // Devuelve la ruta del HTML generado (en la carpeta temporal, fuera del repo).
  generar(): string {
    const guiaPlaybook = join(this.proyecto.carpetaPlaybook, 'README.md');
    const secciones: Seccion[] = [];
    this.fuentes().forEach((fuente, i) => {
      secciones.push(this.seccion(fuente, `doc${i}`));
      if (fuente.ruta === guiaPlaybook) {
        secciones.push(this.glosario());
      }
    });
    const destino = join(tmpdir(), 'mi-ciudad-documentacion.html');
    writeFileSync(destino, this.pagina.dibujar(secciones));
    return destino;
  }

  // docs/ en la raíz del repo (y junto al playbook, si se usa desde afuera).
  private documentacionGeneral(): Fuente[] {
    const carpetas = [
      ...new Set([join(this.proyecto.raiz, 'docs'), join(dirname(this.proyecto.carpetaPlaybook), 'docs')].map((c) => resolve(c))),
    ];
    return carpetas
      .filter((carpeta) => existsSync(carpeta))
      .flatMap((carpeta) =>
        readdirSync(carpeta)
          .filter((archivo) => archivo.endsWith('.md') && !archivo.endsWith('.en.md'))
          .sort()
          .map((archivo) => {
            const ruta = join(carpeta, archivo);
            const rutaEn = this.versionEnIngles(ruta);
            const es = this.tituloDe(ruta);
            return { ruta, rutaEn, titulo: { es, en: rutaEn ? this.tituloDe(rutaEn) : es } };
          }),
      );
  }

  private versionEnIngles(ruta: string): string | null {
    const en = ruta.replace(/\.md$/, '.en.md');
    return existsSync(en) ? en : null;
  }

  // El primer "# Título" del archivo; si no tiene, el nombre del archivo.
  private tituloDe(ruta: string): string {
    const primero = readFileSync(ruta, 'utf8').match(/^#\s+(.+)$/m);
    if (primero) {
      return primero[1].trim();
    }
    const nombre = basename(ruta, '.md').replace(/^\d+[-_ ]*/, '').replace(/[-_]/g, ' ');
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  private seccion(fuente: Fuente, id: string): Seccion {
    const contenido = {} as Record<Idioma, Contenido>;
    for (const idioma of IDIOMAS) {
      const ruta = idioma === 'en' && fuente.rutaEn ? fuente.rutaEn : fuente.ruta;
      const markdown = new Markdown(`${idioma}-${id}`);
      // El "# Título" ya va como encabezado de la sección: no se repite.
      const texto = readFileSync(ruta, 'utf8').replace(/^#\s+(.+)\r?\n/, (linea, titulo: string) =>
        titulo.trim() === fuente.titulo[idioma] ? '' : linea,
      );
      const aviso = idioma === 'en' && !fuente.rutaEn ? AVISO_SOLO_CASTELLANO : '';
      contenido[idioma] = {
        titulo: fuente.titulo[idioma],
        html: aviso + markdown.aHtml(texto),
        titulos: markdown.titulos.filter((t) => t.nivel === 2),
      };
    }
    return { id, origen: this.rutaLegible(fuente.ruta), contenido };
  }

  private rutaLegible(ruta: string): string {
    const raiz = resolve(this.proyecto.raiz);
    const absoluta = resolve(ruta);
    const relativa = absoluta.startsWith(raiz)
      ? absoluta.slice(raiz.length + 1)
      : join(basename(dirname(absoluta)), basename(absoluta));
    return relativa.replace(/\\/g, '/');
  }

  private glosario(): Seccion {
    const encabezados: Record<Idioma, [string, string, string, string]> = {
      es: ['Comando', 'Qué hace', 'Qué corre por detrás', 'Cada opción del menú también se corre directo: <code>node playbook/playbook.ts &lt;comando&gt;</code>. Con <code>--simular</code> muestra lo que haría sin cambiar nada.'],
      en: ['Command', 'What it does', 'What it runs behind the scenes', 'Every menu option can also be run directly: <code>node playbook/playbook.ts &lt;command&gt;</code>. With <code>--simular</code> it shows what it would do without changing anything. The terminal itself speaks Spanish.'],
    };
    const contenido = {} as Record<Idioma, Contenido>;
    for (const idioma of IDIOMAS) {
      const [comando, queHace, detras, intro] = encabezados[idioma];
      const filas = this.registro.todos
        .map((c) => {
          const textos = idioma === 'es' ? { titulo: c.titulo, queHace: c.queHace, porDetras: c.porDetras } : c.enIngles;
          return `<tr>
  <td><code>${escapar(c.nombre)}</code><br><span class="tenue">${escapar(textos.titulo)}</span></td>
  <td>${escapar(textos.queHace)}</td>
  <td><ul class="detras">${textos.porDetras.map((linea) => `<li><code>${escapar(linea)}</code></li>`).join('')}</ul></td>
</tr>`;
        })
        .join('\n');
      contenido[idioma] = {
        titulo: idioma === 'es' ? 'Glosario de comandos' : 'Command glossary',
        html: `<p>${intro}</p>
<div class="tabla"><table><thead><tr><th>${comando}</th><th>${queHace}</th><th>${detras}</th></tr></thead><tbody>${filas}</tbody></table></div>`,
        titulos: [],
      };
    }
    return { id: 'glosario', origen: 'playbook', contenido };
  }
}
