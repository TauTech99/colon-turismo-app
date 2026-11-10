// Dueño: D — Recorrido y audioguías
// Engancha la cola cuando vuelve la red (layout raíz).

import { useEffect, useRef } from 'react';

import { invalidarConsultas } from '@/compartido/consulta';
import { useRed } from '@/compartido/useRed';
import { useSesion } from '@/cuenta/SesionContext';

import { sincronizarPendientes, traerVisitasDeLaCuenta } from './colaVisitas';
import { claveVisitas } from './useVisitas';

// Hook: cuando useRed pasa a online, sube la cola de ESTA cuenta.
// Se monta una sola vez en el layout raíz (como useProximidad).
//
// No dibuja UI: el aviso de pendientes está en Mi recorrido.

export function useSincronizacion(): void {
  const { online } = useRed();
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  // Evita disparar dos veces el mismo “online + esta cuenta”.
  const ultimo = useRef<{ online: boolean; usuarioId: string | null } | null>(null);

  useEffect(() => {
    if (!online || !usuarioId) {
      ultimo.current = { online, usuarioId };
      return;
    }

    const anterior = ultimo.current;
    ultimo.current = { online, usuarioId };
    const recienOnline = !anterior || !anterior.online;
    const cambioDeCuenta = !anterior || anterior.usuarioId !== usuarioId;

    if (!recienOnline && !cambioDeCuenta) {
      return;
    }

    void (async () => {
      const agregadas = await traerVisitasDeLaCuenta(usuarioId);
      if (agregadas > 0) {
        await invalidarConsultas(claveVisitas(usuarioId));
      }
      await sincronizarPendientes(usuarioId);
    })();
  }, [online, usuarioId]);
}
