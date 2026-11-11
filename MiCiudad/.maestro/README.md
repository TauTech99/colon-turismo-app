# Recorridos end to end (Maestro)

Siete recorridos que manejan la app de verdad en un celular o emulador, contra la API local y con el GPS simulado en Colón. Qué comprueba cada uno: `docs/03-pruebas-y-calidad.md`.

## Cómo se corren

Lo más simple es con el playbook, desde la raíz del repo:

1. `node playbook/playbook.ts levantar` en una terminal (API, Metro y la app abierta).
2. En otra terminal: `node playbook/playbook.ts tests` → "Recorridos E2E".

El playbook da el permiso de ubicación simulada que Maestro necesita en un celular real y guarda el reporte y las capturas en `playbook/registros/e2e/`.

A mano, con [Maestro](https://maestro.mobile.dev) instalado:

```bash
maestro --device <equipo> test MiCiudad/.maestro
```

## Antes de correrlos

- La API con los datos de demo recién cargados (`node playbook/playbook.ts reiniciar`).
- La app instalada (build de desarrollo) y abierta con Metro.
- El orden importa: el 01 arranca con la app limpia y el 06 usa la sesión que deja el 04 (`config.yaml`).
