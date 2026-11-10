// Dueño: A — Cuenta y plataforma
// Hook de conexión (expo-network). Banner y offline lo leen de acá.

import { getNetworkStateAsync, useNetworkState, type NetworkState } from 'expo-network';

// Contrato: useRed() → { online }.
// Lo van a usar A (banner), B (caché), C (agenda) y D (cola de visitas).
//
// expo-network avisa si hay red. Al principio los campos pueden
// venir undefined: en ese caso no mostramos el banner (evitamos
// un parpadeo al abrir la app).

function estaOnline(estado: NetworkState): boolean {
  return estado.isConnected !== false && estado.isInternetReachable !== false;
}

export function useRed(): { online: boolean } {
  const estado = useNetworkState();
  return { online: estaOnline(estado) };
}

// El hook, en el primer render, todavía no tiene respuesta y
// estaOnline da true (undefined no es false). Sirve para el banner.
// Para decidir si pedimos el catálogo hace falta el dato de verdad:
// si no, en modo avión el mock respondería igual y no se prueba el caché.
export async function hayRedAhora(): Promise<boolean> {
  const estado = await getNetworkStateAsync();
  return estaOnline(estado);
}
