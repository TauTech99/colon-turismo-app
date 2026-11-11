// Cada opción del menú es un Comando. Además de ejecutarse, se describe
// sola: con estos datos se arman el menú, el glosario y la documentación.

export type TextosEnIngles = {
  titulo: string;
  queHace: string;
  porDetras: string[];
};

export abstract class Comando {
  // Lo que se escribe en la terminal: `node playbook/playbook.ts <nombre>`.
  abstract readonly nombre: string;
  // Cómo aparece en el menú.
  abstract readonly titulo: string;
  // Para qué sirve, en una o dos oraciones.
  abstract readonly queHace: string;
  // Los comandos que corre por detrás, en orden.
  abstract readonly porDetras: string[];
  // Lo mismo en inglés, para la documentación (la terminal habla en castellano).
  abstract readonly enIngles: TextosEnIngles;

  abstract ejecutar(): Promise<void>;
}

export class RegistroDeComandos {
  private readonly comandos: Comando[] = [];

  agregar(comando: Comando): void {
    this.comandos.push(comando);
  }

  get todos(): readonly Comando[] {
    return this.comandos;
  }

  buscar(nombre: string): Comando | undefined {
    return this.comandos.find((comando) => comando.nombre === nombre);
  }
}
