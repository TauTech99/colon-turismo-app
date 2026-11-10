import { Stack } from 'expo-router';

import { crearOpcionesEncabezado, useTema } from '@/compartido/tema';

export default function LayoutYo() {
  const { colores } = useTema();

  return (
    <Stack screenOptions={crearOpcionesEncabezado(colores)}>
      {/* index dibuja su propio encabezado ("Mi espacio / Yo"). */}
      <Stack.Screen name="index" options={{ title: 'Yo', headerShown: false }} />
      <Stack.Screen name="favoritos" options={{ title: 'Favoritos' }} />
    </Stack>
  );
}
