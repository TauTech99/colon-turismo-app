import { Stack } from 'expo-router';

import { crearOpcionesEncabezado, useTema } from '@/compartido/tema';

export default function LayoutAuth() {
  const { colores } = useTema();

  return (
    <Stack screenOptions={crearOpcionesEncabezado(colores)}>
      <Stack.Screen name="login" options={{ title: 'Ingresar' }} />
      <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      <Stack.Screen name="desbloquear" options={{ title: 'Desbloquear' }} />
    </Stack>
  );
}
