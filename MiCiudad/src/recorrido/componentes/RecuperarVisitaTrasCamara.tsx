import { router } from 'expo-router';
import { useEffect } from 'react';

import { borrarBorradorVisita, recuperarTrasCamara } from '@/recorrido/borradorVisita';

// Si Android mató la app al abrir la cámara, al volver caemos
// en el Mapa con el splash azul. Este componente (invisible)
// recupera la foto y reabre visita/nueva.
// Solo navega si hay foto: un borrador vacío no debe abrir la pantalla.

export function RecuperarVisitaTrasCamara() {
  useEffect(() => {
    let vivo = true;

    void (async () => {
      const borrador = await recuperarTrasCamara();
      if (!vivo) {
        return;
      }

      if (!borrador) {
        return;
      }

      if (!borrador.uriFoto) {
        // Quedó un borrador sin foto (abrió cámara y canceló, o quedó viejo).
        await borrarBorradorVisita();
        return;
      }

      router.push({
        pathname: '/visita/nueva',
        params: { lugarId: borrador.lugarId },
      });
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return null;
}
