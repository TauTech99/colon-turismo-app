import * as ImagePicker from 'expo-image-picker';
import Storage from 'expo-sqlite/kv-store';

// Borrador de la visita manual mientras se abre la cámara/galería.
//
// En Android (sobre todo teléfonos con poca RAM, como el SM-A145M)
// el sistema a veces MATA la Activity de la app al abrir la cámara.
// Al volver: splash azul (el de app.json) y arranca de cero en el Mapa.
// La foto no se pierde del todo: ImagePicker.getPendingResultAsync()
// la recupera (docs de Expo). Nosotros guardamos el lugarId acá
// para poder volver a visita/nueva.

const CLAVE = 'miciudad.borradorVisita';

export type BorradorVisita = {
  lugarId: string;
  uriFoto: string | null;
};

export async function guardarBorradorVisita(lugarId: string): Promise<void> {
  const borrador: BorradorVisita = { lugarId, uriFoto: null };
  await Storage.setItem(CLAVE, JSON.stringify(borrador));
}

export async function leerBorradorVisita(): Promise<BorradorVisita | null> {
  const crudo = await Storage.getItem(CLAVE);
  if (!crudo) {
    return null;
  }
  try {
    const parseado = JSON.parse(crudo) as BorradorVisita;
    if (typeof parseado.lugarId !== 'string' || parseado.lugarId === '') {
      return null;
    }
    return {
      lugarId: parseado.lugarId,
      uriFoto: typeof parseado.uriFoto === 'string' ? parseado.uriFoto : null,
    };
  } catch {
    return null;
  }
}

export async function guardarUriEnBorrador(uriFoto: string): Promise<void> {
  const actual = await leerBorradorVisita();
  if (!actual) {
    return;
  }
  actual.uriFoto = uriFoto;
  await Storage.setItem(CLAVE, JSON.stringify(actual));
}

export async function borrarBorradorVisita(): Promise<void> {
  await Storage.removeItem(CLAVE);
}

// Llamar al arrancar la app. Si Android mató la Activity, recupera
// la foto y deja el borrador listo para reabrir visita/nueva.
export async function recuperarTrasCamara(): Promise<BorradorVisita | null> {
  const borrador = await leerBorradorVisita();
  if (!borrador) {
    return null;
  }

  try {
    const pendiente = await ImagePicker.getPendingResultAsync();
    if (
      pendiente &&
      'canceled' in pendiente &&
      pendiente.canceled === false &&
      pendiente.assets &&
      pendiente.assets[0]?.uri
    ) {
      borrador.uriFoto = pendiente.assets[0].uri;
      await Storage.setItem(CLAVE, JSON.stringify(borrador));
      console.log('[visitas] Foto recuperada tras reinicio de Android');
    }
  } catch (error) {
    console.error('[visitas] No se pudo leer getPendingResultAsync', error);
  }

  return borrador;
}
