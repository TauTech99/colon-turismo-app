// Preguntas cortas por HTTP: "¿la API ya responde?", "¿Metro ya arrancó?".

export async function leer(url: string, esperaMs = 2000): Promise<string | null> {
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(esperaMs) });
    return respuesta.ok ? await respuesta.text() : null;
  } catch {
    return null;
  }
}

export async function esperarHasta(condicion: () => Promise<boolean>, esperaMaxima: number): Promise<boolean> {
  const limite = Date.now() + esperaMaxima;
  while (Date.now() < limite) {
    if (await condicion()) {
      return true;
    }
    await new Promise((resolver) => setTimeout(resolver, 1500));
  }
  return false;
}
