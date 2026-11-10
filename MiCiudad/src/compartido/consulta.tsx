// Dueño: A — Cuenta y plataforma
// TanStack Query: cuándo pedir al servidor. No reemplaza SQLite.

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

// Un solo cliente para toda la app. Si se crea adentro del componente,
// se pierde la caché en cada render.
const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: {
      // 1 minuto fresco: otra pantalla que pida lo mismo no vuelve a la API.
      staleTime: 60 * 1000,
      // Dos reintentos si falló (más el primer intento = 3).
      retry: 2,
      // Al volver a la app (AppState active), si el dato está viejo se pide.
      refetchOnWindowFocus: true,
    },
  },
});

// En el teléfono no hay "ventana". Query no se entera solo de que
// volviste. AppState avisa: background → active. focusManager se lo
// cuenta a Query.
function alCambiarApp(estado: AppStateStatus) {
  if (Platform.OS === 'web') {
    return;
  }
  // Solo segundo plano ↔ app. "inactive" (teclado, modal) no cuenta:
  // si no, Query pediría al abrir Ingresar.
  if (estado === 'active') {
    focusManager.setFocused(true);
    console.log('[consulta] App activa. Si el dato está viejo, Query pide de nuevo.');
  } else if (estado === 'background') {
    focusManager.setFocused(false);
  }
}

// Las pantallas no importan Query. Los hooks llaman esto después de
// mutar (favorito, aviso, visita) para que otras pantallas se enteren.
export function invalidarConsultas(clave: readonly unknown[]): Promise<void> {
  console.log('[consulta] Invalidada', clave.join('/'));
  return clienteConsulta.invalidateQueries({ queryKey: [...clave] });
}

// Escribe la caché ya (la estrella se ve al toque). Después se invalida.
export function escribirConsulta<T>(clave: readonly unknown[], datos: T): void {
  clienteConsulta.setQueryData([...clave], datos);
}

export function ProveedorConsulta({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', alCambiarApp);
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>;
}
