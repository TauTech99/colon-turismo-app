import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Un QueryClient nuevo por test: sin caché compartida ni reintentos.
export function crearEnvoltorioConsulta() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return function EnvoltorioConsulta({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}
