# Recorridos de punta a punta

Qué pasa en la app, en el teléfono y en la API en cada cosa que hace una persona, y qué pasa si se corta la señal. Cada recorrido dice qué parte del equipo lo tiene y dónde está el código.

## 1. Abrir la app

**Parte A** (con B, C y D) · `app/_layout.tsx`

Al abrir, el layout raíz prepara todo antes de mostrar la primera pantalla:

- **Base:** abre la base SQLite y aplica las migraciones (B).
- **Avisos:** configura el canal de avisos (A).
- **API:** hace un "ping" a `/salud` para saber si llega a la API.
- **Sesión:** recupera la sesión guardada (A). El token está en SecureStore; si hay red, pide `/yo` para actualizar los datos de la persona.
- **Aviso de proximidad:** se prende solo si estaba prendido (C).
- **Visitas:** sube las que quedaron pendientes cuando vuelve la red (D).

```mermaid
sequenceDiagram
  autonumber
  participant L as _layout.tsx
  participant DB as SQLite
  participant SS as SecureStore
  participant API as API
  L->>DB: abrirBase() y migraciones
  L->>L: configurarNotificaciones()
  L->>API: GET /salud
  L->>SS: leer sesión y token
  opt hay token y hay red
    L->>API: GET /yo
    API-->>L: datos de la persona
  end
  L->>L: useProximidad() según la preferencia de Yo
  L->>L: useSincronizacion() sube visitas pendientes
  L-->>L: muestra Mapa (pestaña inicial)
```

La sesión **sobrevive al cierre**: no hace falta volver a escribir la contraseña. Lo que se pierde al cerrar la app es el "desbloqueo": la primera vez que algo pide cuenta, la app pide la huella (ver el recorrido 3).

## 2. Mapa y ficha de un lugar

**Partes C y B** · `app/(tabs)/index.tsx`, `mapa/useUbicacion.ts`, `lugares/useLugares.ts`, `app/lugar/[id].tsx`

1. **Permiso:** el mapa pide permiso de ubicación. Si la persona lo niega, el mapa sigue andando, pero sin el punto de "vos estás acá".
2. **Lugares:** se leen de SQLite (al instante) y después de `GET /lugares` (si hay red). La lista se ordena por distancia con la fórmula de Haversine (`compartido/distancia.ts`).
3. **Filtros:** los chips de categoría filtran en el teléfono, sin volver a pedir al servidor. "Buscar" abre la lista completa con buscador.
4. **Ficha:** al tocar un lugar se abre `lugar/[id]` con fotos, horarios ("Abierto" o "Cerrado" según la hora de Colón), favorito (A), audioguía (D) y "Cómo llegar".

```mermaid
flowchart TD
  A["Abrir pestaña Mapa"] --> B{"¿Permiso de ubicación?"}
  B -- Sí --> C["GPS: vos estás acá<br/>distancia a cada lugar"]
  B -- No --> D["Mapa sin tu posición<br/>la app sigue andando"]
  C --> E["Lugares: SQLite al instante<br/>+ GET /lugares si hay red"]
  D --> E
  E --> F["Filtro por categoría<br/>(en el teléfono)"]
  F --> G["Tocar un lugar"]
  G --> H["Ficha: fotos, horarios,<br/>favorito, audioguía, cómo llegar"]
  H --> I{"¿Hay señal?"}
  I -- Sí --> J["GET /lugares/:id<br/>y guarda la copia"]
  I -- No --> K["Usa la copia guardada"]
```

## 3. Cuenta: ingresar, sesión y huella

**Parte A** · `cuenta/SesionContext.tsx`, `cuenta/biometria.ts`, `app/(auth)/`

Mirar no pide cuenta. Cuando la persona quiere **guardar** algo (favorito, Avisarme, visita), la pantalla llama a `exigirCuenta()`:

```mermaid
flowchart TD
  A["Tocar algo que guarda<br/>(favorito, Avisarme, visita)"] --> B{"¿Hay token guardado?"}
  B -- No --> C["Pantalla Ingresar"]
  C --> D["POST /auth/ingreso"]
  D --> E["Token a SecureStore<br/>sesión desbloqueada"]
  B -- Sí --> F{"¿Ya desbloqueó<br/>en esta apertura?"}
  F -- Sí --> OK["Sigue con la acción"]
  F -- No --> G{"Huella o rostro"}
  G -- Bien --> OK
  G -- "Falla o no hay" --> H["Pantalla Desbloquear<br/>(contraseña)"]
  H --> D
  E --> OK
```

- **Token:** el token vive **solo** en SecureStore, nunca en el kv-store.
- **Cerrar sesión:** borra el token del teléfono.
- **Contraseña:** la alternativa a la huella necesita la API (`POST /auth/ingreso`). Sin señal y sin huella, no se puede desbloquear.

## 4. Agenda y "Avisarme"

**Parte C** · `app/(tabs)/agenda.tsx`, `eventos/useEventos.ts`, `eventos/useEventoGuardado.ts`, `eventos/recordatorios.ts`

**La agenda** sigue el patrón de siempre: SQLite primero, después `GET /eventos`. Agrupa por día ("Hoy", "Mañana"…) con la hora de Colón, aunque el teléfono esté en otra zona horaria. Cada vez que llegan eventos nuevos con red, `revisarCambiosDeEstado` compara con la copia anterior: si un evento que la persona guardó pasó a **suspendido** o **cancelado**, cancela su recordatorio y le avisa.

**"Avisarme"** en el detalle de un evento:

```mermaid
sequenceDiagram
  autonumber
  actor U as Persona
  participant B as BotonAvisarme
  participant S as Sesión
  participant DB as SQLite
  participant API as API
  participant N as Notificaciones
  U->>B: toca Avisarme
  B->>S: exigirCuenta()
  S-->>B: cuenta lista (recorrido 3)
  B->>DB: guardar el evento (se ve al toque)
  opt hay señal
    B->>API: PUT /yo/eventos-guardados/:id
  end
  B->>N: agendar aviso 60 min antes del inicio
  alt sin permiso de avisos
    B-->>U: "Guardado, pero el aviso no va a sonar"
  else agendado
    B-->>U: botón en "Dejar de avisarme"
  end
  Note over N: Suena aunque la app esté cerrada
```

- **Sin señal:** el evento queda guardado en el teléfono. La próxima vez que se consulta con señal (al abrir el evento o Yo), `sincronizarEventosGuardados` sube lo pendiente y quita de la cuenta lo que se quitó acá: el teléfono manda.
- **Teléfono nuevo:** si la cuenta nunca se sincronizó en ese teléfono, copia los eventos guardados de la cuenta.

## 5. Aviso de proximidad

**Parte C** (la preferencia la guarda A en Yo) · `mapa/proximidad.ts`

La persona prende **"Avisarme cuando esté cerca"** en Yo. Desde ese momento, una **tarea de fondo** recibe la ubicación aunque la app esté cerrada:

```mermaid
sequenceDiagram
  autonumber
  actor U as Persona
  participant Y as Yo (A)
  participant P as proximidad.ts (C)
  participant SO as Android
  participant DB as SQLite
  participant KV as kv-store
  U->>Y: prende el aviso de proximidad
  Y->>P: pedir permisos (ubicación siempre + avisos)
  P->>SO: startLocationUpdatesAsync("miciudad.proximidad")
  SO-->>U: notificación fija "Te avisamos si te acercás a un lugar"
  loop cada nueva ubicación (también con la app cerrada)
    SO->>P: tarea de fondo con la ubicación
    P->>DB: leer lugares activos
    P->>KV: ¿ya avisé de este lugar hoy?
    alt dentro del radio y no avisado hoy
      P-->>U: "Estás cerca de Termas de Colón"
      P->>KV: anotar el aviso de hoy
    end
  end
  U->>U: toca el aviso → se abre la ficha del lugar
```

- **Un aviso por lugar y por día.** El radio lo elige la persona en Yo.
- **Lugares sin red:** lee los lugares de SQLite, así que funciona sin señal.
- **Sin permiso:** si la persona niega el permiso de ubicación "siempre", la app sigue andando, pero el aviso no se prende.
- **Al apagarlo:** se frena la tarea de fondo (`stopLocationUpdatesAsync`) y se va la notificación fija.

## 6. Registrar una visita

**Parte D** · `recorrido/useRegistrarVisita.ts`, `recorrido/colaVisitas.ts`, `app/escanear.tsx`, `app/visita/`

Hay tres formas de decir "estuve acá":

- **QR:** escanea el cartel del lugar y busca el lugar con `GET /lugares/qr/:codigo`.
- **"Estoy acá":** usa el GPS y propone los lugares a menos de 100 m.
- **A mano:** se elige el lugar de la lista.

Se puede sumar una foto (cámara o galería) y una nota. La visita **se guarda primero en el teléfono**, marcada como pendiente:

```mermaid
flowchart TD
  A["QR · Estoy acá (GPS) · A mano"] --> B["Elegir lugar + foto + nota"]
  B --> C["Guardar en SQLite<br/>sincronizada = false<br/>foto copiada al disco"]
  C --> D{"¿Hay señal?"}
  D -- Sí --> E["POST /archivos (foto)"]
  E --> F["POST /yo/visitas con la URL de la foto"]
  F --> G["Marcar sincronizada = true"]
  D -- No --> H["Queda pendiente<br/>Mi recorrido lo muestra"]
  H -- "vuelve la red" --> I["useSincronizacion<br/>sube todas las pendientes"]
  I --> E
```

En un teléfono nuevo, `traerVisitasDeLaCuenta` baja las visitas que la cuenta ya tenía.

## 7. Audioguías

**Parte D** · `audioguias/descargas.ts`, `audioguias/useAudioguia.ts`

Al abrir la ficha de un lugar con red, la audioguía se **descarga al disco** (`expo-file-system`). Se escucha con `expo-audio`, con play, pausa y adelantar. Si no hay señal, se reproduce desde esa copia. Un lugar sin audioguía muestra un texto claro, no un hueco.

## 8. Sin conexión

**Parte A** (el cartel) y todas las partes (los datos) · `compartido/useRed.ts`, `compartido/componentes/BannerSinConexion.tsx`

```mermaid
stateDiagram-v2
  [*] --> ConRed
  ConRed --> SinRed: se corta la señal
  SinRed --> ConRed: vuelve la señal
  state ConRed {
    [*] --> Pide
    Pide: pide a la API y guarda copia en SQLite
  }
  state SinRed {
    [*] --> Local
    Local: banner "Sin conexión" y todo sale de SQLite
    Local --> Pendientes: guardar favorito, evento o visita
    Pendientes: queda en el teléfono marcado como pendiente
  }
  SinRed --> Sincroniza: al volver la red
  Sincroniza: las visitas suben solas; favoritos y eventos, al consultarlos
  Sincroniza --> ConRed
```

| Sin señal… | Qué pasa |
|---|---|
| Mapa, lugares y fichas | Salen de la copia guardada. |
| Agenda y detalle de evento | Salen de la copia guardada. |
| Audioguías | Suenan si se descargaron antes. |
| Guardar favorito, Avisarme o una visita | Se guarda en el teléfono. Las visitas suben solas al volver la red; favoritos y eventos guardados, la próxima vez que se consultan con señal. |
| Ingresar por primera vez o desbloquear con contraseña | Necesita señal. |
