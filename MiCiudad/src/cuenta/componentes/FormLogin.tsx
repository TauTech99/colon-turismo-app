import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { Boton } from '@/compartido/componentes/Boton';
import { tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { leerUltimoEmail, olvidarUltimoEmail } from '@/cuenta/secure-store';

function cerrarPantallasAuth() {
  if (router.canDismiss()) {
    router.dismissAll();
  } else {
    router.replace('/(tabs)/yo');
  }
}

export function FormLogin() {
  const { colores } = useTema();
  const { iniciarSesion } = useSesion();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // true = el email vino guardado de la última vez (se muestra "Usar otro email").
  const [recordado, setRecordado] = useState(false);

  // Si ya entró antes en este teléfono, el email aparece escrito:
  // después de cerrar sesión solo falta la contraseña.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const guardado = await leerUltimoEmail();
        if (vivo && guardado) {
          setEmail((actual) => (actual === '' ? guardado : actual));
          setRecordado(true);
        }
      } catch (errorCapturado) {
        console.error('[login] No se pudo leer el último email', errorCapturado);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  function usarOtroEmail() {
    setEmail('');
    setRecordado(false);
    void olvidarUltimoEmail();
  }

  async function enviar() {
    const emailLimpio = email.trim();
    if (!emailLimpio || !contrasena) {
      setError('Completá email y contraseña.');
      return;
    }
    if (!emailLimpio.includes('@')) {
      setError('Ese email no parece válido.');
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion({ email: emailLimpio, contrasena });
      cerrarPantallasAuth();
    } catch (errorCapturado) {
      const mensaje =
        errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo ingresar.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.formulario}>
      <Text style={[estilos.rotulo, { color: colores.texto }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="lucia@mail.com"
        placeholderTextColor={colores.textoSuave}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        accessibilityLabel="Email"
        editable={!enviando}
        style={[
          estilos.campo,
          {
            color: colores.texto,
            borderColor: colores.borde,
            backgroundColor: colores.fondoElevado,
          },
        ]}
      />
      {recordado ? (
        <View style={estilos.filaRecordado}>
          <Text style={[estilos.recordado, { color: colores.textoSuave }]}>
            Te recordamos de la última vez.
          </Text>
          <TouchableOpacity
            onPress={usarOtroEmail}
            accessibilityRole="button"
            accessibilityLabel="Usar otro email"
            hitSlop={8}
            style={estilos.enlace}
          >
            <Text style={[estilos.enlaceTexto, { color: colores.primario }]}>Usar otro email</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
            {
              color: colores.texto,
              borderColor: colores.borde,
              backgroundColor: colores.fondoElevado,
            },
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

      <Boton titulo={enviando ? 'Ingresando…' : 'Ingresar'} onPress={enviar} deshabilitado={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
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
  filaRecordado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
  },
  recordado: {
    fontSize: tipografia.cuerpo - 2,
  },
  enlace: {
    minHeight: 44,
    justifyContent: 'center',
  },
  enlaceTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
  },
});
