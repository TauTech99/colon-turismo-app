// Dueño: B — Lugares y datos
// Fotos empaquetadas de los lugares (ficha y tarjetas del listado).

import type { ImageSource } from 'expo-image';

// Metro necesita un require() escrito a mano por cada archivo.
// El mock guarda URLs como las de la API; acá se busca la foto por el
// nombre del archivo (lo que va después de la última /).
const FOTOS_LOCALES: Record<string, ImageSource> = {
  'anfiteatro.jpg': require('../../assets/fotos-lugares/anfiteatro.jpg'),
  'bodega.jpg': require('../../assets/fotos-lugares/bodega.jpg'),
  'casa-cultura.jpg': require('../../assets/fotos-lugares/casa-cultura.jpg'),
  'feria.jpg': require('../../assets/fotos-lugares/feria.jpg'),
  'hotel-plaza.jpg': require('../../assets/fotos-lugares/hotel-plaza.jpg'),
  'iglesia.jpg': require('../../assets/fotos-lugares/iglesia.jpg'),
  'molino-1.jpg': require('../../assets/fotos-lugares/molino-1.jpg'),
  'palmar-1.jpg': require('../../assets/fotos-lugares/palmar-1.jpg'),
  'palmar-2.jpg': require('../../assets/fotos-lugares/palmar-2.jpg'),
  'parrilla.jpg': require('../../assets/fotos-lugares/parrilla.jpg'),
  'playa-norte.jpg': require('../../assets/fotos-lugares/playa-norte.jpg'),
  'puerto-viejo.jpg': require('../../assets/fotos-lugares/puerto-viejo.jpg'),
  'termas-1.jpg': require('../../assets/fotos-lugares/termas-1.jpg'),
};

export function fuenteFoto(url: string): ImageSource | null {
  const archivo = url.split('/').pop();
  if (!archivo) {
    return null;
  }
  const local = FOTOS_LOCALES[archivo];
  if (local) {
    return local;
  }
  // Las fotos de la API (/archivos/hot-springs-1.png…) no tienen copia
  // empaquetada: se muestran desde la URL. expo-image las guarda en su
  // caché de disco, así después también se ven sin señal.
  // Una URL que no es http(s) no se puede mostrar: null y se usa el color.
  return /^https?:\/\//.test(url) ? { uri: url, cacheKey: url } : null;
}
