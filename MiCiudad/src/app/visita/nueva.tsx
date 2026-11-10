// Dueño: D — Recorrido y audioguías
// Visita manual: foto + nota + confirmar.

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { useLugar } from '@/lugares/useLugar';
import { borrarBorradorVisita, leerBorradorVisita } from '@/recorrido/borradorVisita';
import { SelectorFoto } from '@/recorrido/componentes/SelectorFoto';
import { useRegistrarVisita } from '@/recorrido/useRegistrarVisita';

// Visita manual: el turista dice “estuve acá” sin escanear QR
// ni usar el GPS. Foto + nota corta + confirmar.
// El QR está en escanear.tsx y "Estoy acá" (GPS) en BotonRegistrarVisita.

export default function PantallaNuevaVisita() {
  const { colores } = useTema();
  const { exigirCuenta, cargando: cargandoSesion, token, cuentaDesbloqueada } = useSesion();
  const params = useLocalSearchParams<{ lugarId: string }>();
  const lugarId = Array.isArray(params.lugarId) ? params.lugarId[0] : params.lugarId;

  const { lugar, cargando, error, recargar } = useLugar(lugarId ?? '');
  const { registrar, guardando, error: errorGuardar } = useRegistrarVisita();

  const [uriFoto, setUriFoto] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [cuentaOk, setCuentaOk] = useState(false);

  // Ref = “caja” que apunta al ScrollView. Sirve para mandarle
  // scrollToEnd cuando el teclado tapa la nota.
  const scrollRef = useRef<ScrollView>(null);

  // Si Android mató la app al sacar la foto, el borrador trae la uri.
  useEffect(() => {
    if (!lugarId) {
      return;
    }
    let vivo = true;
    void (async () => {
      const borrador = await leerBorradorVisita();
      if (!vivo || !borrador || borrador.lugarId !== lugarId || !borrador.uriFoto) {
        return;
      }
      setUriFoto(borrador.uriFoto);
    })();
    return () => {
      vivo = false;
    };
  }, [lugarId]);

  // Pedir cuenta una sola vez cuando la sesión ya cargó.
  // No depende de exigirCuenta (se recrea cada render y re-dispararía).
  useEffect(() => {
    if (cargandoSesion) {
      return;
    }

    let vivo = true;
    void (async () => {
      if (token && cuentaDesbloqueada) {
        if (vivo) {
          setCuentaOk(true);
        }
        return;
      }

      const puede = await exigirCuenta();
      if (!vivo) {
        return;
      }
      if (!puede) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
        return;
      }
      setCuentaOk(true);
    })();

    return () => {
      vivo = false;
    };
    // Intencional: solo cuando terminó de cargar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [cargandoSesion]);

  // Al tocar la nota, el teclado tapa el campo. Esperamos un instante
  // (para que abra) y scrolleamos hasta abajo: nota + Confirmar quedan a la vista.
  function alEnfocarNota() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
  }

  async function alConfirmar() {
    if (!lugarId) {
      return;
    }

    const visita = await registrar({
      lugarId,
      origen: 'manual',
      uriFotoTemporal: uriFoto,
      nota: nota.trim() === '' ? null : nota,
    });

    if (!visita) {
      return;
    }

    await borrarBorradorVisita();

    Alert.alert('Visita guardada', 'Quedó en tu teléfono. Vas a verla en Mi recorrido más adelante.', [
      {
        text: 'Listo',
        onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(`/lugar/${lugarId}`);
          }
        },
      },
    ]);
  }

  if (!lugarId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nueva visita' }} />
        <EstadoError mensaje="Falta el lugar de la visita." />
      </>
    );
  }

  if (!cuentaOk || cargando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nueva visita' }} />
        <EstadoCarga mensaje={cuentaOk ? 'Cargando lugar…' : 'Comprobando cuenta…'} />
      </>
    );
  }

  if (error || !lugar) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nueva visita' }} />
        <EstadoError mensaje={error ?? 'No existe ese lugar.'} onReintentar={recargar} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva visita' }} />
      <KeyboardAvoidingView
        style={[estilos.pantalla, { backgroundColor: colores.fondo }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[estilos.titulo, { color: colores.texto }]}>{lugar.nombre}</Text>
          <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
            Registro a mano: no hace falta QR ni GPS. La foto queda en el teléfono.
          </Text>

          <SelectorFoto lugarId={lugarId} uri={uriFoto} onCambiar={setUriFoto} />

          <View style={estilos.bloqueNota}>
            <Text style={[estilos.etiqueta, { color: colores.texto }]}>Nota corta (opcional)</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              onFocus={alEnfocarNota}
              placeholder="Ej. Hacía calor pero valió la pena"
              placeholderTextColor={colores.textoSuave}
              multiline
              maxLength={200}
              accessibilityLabel="Nota de la visita"
              style={[
                estilos.campo,
                {
                  color: colores.texto,
                  borderColor: colores.borde,
                  backgroundColor: colores.fondo,
                },
              ]}
            />
          </View>

          {errorGuardar ? (
            <Text style={[estilos.error, { color: colores.peligro }]}>{errorGuardar}</Text>
          ) : null}

          <Boton
            titulo={guardando ? 'Guardando…' : 'Confirmar visita'}
            onPress={() => {
              void alConfirmar();
            }}
            deshabilitado={guardando}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    padding: 16,
    gap: 20,
    // Espacio de más abajo: si no, scrollToEnd no tiene adónde scrollear
    // y el teclado sigue tapando nota + Confirmar.
    paddingBottom: 280,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  ayuda: {
    fontSize: tipografia.cuerpo,
  },
  bloqueNota: {
    gap: 8,
  },
  etiqueta: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  campo: {
    minHeight: 96,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: tipografia.cuerpo,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: tipografia.cuerpo,
    fontWeight: '600',
  },
});
