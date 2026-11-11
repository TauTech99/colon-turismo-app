// Convierte el Markdown de los README a HTML, sin librerías.
// Cubre lo que usan los documentos del repo: títulos, párrafos, listas,
// tablas, bloques de código, citas, enlaces, negrita y código en línea.

export type Titulo = { nivel: number; texto: string; ancla: string };

export class Markdown {
  private readonly prefijoAnclas: string;
  readonly titulos: Titulo[] = [];

  constructor(prefijoAnclas: string) {
    this.prefijoAnclas = prefijoAnclas;
  }

  aHtml(fuente: string): string {
    const lineas = fuente.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let i = 0;

    while (i < lineas.length) {
      const linea = lineas[i];

      const cerco = linea.match(/^\s*(```|~~~)/);
      if (cerco) {
        const codigo: string[] = [];
        i++;
        while (i < lineas.length && !lineas[i].trim().startsWith(cerco[1])) {
          codigo.push(lineas[i]);
          i++;
        }
        i++;
        const lenguaje = linea.trim().slice(3).trim().toLowerCase();
        html.push(lenguaje === 'mermaid' ? diagrama(codigo.join('\n')) : `<pre><code>${escapar(codigo.join('\n'))}</code></pre>`);
        continue;
      }

      const titulo = linea.match(/^(#{1,6})\s+(.*?)\s*#*$/);
      if (titulo) {
        html.push(this.titulo(titulo[1].length, titulo[2]));
        i++;
        continue;
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(linea)) {
        html.push('<hr>');
        i++;
        continue;
      }

      if (linea.trim().startsWith('|') && /^\s*\|?\s*:?-{2,}/.test(lineas[i + 1] ?? '')) {
        const filas: string[] = [];
        while (i < lineas.length && lineas[i].trim().startsWith('|')) {
          filas.push(lineas[i]);
          i++;
        }
        html.push(this.tabla(filas));
        continue;
      }

      if (/^\s*>/.test(linea)) {
        const cita: string[] = [];
        while (i < lineas.length && /^\s*>/.test(lineas[i])) {
          cita.push(lineas[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        html.push(`<blockquote>${this.enLinea(cita.join(' '))}</blockquote>`);
        continue;
      }

      const item = linea.match(/^\s*([-*+]|\d+[.)])\s+/);
      if (item) {
        const ordenada = /\d/.test(item[1]);
        const items: string[] = [];
        while (i < lineas.length && /^\s*([-*+]|\d+[.)])\s+/.test(lineas[i])) {
          let texto = lineas[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
          i++;
          // Continuación de un ítem en la línea siguiente, con sangría.
          while (i < lineas.length && /^\s{2,}\S/.test(lineas[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lineas[i])) {
            texto += ` ${lineas[i].trim()}`;
            i++;
          }
          items.push(`<li>${this.enLinea(texto.replace(/^\[( |x)\]\s*/i, (m) => (m.includes('x') ? '☑ ' : '☐ ')))}</li>`);
        }
        html.push(ordenada ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
        continue;
      }

      if (!linea.trim()) {
        i++;
        continue;
      }

      const parrafo: string[] = [];
      while (i < lineas.length && lineas[i].trim() && !/^(#{1,6}\s|\s*```|\s*>|\s*([-*+]|\d+[.)])\s+|\s*\|)/.test(lineas[i])) {
        parrafo.push(lineas[i].trim());
        i++;
      }
      html.push(`<p>${this.enLinea(parrafo.join(' '))}</p>`);
    }
    return html.join('\n');
  }

  private titulo(nivel: number, texto: string): string {
    const ancla = `${this.prefijoAnclas}-${this.titulos.length}`;
    this.titulos.push({ nivel, texto: limpiar(texto), ancla });
    return `<h${nivel} id="${ancla}">${this.enLinea(texto)}</h${nivel}>`;
  }

  private tabla(filas: string[]): string {
    const celdas = (fila: string) =>
      fila
        .trim()
        .replace(/^\||\|$/g, '')
        .split(/(?<!\\)\|/)
        .map((celda) => this.enLinea(celda.trim().replace(/\\\|/g, '|')));
    const [cabecera, , ...cuerpo] = filas;
    const th = celdas(cabecera).map((c) => `<th>${c}</th>`).join('');
    const tr = cuerpo.map((fila) => `<tr>${celdas(fila).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="tabla"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
  }

  // Primero se separa el código en línea para no tocar lo que tiene adentro.
  private enLinea(texto: string): string {
    return texto
      .split(/(`[^`]+`)/)
      .map((parte) => {
        if (/^`[^`]+`$/.test(parte)) {
          return `<code>${escapar(parte.slice(1, -1))}</code>`;
        }
        return escapar(parte)
          .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>')
          .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<em>[imagen: $1]</em>')
          .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
          .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');
      })
      .join('');
  }
}

// La página dibuja los diagramas con Mermaid. Sin internet queda el texto
// del diagrama, que igual se entiende.
function diagrama(fuente: string): string {
  return `<figure class="diagrama">
<button type="button" class="ampliar" title="Ver el diagrama en grande">⤢ Ampliar</button>
<pre class="mermaid">${escapar(fuente)}</pre>
</figure>`;
}

export function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function limpiar(texto: string): string {
  return texto.replace(/[`*_]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}
