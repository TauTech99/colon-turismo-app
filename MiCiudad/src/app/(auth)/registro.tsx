// Dueño: A — Cuenta y plataforma
// Alta de cuenta; sesión queda en SecureStore.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Link, router } from 'expo-router';
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

function cerrarPantallasAuth() {
  if (router.canDismiss()) {
    router.dismissAll();
  } else {
    router.replace('/(tabs)/yo');
  }
}

export default function PantallaRegistro() {
  const { colores } = useTema();
  const { registrar } = useSesion();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();

    if (!nombreLimpio || !emailLimpio || !contrasena || !confirmar) {
      setError('Completá todos los campos.');
      return;
    }
    if (!emailLimpio.includes('@')) {
      setError('Ese email no parece válido.');
      return;
    }
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      // "Confirmar contraseña" no viaja: no está en DatosRegistro.
      await registrar({ nombre: nombreLimpio, email: emailLimpio, contrasena });
      cerrarPantallasAuth();
    } catch (errorCapturado) {
      const mensaje =
        errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo crear la cuenta.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  const estiloCampo = [
    estilos.campo,
    { color: colores.texto, borderColor: colores.borde, backgroundColor: colores.fondoElevado },
  ];

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
        <View style={estilos.formulario}>
          <Text style={[estilos.rotulo, { color: colores.texto }]}>Nombre</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre"
            placeholderTextColor={colores.textoSuave}
            autoCapitalize="words"
            autoComplete="name"
            accessibilityLabel="Nombre"
            editable={!enviando}
            style={estiloCampo}
          />

          <Text style={[estilos.rotulo, { color: colores.texto }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@mail.com"
            placeholderTextColor={colores.textoSuave}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            accessibilityLabel="Email"
            editable={!enviando}
            style={estiloCampo}
          />

          <Text style={[estilos.rotulo, { color: colores.texto }]}>Contraseña</Text>
          <View style={estilos.campoConOjo}>
            <TextInput
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Elegí una"
              placeholderTextColor={colores.textoSuave}
              secureTextEntry={!mostrarContrasena}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              accessibilityLabel="Contraseña"
              editable={!enviando}
              style={[estiloCampo, estilos.campoContrasena]}
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

          <Text style={[estilos.rotulo, { color: colores.texto }]}>Confirmar contraseña</Text>
          <View style={estilos.campoConOjo}>
            <TextInput
              value={confirmar}
              onChangeText={setConfirmar}
              placeholder="Repetila"
              placeholderTextColor={colores.textoSuave}
              secureTextEntry={!mostrarConfirmar}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              accessibilityLabel="Confirmar contraseña"
              editable={!enviando}
              style={[estiloCampo, estilos.campoContrasena]}
            />
            <TouchableOpacity
              onPress={() => setMostrarConfirmar(!mostrarConfirmar)}
              accessibilityLabel={
                mostrarConfirmar ? 'Ocultar confirmación' : 'Mostrar confirmación'
              }
              accessibilityRole="button"
              style={estilos.ojo}
              hitSlop={8}
            >
              <Ionicons
                name={mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'}
                size={28}
                color={colores.texto}
              />
            </TouchableOpacity>
          </View>

          {error ? <Text style={[estilos.error, { color: colores.peligro }]}>{error}</Text> : null}

          <Boton
            titulo={enviando ? 'Creando…' : 'Crear cuenta'}
            onPress={enviar}
            deshabilitado={enviando}
          />
        </View>

        <Link href="/login" style={[estilos.enlace, { color: colores.primario }]}>
          Ya tengo cuenta
        </Link>
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
  formulario: {
    gap: 12,
    width: '100%',
  },
  rotulo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  campo: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
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
  enlace: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
