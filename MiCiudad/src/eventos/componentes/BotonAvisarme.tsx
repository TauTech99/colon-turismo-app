// Dueño: C — Mapa y agenda
// Toggle de recordatorio en el detalle del evento.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

import { BORDE_BOTON, tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { useEventoGuardado } from '@/eventos/useEventoGuardado';
import type { Evento } from '@/tipos/evento';

type Props = {
  evento: Evento;
};

// Un toque: guarda el evento y agenda el recordatorio.
// Si no hay cuenta, exigirCuenta abre el ingreso.
// Solo se puede guardar si está "programado". Si ya lo guardó y
// después se suspende, igual puede quitar el aviso.

export function BotonAvisarme({ evento }: Props) {
  const { colores } = useTema();
  const { exigirCuenta } = useSesion();
  const { estaGuardado, guardar, quitar } = useEventoGuardado(evento.id);
  const [ocupado, setOcupado] = useState(false);

  const sePuedeGuardar = evento.estado === 'programado';

  if (!sePuedeGuardar && !estaGuardado) {
    return null;
  }

  async function alTocar() {
    if (ocupado) {
      return;
    }

    setOcupado(true);
    try {
      const puede = await exigirCuenta();
      if (!puede) {
        return;
      }

      if (estaGuardado) {
        await quitar();
        return;
      }

      const resultado = await guardar(evento);
      if (resultado === 'sinPermiso') {
        // Queda guardado igual: el turista lo ve en la agenda.
        Alert.alert(
          'Evento guardado, pero sin aviso',
          'No diste permiso para las notificaciones, así que no te vamos a poder avisar. Si querés el aviso, activalas en Ajustes.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pressable
      onPress={() => {
        void alTocar();
      }}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityState={{ selected: estaGuardado, disabled: ocupado }}
      accessibilityLabel={estaGuardado ? 'Dejar de avisarme' : 'Avisarme cuando empiece'}
      // Sin guardar: botón principal. Guardado: secundario.
      style={[
        estilos.boton,
        {
          borderColor: colores.primario,
          backgroundColor: estaGuardado ? colores.fondoElevado : colores.primario,
          opacity: ocupado ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={estaGuardado ? 'notifications' : 'notifications-outline'}
        size={26}
        color={estaGuardado ? colores.primario : colores.textoSobrePrimario}
      />
      <Text
        style={[
          estilos.texto,
          { color: estaGuardado ? colores.primario : colores.textoSobrePrimario },
        ]}
      >
        {estaGuardado ? 'Dejar de avisarme' : 'Avisarme'}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 56,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  texto: {
    fontSize: tipografia.boton,
    fontWeight: '700',
  },
});
