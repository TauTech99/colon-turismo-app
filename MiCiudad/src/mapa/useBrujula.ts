// Dueño: C — Mapa y agenda
// Magnetómetro → rumbo. Alimenta FlechaDireccion.

import { Magnetometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

import { rumboDelTelefono } from '@/mapa/rumbo';

export type EstadoBrujula = 'pendiente' | 'disponible' | 'no';

// Lee el magnetómetro (expo-sensors) y lo convierte en rumbo.
// Contrato: rumbo null si no hay sensor, si niegan el permiso
// o si todavía no llegó la primera medición. No se cuelga.
// El GPS no vive acá: para apuntar a un lugar hace falta
// useUbicacion + anguloHaciaLugar (PRD §7.2, req. 8).
export function useBrujula(): {
  rumbo: number | null;
  estado: EstadoBrujula;
} {
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoBrujula>('pendiente');

  useEffect(() => {
    let cancelado = false;
    let suscripcion: { remove: () => void } | null = null;

    async function encender() {
      try {
        const haySensor = await Magnetometer.isAvailableAsync();
        if (cancelado) {
          return;
        }

        if (!haySensor) {
          setEstado('no');
          setRumbo(null);
          return;
        }

        const permiso = await Magnetometer.requestPermissionsAsync();
        if (cancelado) {
          return;
        }

        if (!permiso.granted) {
          setEstado('no');
          setRumbo(null);
          return;
        }

        setEstado('disponible');
        Magnetometer.setUpdateInterval(200);
        suscripcion = Magnetometer.addListener((medida) => {
          setRumbo(rumboDelTelefono(medida.x, medida.y));
        });

        if (cancelado) {
          suscripcion.remove();
        }
      } catch (error) {
        console.error('[brujula] No se pudo leer el magnetómetro', error);
        if (!cancelado) {
          setEstado('no');
          setRumbo(null);
        }
      }
    }

    void encender();

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, []);

  return { rumbo, estado };
}
