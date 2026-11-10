// Dueño: A — Cuenta y plataforma
// expo-local-authentication: huella/rostro al reingresar.

import * as LocalAuthentication from 'expo-local-authentication';

// expo-local-authentication es el módulo de Expo que habla con el
// sensor del teléfono: huella (Android / Touch ID) o rostro (Face ID).
// No guarda nuestra contraseña. Solo pregunta: "¿es la misma persona
// que desbloquea el teléfono?"
//
// No se pide al abrir la app: mirar el mapa no pide cuenta. Quien llama es
// exigirCuenta(), la primera vez que en esta apertura se entra
// a algo de la cuenta.

export async function sePuedeUsarBiometria(): Promise<boolean> {
  try {
    const haySensor = await LocalAuthentication.hasHardwareAsync();
    if (!haySensor) {
      return false;
    }

    // isEnrolledAsync: el teléfono tiene al menos una huella o
    // un rostro cargado en Ajustes. Sin eso el diálogo no sirve.
    const hayDatoGuardado = await LocalAuthentication.isEnrolledAsync();
    return hayDatoGuardado;
  } catch (error) {
    console.error('[biometria] No se pudo preguntar al sensor', error);
    return false;
  }
}

// true = la persona confirmó. false = no hay sensor, canceló o falló.
// La alternativa (contraseña de la cuenta) la arma desbloquear.tsx,
// no el PIN del teléfono: por eso disableDeviceFallback.
export async function pedirBiometria(): Promise<boolean> {
  const sePuede = await sePuedeUsarBiometria();
  if (!sePuede) {
    return false;
  }

  try {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloqueá tu cuenta de Mi Ciudad',
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: true,
    });
    return resultado.success;
  } catch (error) {
    console.error('[biometria] Falló el diálogo de huella o rostro', error);
    return false;
  }
}
