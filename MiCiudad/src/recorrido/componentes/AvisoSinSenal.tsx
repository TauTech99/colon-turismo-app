// Dueño: D — Recorrido y audioguías
// Tarjeta de estado de la cola: sin señal / subiendo pendientes.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { tipografia, useTema } from '@/compartido/tema';

type Props = {
  online: boolean;
  visitasSinSubir: number;
  fotosSinSubir: number;
};

// Tonos ámbar: borde claro y pie más fuerte; en oscuro, legibles sobre marrón.
const BORDE_CLARO = '#FDE68A';
const BORDE_OSCURO = '#78350F';
const PIE_CLARO = '#B45309';

// Solo dibuja. La subida la hace la cola (colaVisitas) cuando vuelve la red:
// esta tarjeta le cuenta a la persona que no perdió nada.
export function AvisoSinSenal({ online, visitasSinSubir, fotosSinSubir }: Props) {
  const { colores, oscuro } = useTema();

  // Con red y nada pendiente no hay nada que avisar.
  if (online && visitasSinSubir === 0) {
    return null;
  }

  const titulo = online ? 'Subiendo tus visitas…' : 'Sin señal — guardando en el dispositivo';
  const pie = online
    ? 'Volvió la señal: cada visita se guarda en tu cuenta.'
    : 'Todo se sincronizará automáticamente cuando vuelva la señal.';
  const texto = colores.avisoTexto;

  return (
    <View
      style={[
        estilos.caja,
        { backgroundColor: colores.avisoFondo, borderColor: oscuro ? BORDE_OSCURO : BORDE_CLARO },
      ]}
      accessibilityRole="summary"
    >
      <View style={estilos.fila}>
        <Ionicons name={online ? 'cloud-upload-outline' : 'radio-outline'} size={18} color={texto} />
        <Text style={[estilos.titulo, { color: texto }]}>{titulo}</Text>
      </View>

      <View style={estilos.dato}>
        <Text style={[estilos.texto, { color: texto }]}>Visitas sin subir</Text>
        <Text style={[estilos.numero, { color: texto }]}>{visitasSinSubir}</Text>
      </View>
      {/* La fila de fotos solo si hay alguna. */}
      {fotosSinSubir > 0 ? (
        <View style={estilos.dato}>
          <Text style={[estilos.texto, { color: texto }]}>Fotos sin subir</Text>
          <Text style={[estilos.numero, { color: texto }]}>
            {fotosSinSubir} {fotosSinSubir === 1 ? 'foto' : 'fotos'}
          </Text>
        </View>
      ) : null}

      <Text style={[estilos.pie, { color: oscuro ? texto : PIE_CLARO }]}>{pie}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '700',
  },
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  texto: {
    fontSize: tipografia.cuerpo - 2,
  },
  numero: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
  },
  pie: {
    fontSize: tipografia.cuerpo - 3,
  },
});
