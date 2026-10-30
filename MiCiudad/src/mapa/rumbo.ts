// Dueño: C — Mapa y agenda
// Funciones puras: rumbo del teléfono y ángulo hacia el lugar.

import type { Coordenadas } from '@/tipos/lugar';

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// El magnetómetro entrega el campo magnético en microteslas (μT)
// sobre tres ejes. Con el teléfono plano, X es la derecha e Y es
// la parte de arriba. Esta cuenta pasa esos dos números a un rumbo:
// 0 = el borde de arriba apunta al norte magnético, 90 = al este.
// No usa Z: es una brújula 2D, como si el aparato estuviera apoyado.
export function rumboDelTelefono(x: number, y: number): number {
  const grados = (Math.atan2(-x, y) * 180) / Math.PI;
  return (grados + 360) % 360;
}

// Ángulo desde `desde` hacia `hasta`, en grados.
// 0 = el lugar queda al norte, 90 = al este, 180 = al sur, 270 = al oeste.
// Es una función pura: mismos puntos → mismo número. No pide GPS ni sensor.
export function anguloHaciaLugar(desde: Coordenadas, hasta: Coordenadas): number {
  const latDesde = aRadianes(desde.latitud);
  const latHasta = aRadianes(hasta.latitud);
  const deltaLng = aRadianes(hasta.longitud - desde.longitud);

  const y = Math.sin(deltaLng) * Math.cos(latHasta);
  const x =
    Math.cos(latDesde) * Math.sin(latHasta) -
    Math.sin(latDesde) * Math.cos(latHasta) * Math.cos(deltaLng);

  const grados = (Math.atan2(y, x) * 180) / Math.PI;
  return (grados + 360) % 360;
}

// Cuánto hay que girar una flecha que "mira" hacia arriba
// para que apunte al lugar. Si el lugar queda al norte y el
// teléfono también mira al norte, da 0: la flecha sigue para arriba.
export function rotacionFlecha(anguloLugar: number, rumboTelefono: number): number {
  return (anguloLugar - rumboTelefono + 360) % 360;
}
