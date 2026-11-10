// Dueño: A — Cuenta y plataforma
// Estrella reutilizable. B/C la importan; viven acá.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BORDE_BOTON, tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { useFavoritos } from '@/cuenta/useFavoritos';

type Props = {
  lugarId: string;
};

// Estrella de un toque. B la pone en el detalle con una línea.
// Si no hay cuenta, exigirCuenta abre el ingreso: el mapa no se tapa.
// Si hay token y no desbloqueó, pide huella o contraseña.

// Estrella dorada al marcar.
const ORO_CLARO = '#B7791F';
const ORO_OSCURO = '#FBBF24';

// Secundario: en la ficha el botón principal es "Guardá este momento".
export function BotonFavorito({ lugarId }: Props) {
  const { colores, oscuro } = useTema();
  const { exigirCuenta } = useSesion();
  const { esFavorito, alternar } = useFavoritos();
  const [ocupado, setOcupado] = useState(false);

  const marcado = esFavorito(lugarId);

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
      await alternar(lugarId);
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
      accessibilityState={{ selected: marcado, disabled: ocupado }}
      accessibilityLabel={marcado ? 'Quitar de favoritos' : 'Marcar como favorito'}
      style={[
        estilos.boton,
        {
          borderColor: colores.primario,
          backgroundColor: colores.fondoElevado,
          opacity: ocupado ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={marcado ? 'star' : 'star-outline'}
        size={26}
        color={marcado ? (oscuro ? ORO_OSCURO : ORO_CLARO) : colores.primario}
      />
      <Text style={[estilos.texto, { color: colores.primario }]}>
        {marcado ? 'En tus favoritos' : 'Marcar favorito'}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 56,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
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
