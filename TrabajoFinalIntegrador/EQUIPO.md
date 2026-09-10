# División del equipo (4 personas) y trabajo en GitHub

La idea es que cada uno sea dueño de **un feature completo** (pantallas + servicios + su persistencia), no de “la UI” vs “la API”.

| Integrante | Qué hace | Para la defensa |
|------------|----------|-----------------|
| **A** | Login/registro, sesión, biometría, favoritos, pantalla Yo, tabs, ícono/splash, EAS | SecureStore, red, kv-store |
| **B** | Lugares, búsqueda, filtros, detalle, horarios, SQLite del catálogo, tipos y mocks | Capa de servicios y API |
| **C** | Mapa, cerca tuyo, GPS, cómo llegar, flecha, aviso de proximidad | Maps, location, sensores |
| **D** | Recorrido (QR/GPS/manual), cámara, fotos, eventos, audioguías | Camera, file-system, audio |

Objetivo: que cada uno tenga un **módulo propio**, pueda **pushear todos los días sin esperar al resto**, y en la defensa sepa explicar **su código**.

Completar nombres:

| Rol | Nombre | GitHub |
|-----|--------|--------|
| A — Cuenta y plataforma | | |
| B — Lugares y catálogo | | |
| C — Mapa y ubicación | | |
| D — Recorrido, eventos y audio | | |

---

## 1. Cómo se divide (por features, no por “capas”)

Si uno hace “toda la UI” y otro “toda la API”, se bloquean. Cada persona es dueña de **pantallas + servicios + persistencia de su feature**.

### Integrante A — Cuenta, shell y plataforma

**Producto**

- Tabs / layout general (Expo Router): Mapa, Agenda, Mi recorrido, Yo
- Registro e ingreso
- Sesión que sobrevive al cierre
- Reingreso con huella/rostro y alternativa si no hay biometría
- Pantalla **Yo**: perfil, preferencias (tema, aviso de proximidad, radio 100/250/500, categorías favoritas)
- Favoritos (marcar, lista) — pide login si no hay cuenta
- Banner de estado de red
- Ícono 1024×1024, splash, nombre de la app
- `app.json` + `eas.json` y el build preview (lo corre A, todos prueban el APK)

**Técnico (para la defensa)**

- `expo-secure-store` (token; nunca en kv-store)
- `expo-local-authentication`
- `expo-sqlite/kv-store` (preferencias)
- `expo-network`
- Identidad de la app + EAS

**Carpetas que A toca**

```
src/app/_layout.tsx
src/app/(tabs)/_layout.tsx
src/app/(auth)/          # login, registro
src/app/(tabs)/yo/
src/features/cuenta/
src/features/favoritos/
src/servicios/auth.ts
src/servicios/favoritos.ts
src/servicios/red.ts
```

### Integrante B — Lugares y catálogo

**Producto**

- Listado completo de lugares
- Filtro por categoría (playas, termas, museos, gastronomía, artesanías, naturaleza, alojamiento)
- Búsqueda por nombre
- Detalle: fotos, descripción, teléfono, web, precio, accesible, activo
- Horarios por día y “Abierto ahora / cierra a las…”
- Cache SQLite del catálogo para ver lugares **sin señal**
- Estados **carga / vacío / error** en listado y detalle
- Mocks “feos”: sin teléfono, texto larguísimo, lista vacía, error de red
- Tipos en `src/tipos/` (B los crea el día 0; el resto **no los cambia** sin PR de tipos)

**Técnico (para la defensa)**

- Capa de servicios (`src/servicios/lugares.ts`, `categorias.ts`)
- Mocks vs fetch (único lugar que cambia cuando llegue la API)
- `expo-sqlite` (tablas de catálogo)
- Envelope `{ datos, meta }` / `{ error }`

**Carpetas que B toca**

```
src/tipos/                 # freeze después del día 0
src/mocks/lugares.ts
src/mocks/categorias.ts
src/servicios/lugares.ts
src/servicios/categorias.ts
src/db/catalogo.ts
src/features/lugares/
src/app/(tabs)/lugares/    # si hay tab o stack de listado
src/app/lugar/[id].tsx     # pantalla de detalle (estructura; ver §4)
```

### Integrante C — Mapa, cerca y sensores

**Producto**

- Mapa con marcadores y “vos estás acá”
- Tap en marcador: nombre + distancia → detalle
- Filtrar el mapa por categoría
- Lista **Cerca tuyo** ordenada por distancia
- Botón **Cómo llegar** (abre Google Maps / app de mapas, a pie o en auto)
- Flecha hacia el lugar (magnetómetro) si está lejos
- Si niegan ubicación: mapa y listado igual, sin punto del usuario
- Aviso de proximidad: **un aviso por lugar y por día** (no una ráfaga en la peatonal)

**Técnico (para la defensa)**

- `expo-location` + `react-native-maps`
- `expo-sensors` (magnetómetro)
- `expo-notifications` (solo proximidad; D hace las de eventos)

**Carpetas que C toca**

```
src/features/mapa/
src/servicios/ubicacion.ts
src/servicios/distancia.ts
src/app/(tabs)/index.tsx          # home / mapa
src/app/(tabs)/mapa/
src/hooks/useUbicacion.ts
src/hooks/useBrujula.ts
```

### Integrante D — Recorrido, eventos, cámara y audioguías

**Producto**

- Agenda: eventos por día, empezando por hoy
- Detalle de evento (inicio, duración, dónde, gratis, estado)
- Evento ligado a un lugar **o** dirección suelta
- Guardar evento + recordatorio **antes de que empiece**
- Si pasa a cancelado / suspendido: avisar a quien lo guardó
- Registrar visita: **QR**, **GPS** o **manual**
- Foto (cámara o galería) + nota corta
- Recorrido completo en orden con fotos
- QR ajeno o roto: no se cuelga
- Cola local `sincronizada: false` y subida al volver la red
- Audioguías: play/pausa/adelantar/tiempo restante; sigue con pantalla apagada; cache en disco
- Vibración al registrar visita (`expo-haptics`)

**Técnico (para la defensa)**

- `expo-camera` (foto + QR)
- `expo-image-picker`
- `expo-file-system` (`File`, `Directory`, `Paths`) — no API vieja
- `expo-audio` (no `expo-av`)
- `expo-notifications` (recordatorio y cancelación de eventos)
- `expo-haptics`

**Carpetas que D toca**

```
src/features/recorrido/
src/features/eventos/
src/features/audioguias/
src/mocks/eventos.ts
src/servicios/eventos.ts
src/servicios/visitas.ts
src/servicios/audioguias.ts
src/db/visitas.ts
src/app/(tabs)/agenda/
src/app/(tabs)/recorrido/
src/app/evento/[id].tsx
```

### Quién cubre cada requisito mínimo de la cátedra

| # | Requisito | Dueño |
|---|-----------|--------|
| 1 | Pantallas + Expo Router | A el shell; B/C/D sus pantallas |
| 2 | Auth + SecureStore + biometría | **A** |
| 3 | API + loading/empty/error | **B** (catálogo); D en eventos/visitas |
| 4 | Cámara + file-system | **D** |
| 5 | Location + maps | **C** |
| 6 | Notificaciones por hecho real | **C** proximidad; **D** eventos |
| 7 | SQLite + kv-store + offline + network | **B** catálogo SQLite; **A** kv + network; **D** cola visitas |
| 8 | Sensors o haptics | **C** magnetómetro; **D** haptics |
| 9 | Multimedia | **D** |
| 10 | Ícono y splash | **A** |

Así en la defensa no se pisan: cada uno tiene paquetes Expo concretos.

---

## 2. Día 0 (juntos, 2–3 horas) — después cada uno solo

Hacer **una sola vez**, en la misma máquina o en una call, y pushear a `main`:

1. Crear el repo en GitHub (privado o el que pida la cátedra).
2. `npx create-expo-app` con TypeScript + Expo Router.
3. Crear la estructura de carpetas de arriba (aunque estén vacías).
4. Pegar los tipos del PRD en `src/tipos/` y **congelarlos**.
5. Acordar contratos de servicios (funciones y tipos de retorno). Las pantallas de C y D pueden llamar `obtenerLugares()` aunque B todavía use mocks.
6. A deja el layout de tabs con pantallas placeholder: “Acá va el mapa (C)”, etc.
7. Proteger `main` (ver §5).
8. Cada uno crea su rama y se va.

Hasta que eso no esté en `main`, no empiecen features en paralelo: van a pelear el `package.json` y el `_layout`.

---

## 3. Contratos compartidos (para no bloquearse)

Nadie importa mocks. Todos importan servicios.

B publica, el resto consume:

```ts
obtenerLugares(filtros?: FiltrosLugar): Promise<Respuesta<Lugar[]>>
obtenerLugarPorId(id: string): Promise<Respuesta<Lugar>>
obtenerCategorias(): Promise<Respuesta<Categoria[]>>
```

C no calcula horarios; llama a B o a un helper de B: `estaAbiertoAhora(lugar, fecha)`.

D no parsea el catálogo; para QR usa `lugar.codigoQr` (formato acordado: `COLON:lug-004`).

A expone:

```ts
useSesion() // { usuario, token, cargando, login, logout, exigirCuenta() }
```

Si C o D necesitan “¿hay usuario?”: hook de A, no leen SecureStore directo.

Forma de respuesta (obligatoria):

```ts
type Respuesta<T> =
  | { datos: T; meta?: { total: number; pagina: number; porPagina: number } }
  | { error: { codigo: string; mensaje: string } }
```

---

## 4. La pantalla de detalle (único lugar donde se juntan)

`src/app/lugar/[id].tsx` la arma **B** (datos del lugar).  
Los demás **no editan ese archivo**: exportan un componente y B lo inserta.

| Bloque en el detalle | Componente | Dueño |
|----------------------|------------|--------|
| Foto, textos, horario, teléfono, precio | `LugarCabecera` | B |
| Distancia + Cómo llegar + flecha | `LugarMapaAcciones` | C |
| Escuchar audioguía | `LugarAudioguia` | D |
| Registrar visita | `LugarRegistrarVisita` | D |
| Estrella favorito | `BotonFavorito` | A |

Regla: si necesitás algo en el detalle, **PR que agrega tu componente**; B solo pone una línea de import. Así no hay merge hell.

---

## 5. Flujo GitHub para trabajar independientes

### 5.1 Crear el repo (una vez)

En GitHub: New repository → nombre p. ej. `mi-ciudad-colon` → **sin** README si ya van a pushear este proyecto.

```bash
cd "ruta/del/TrabajoFinalIntegrador"
git init
git add .
git commit -m "docs: requisitos y división del equipo"
git branch -M main
git remote add origin git@github.com:ORGANIZACION/mi-ciudad-colon.git
git push -u origin main
```

Invitar a los 4 como collaborators.

### 5.2 Proteger `main`

En GitHub → Settings → Branches → Add rule para `main`:

- Require a pull request before merging
- Require at least **1 approval** (otro compañero)
- No push directo a `main` (ni siquiera el que creó el repo, salvo el commit inicial)

Opcional: rama `develop`. Con 4 personas, **`main` + PRs** alcanza y se entienden mejor. Si quieren `develop`, todo PR va a `develop` y a `main` solo cuando hay demo.

### 5.3 Nombres de ramas

```
feat/a-auth
feat/a-favoritos
feat/b-listado-lugares
feat/b-detalle-horarios
feat/c-mapa
feat/c-cerca-tuyo
feat/d-qr-visitas
feat/d-agenda
feat/d-audioguias
fix/c-permiso-ubicacion
chore/a-eas-preview
```

Una rama = una cosa chica. **Nunca** una rama `feat/todo-lo-mio` de tres semanas.

### 5.4 Ritmo diario (cada uno)

```bash
git checkout main
git pull origin main
git checkout -b feat/b-busqueda-lugares

# trabajar solo dentro de TUS carpetas

git add src/features/lugares src/servicios/lugares.ts
git commit -m "feat(lugares): búsqueda por nombre"
git push -u origin feat/b-busqueda-lugares
```

Abrir **Pull Request** hacia `main`. Pedir review al que más toca el borde (ej. D pide review a B si usa tipos de Lugar).

Mergear. Borrar la rama. Empezar otra.

### 5.5 Cómo no pisarse

1. **No edites carpetas de otro.** Si hace falta, issue o mensaje y que el dueño lo haga, o un PR mínimo.
2. **No corras Prettier/eslint sobre todo el repo** en tu PR. Solo tus archivos.
3. **`package.json`**: si necesitás un paquete, avisá en el grupo y hacé un PR **solo** de dependencia (`chore: add expo-camera`), mergeá, y recién ahí tu feature. Si dos instalan paquetes a la vez, hay conflicto seguro.
4. **Tipos:** cambio en `src/tipos/` = PR titulado `types: ...` y los 4 miran. Es el contrato.
5. Pull de `main` **antes** de cada PR y si el PR lleva más de un día abierto.

### 5.6 Mensajes de commit

```
feat(mapa): filtros por categoría
fix(auth): reingreso con biometría si hay token
chore: agregar expo-notifications
types: agregar EstadoEvento
```

Sirve para la defensa: `git log --author="TuNombre"` muestra tu parte.

### 5.7 Issues en GitHub (tablero)

Crear un Project con columnas: Pendiente / En curso / En review / Listo.

Issues de ejemplo (asignar al dueño):

- A: registro y login + SecureStore
- A: biometría y fallback
- A: pantalla Yo + preferencias
- A: favoritos
- A: ícono, splash, eas preview
- B: tipos y mocks (incluye casos feos)
- B: servicios de lugares
- B: listado, filtro, búsqueda
- B: detalle y “abierto ahora”
- B: SQLite cache offline
- C: mapa y marcadores
- C: ubicación y permiso denegado
- C: cerca tuyo
- C: cómo llegar
- C: flecha / magnetómetro
- C: notificación de proximidad (1 por lugar/día)
- D: agenda y detalle de evento
- D: guardar evento + recordatorio
- D: aviso cancelado/suspendido
- D: visita QR / GPS / manual
- D: foto + file-system + cola sync
- D: audioguías en background + cache

Cada issue se cierra con el PR (`Closes #12`).

---

## 6. Orden recomendado (aunque trabajen en paralelo)

**Semana 1 (después del día 0)**  
A: auth funciona (aunque sea contra mock).  
B: listado + detalle con mocks.  
C: mapa con pins fake y ubicación.  
D: agenda con mocks + registrar visita manual (sin QR todavía).

Ahí ya hay algo “que se pueda tocar”, como pide Valeria.

**Semana 2**  
A: favoritos + biometría.  
B: filtros, horarios, SQLite.  
C: cerca tuyo, cómo llegar, permiso denegado.  
D: QR + cámara + cola offline.

**Semana 3**  
C: flecha y proximidad.  
D: audioguías + notificaciones de eventos.  
A: splash/ícono + **primer build EAS** (mínimo una semana antes de la entrega).  
B: cablear servicios a la API de la cátedra cuando exista.

**Última semana**  
Juntos: permisos Android, casos feos, APK, ensayar defensa por integrante.

---

## 7. Defensa: qué explica cada uno

Llevar el teléfono con el APK. Cada uno muestra **su flujo** y abre **sus archivos**.

- **A:** “Me registro, cierro la app, vuelvo con huella. El token está en SecureStore. Sin cuenta igual veo el mapa.”
- **B:** “El listado no habla con el mock: pasa por servicios. Sin red igual ves el catálogo. Acá el estado de error.”
- **C:** “Niego el GPS y el mapa sigue. Activo GPS y aparece cerca tuyo. La flecha usa el magnetómetro.”
- **D:** “Escaneo un QR inválido y no se cuelga. Registro visita sin señal (`sincronizada: false`). Reproduzco audioguía con pantalla apagada. Guardé un evento y me avisó.”

No hace falta que todos sepan cada línea del repo. Sí la de **su carpeta**.

---

## 8. Paquetes: quién los agrega

| Paquete | Quién hace el PR `chore` |
|---------|--------------------------|
| `expo-secure-store`, `expo-local-authentication`, `expo-network`, `expo-sqlite` | A (sqlite lo usa B/D; A abre el PR base) |
| `react-native-maps`, `expo-location`, `expo-sensors`, `expo-notifications` | C (notifications: C crea el setup; D las programa) |
| `expo-camera`, `expo-image-picker`, `expo-file-system`, `expo-audio`, `expo-haptics` | D |
| `@react-native-vector-icons/ionicons` | A en el scaffold (día 0) |

Nunca `expo-av`. Nunca `@expo/vector-icons`. Nunca la API vieja de file-system.

---

## 9. Si dos necesitan el mismo archivo

Orden:

1. ¿Se puede extraer un componente en la carpeta del dueño? Hacer eso.
2. Si no, el dueño del archivo mergea primero; el otro rebasea:

```bash
git checkout feat/d-qr-visitas
git fetch origin
git rebase origin/main
git push --force-with-lease
```

`--force-with-lease` solo en **tu** rama de feature, nunca en `main`.

---

## 10. Checklist antes de decir “mi parte está”

- Corre en Expo Go o en el APK, no solo en la cabeza.
- Loading / vacío / error de **tu** pantalla.
- No importás `src/mocks/` desde una pantalla.
- No tocaste tipos ni `package.json` de más.
- Otro compañero aprobó el PR.
- Podés explicar el código sin leer ChatGPT al lado (la defensa lo va a pedir).
