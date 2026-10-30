// Dueño: A — Cuenta y plataforma
// Pantalla de login (form en cuenta/componentes).

import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';
import { FormLogin } from '@/cuenta/componentes/FormLogin';

export default function PantallaLogin() {
  const { colores } = useTema();

  return (
    <KeyboardAvoidingView
      style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
          Para probar: lucia@mail.com / lucia1234
        </Text>
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
          Mapa y lugares se ven sin cuenta. Favoritos, recorrido y eventos guardados piden sesión.
        </Text>

        <FormLogin />

        <Boton titulo="Crear cuenta" onPress={() => router.push('/registro')} variante="secundario" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
  },
});
