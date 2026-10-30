// Dueño: A — Cuenta y plataforma
// Reingreso: huella/rostro o contraseña.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';

// Alternativa a la huella: la contraseña de la cuenta (no el PIN del teléfono).
// exigirCuenta() manda acá si no hay sensor, si cancelan o si falla.

export default function PantallaDesbloquear() {
  const { colores } = useTema();
  const { usuario, token, iniciarSesion } = useSesion();
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!usuario || !token) {
      router.replace('/login');
      return;
    }

    if (!contrasena) {
      setError('Escribí tu contraseña.');
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      // El mock de auth.ts ya valida email + contraseña. No se reescribe.
      await iniciarSesion({ email: usuario.email, contrasena });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/yo');
      }
    } catch (errorCapturado) {
      const mensaje =
        errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo desbloquear.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  if (!usuario || !token) {
    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={[estilos.texto, { color: colores.texto }]}>No hay una sesión guardada</Text>
        <Boton titulo="Ingresar" onPress={() => router.replace('/login')} />
      </View>
    );
  }

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
        <Text style={[estilos.texto, { color: colores.texto }]}>Hola, {usuario.nombre}</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Tu sesión sigue guardada. Para entrar a tu cuenta, escribí la contraseña.
        </Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>{usuario.email}</Text>

        <Text style={[estilos.rotulo, { color: colores.texto }]}>Contraseña</Text>
        <View style={estilos.campoConOjo}>
          <TextInput
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Tu contraseña"
            placeholderTextColor={colores.textoSuave}
            secureTextEntry={!mostrarContrasena}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            accessibilityLabel="Contraseña"
            editable={!enviando}
            style={[
              estilos.campo,
              estilos.campoContrasena,
              { color: colores.texto, borderColor: colores.borde, backgroundColor: colores.fondo },
            ]}
          />
          <TouchableOpacity
            onPress={() => setMostrarContrasena(!mostrarContrasena)}
            accessibilityLabel={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            style={estilos.ojo}
            hitSlop={8}
          >
            <Ionicons
              name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
              size={28}
              color={colores.texto}
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={[estilos.error, { color: colores.peligro }]}>{error}</Text> : null}

        <Boton
          titulo={enviando ? 'Desbloqueando…' : 'Desbloquear'}
          onPress={() => void enviar()}
          deshabilitado={enviando}
        />
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
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  texto: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
    textAlign: 'center',
  },
  detalle: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
  rotulo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  campo: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: tipografia.cuerpo,
  },
  campoConOjo: {
    justifyContent: 'center',
  },
  campoContrasena: {
    paddingRight: 56,
  },
  ojo: {
    position: 'absolute',
    right: 4,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
