// Dueño: D — Recorrido y audioguías
// Alta de visita (manual / QR / GPS): foto, vibra, SQLite.

import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { invalidarConsultas } from '@/compartido/consulta';
import { useSesion } from '@/cuenta/SesionContext';
import { sincronizarPendientes } from '@/recorrido/colaVisitas';
import { guardarFotoVisita } from '@/recorrido/fotos';
import { claveVisitas } from '@/recorrido/useVisitas';
import { insertarVisita } from '@/recorrido/visitasDb';
import type { OrigenVisita, Visita } from '@/tipos/visita';

// Arma una Visita, la guarda en SQLite y vibra al confirmar.
// Req. 8 de la cátedra: haptics justificado (feedback al registrar).
//
// origen: "manual" (a mano), "qr" (cartel) o "gps" (Estoy acá).
// El hook acepta los tres: el escáner solo pasa origen: "qr".
//
// sincronizada siempre false al guardar. Después se intenta la cola
// (colaVisitas): si hay red, enviarVisita + marcar true; si no, queda.


type DatosRegistro = {
  lugarId: string;
  origen: OrigenVisita;
  // Uri temporal de cámara/galería, o null si no eligió foto.
  uriFotoTemporal: string | null;
  // Texto de la nota; vacío → null (nunca "").
  nota: string | null;
};

// Fecha ISO con zona de Argentina (-03:00). El PRD manda ISO con zona.
// No usamos toISOString() solo (eso termina en Z = UTC).
function fechaIsoAhora(): string {
  const ahora = new Date();
  // Argentina no cambia de huso desde 2009: siempre UTC-3.
  const enColon = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  const iso = enColon.toISOString().slice(0, 19);
  return `${iso}-03:00`;
}

function notaLimpia(texto: string | null): string | null {
  if (texto === null) {
    return null;
  }
  const recortada = texto.trim();
  return recortada === '' ? null : recortada;
}

export function useRegistrarVisita() {
  const { usuario } = useSesion();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registrar(datos: DatosRegistro): Promise<Visita | null> {
    if (!usuario) {
      setError('Necesitás una cuenta para registrar la visita.');
      return null;
    }

    if (guardando) {
      return null;
    }

    setGuardando(true);
    setError(null);

    try {
      const id = `vis-${Date.now()}`;
      let fotoUri: string | null = null;

      if (datos.uriFotoTemporal) {
        fotoUri = await guardarFotoVisita(datos.uriFotoTemporal, id);
      }

      const visita: Visita = {
        id,
        usuarioId: usuario.id,
        lugarId: datos.lugarId,
        fechaHora: fechaIsoAhora(),
        origen: datos.origen,
        fotoUri,
        nota: notaLimpia(datos.nota),
        sincronizada: false,
      };

      await insertarVisita(visita);
      // Recorrido escucha esta clave (useVisitas). Query se entera.
      await invalidarConsultas(claveVisitas(usuario.id));

      // Vibración de “listo”: el turista siente que se guardó
      // aunque no mire la pantalla (sol, una mano).
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Si hay red ahora, la cola sube esta fila (y otras pendientes).
      // Sin red: sincronizarPendientes sale al toque y queda false.
      void sincronizarPendientes(usuario.id);

      return visita;
    } catch (err) {
      console.error('[visitas] No se pudo registrar', err);
      setError('No se pudo guardar la visita. Probá de nuevo.');
      return null;
    } finally {
      setGuardando(false);
    }
  }

  return { registrar, guardando, error };
}
