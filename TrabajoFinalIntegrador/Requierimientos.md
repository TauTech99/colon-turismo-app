# Requisitos del Trabajo Final Integrador

**Materia:** Desarrollo para Móviles — 2026, 2.º cuatrimestre  
**Carrera:** Tecnicatura Universitaria en Desarrollo Web — UNER  
**Actividad:** N.º 3 — Trabajo Integrador — Entrega Final  

Este archivo reúne **todos** los requisitos de:

1. `TRABAJO FINAL INTEGRADOR.pdf` (consigna de la cátedra)
2. `Documento sin título.pdf` (misma consigna, versión incompleta; no agrega nada extra)
3. `01 - Mi Ciudad Guia Turistica.pdf` (PRD del cliente: Valeria Sosa, Dirección de Turismo de Colón)

Nada de lo que sigue es sugerencia: la cátedra indica que cada punto mínimo se **verifica sobre la app entregada**.

División del grupo (4 personas) y flujo de GitHub: ver [`EQUIPO.md`](./EQUIPO.md).

---

## 1. Objetivo del integrador

Desarrollar y entregar la **versión final** de la aplicación móvil que pidió el cliente en el PRD asignado al grupo.

- Construida con **React Native** y **Expo**.
- Debe integrar:
  - servicios del dispositivo
  - consumo de la **API de la cátedra**
  - persistencia local
  - resguardo de credenciales
- Se entrega como **build instalable**, no como código para compilar.

---

## 2. Modalidad, entrega y defensa

### 2.1 Formato

- **Grupal**, con los **mismos integrantes** declarados en la (consigna incompleta en el PDF: “declarados en la.”).
- Carga en la sección correspondiente del **Campus Virtual UNER**.

### 2.2 Qué se carga (dos cosas)

1. **Link del build**
   - APK de **release** generado con el perfil **preview**:
   - `eas build --platform android --profile preview`
   - Tiene que poder **instalarse y usarse sin Metro** y **sin la computadora de nadie**.

2. **Código fuente**
   - Repositorio Git (**preferido**) o archivo `.zip`.
   - Incluir `eas.json` y `app.json`.
   - **No** incluir `node_modules`.

### 2.3 Fecha y build anticipado

- Fecha límite: la informada en el Campus Virtual.
- Hacer el **primer build de preview al menos una semana antes**.
- El primer build siempre falla por algo (un permiso, un asset, un identificador).
- El **cupo mensual** de builds es limitado.

### 2.4 Defensa oral (obligatoria)

- Instancia **grupal** de **15 a 20 minutos**, en la fecha que informe la cátedra.
- Se demuestra la app **funcionando en un teléfono**, con **Expo Go** o con el **APK entregado**.
- Lo que se mira es la **app andando**, no desde dónde corre.
- **Cada integrante** explica la parte que desarrolló y responde preguntas **sobre su código**.
- Se pueden usar asistentes de IA **durante el desarrollo**. En la defensa **no**.
- Lo que se evalúa es que puedan **explicar cada línea** de lo que entregaron.
- **Sin defensa no hay integrador aprobado**, aunque la entrega esté completa.

### 2.5 Condiciones de aprobación

- El integrador **se aprueba o no se aprueba: no lleva nota**.
- Se aprueba cuando:
  1. la app **resuelve lo que pide el PRD**
  2. están los **diez requisitos mínimos**
  3. **todos** los integrantes defendieron su parte
- Una entrega que no llega se puede **rehacer una vez**.

### 2.6 Sobre las dudas (cátedra y cliente)

- El PRD tiene **huecos y contradicciones**, igual que un pedido real.
- **Preguntar a tiempo** es parte del trabajo y suma.
- **Suponer en silencio** y entregar otra cosa, no suma.
- Valeria: si algo es imposible, carísimo o no se entiende, decírselo. No quedarse callados adivinando.
- Prefiere tres preguntas ahora que una app que no sirve en enero.
- Cuando encuentren errores, olvidos o contradicciones: **avisar**, no resolverlos solos y contarlo después.
- Va a pedir cambios. Cuando lo haga, hay que decir **qué se cae o qué se atrasa** si entra lo nuevo. “Sí, no hay problema” a todo no le sirve.
- Quiere ver **algo que se pueda tocar, temprano**: una app fea con dos pantallas y datos inventados en dos semanas, no un documento hermoso.

---

## 3. Stack técnico obligatorio

Definido en el PRD (sección que el equipo docente le pidió incluir):

| Qué | Con qué |
|-----|---------|
| Framework | React Native con Expo |
| Lenguaje | TypeScript |
| Navegación | Expo Router |
| Estilos | `StyleSheet`. Unistyles o NativeWind son **opcionales** |
| Entrega | Build de producción con EAS |

### 3.1 Tres advertencias de documentación vieja (obligatorio respetarlas)

1. **`expo-av` no existe más.** El audio es `expo-audio` y el video, `expo-video`.
2. La **API vieja de `expo-file-system` tira error en tiempo de ejecución.** Se usa `File`, `Directory` y `Paths`.
3. Los íconos son **`@react-native-vector-icons/ionicons`**, no `@expo/vector-icons`.

---

## 4. Diez requisitos mínimos de la cátedra

Cada uno se verifica sobre la app entregada. **No son ejemplos ni sugerencias.**

### 4.1 Pantallas y navegación

- Las pantallas que haga falta para cubrir lo que pide el PRD.
- Conectadas con **Expo Router**.
- El alcance lo fija el **cliente**, no un número mínimo de pantallas.

### 4.2 Autenticación

- **Registro** e **ingreso**.
- Sesión que **sobrevive al cierre de la app**.
- El token va en **`expo-secure-store`**.
- El reingreso se resuelve con **`expo-local-authentication`** (huella o rostro).
- Con **alternativa** para el dispositivo que no tenga biometría.

### 4.3 Consumo de la API

- La aplicación consume la **API provista por la cátedra**.
- Detrás de una **capa de servicios propia**.
- Los estados de **carga**, **vacío** y **error** tienen que verse en pantalla.

### 4.4 Cámara y sistema de archivos

- Uso de **`expo-camera`** — foto y lectura de códigos QR cuando el PRD lo pida — **o** `expo-image-picker`.
- Guardado y lectura en el dispositivo con la **API nueva** de `expo-file-system` (`File`, `Directory`, `Paths`).

### 4.5 Ubicación y mapas

- `expo-location` junto con `react-native-maps`.
- Si el usuario **niega el permiso**, la app tiene que **seguir siendo usable**.

### 4.6 Notificaciones locales

- Con `expo-notifications`.
- Disparadas por un **hecho real** de la aplicación.
- **No** por un botón de prueba.

### 4.7 Persistencia y conectividad

- `expo-sqlite` para los datos.
- `expo-sqlite/kv-store` para preferencias y sesión.
- La app tiene que **abrir y mostrar algo sin conexión**.
- Avisar el estado de la red con `expo-network`.

### 4.8 Sensores o háptica

- Al menos un uso **justificado** de `expo-sensors` **o** `expo-haptics`.
- Que **aporte algo a la experiencia**.

### 4.9 Multimedia

- Cuando el PRD pida audio o video (audioguías, grabaciones, clips), se resuelve con `expo-audio` o `expo-video`.
- Con **controles de reproducción a la vista**.

### 4.10 Identidad de la aplicación

- Ícono y pantalla de presentación **propios**.
- Nombre del producto.
- El ícono va en **PNG cuadrado de 1024×1024**, **sin transparencias**.

---

## 5. Capacidades del dispositivo según este PRD

Las seis primeras son **obligatorias en todos los proyectos** (no es un menú). En **esta** app, además, cada paquete tiene un uso concreto:

| Capacidad | Paquete | Para qué en esta app |
|-----------|---------|----------------------|
| Cámara | `expo-camera` (`CameraView`) | Foto de la visita y lectura del QR del cartel |
| Ubicación y mapa | `expo-location` + `react-native-maps` | Mapa de lugares, distancia, cómo llegar |
| Notificaciones | `expo-notifications` | Aviso de proximidad y recordatorio de evento guardado |
| Persistencia y red | `expo-sqlite`, `expo-sqlite/kv-store`, `expo-network` | Catálogo cacheado, cola de visitas sin sincronizar, preferencias |
| Seguridad | `expo-secure-store` + `expo-local-authentication` | Token de sesión guardado y reingreso con huella o rostro |
| Sensores o háptica | `expo-sensors`, `expo-haptics` | Flecha hacia el lugar con el **magnetómetro**; vibración al registrar una visita |
| Sistema de archivos | `expo-file-system` | Guardar la audioguía y las fotos para usarlas sin señal |
| Multimedia | `expo-audio`, `expo-video` | Reproducción de audioguías, incluso con la pantalla apagada |
| Galería | `expo-image-picker` | Elegir una foto ya sacada en vez de sacar una nueva |

---

## 6. Contexto del producto (por qué existe)

Documento redactado por **Valeria Sosa**, directora de Turismo de la Municipalidad de Colón, Entre Ríos.

- Trabaja en la Dirección de Turismo desde 2014; la dirige desde 2021.
- Colón recibe cerca de **400.000 visitantes por año**; la mitad se concentra entre diciembre y Semana Santa.
- En temporada alta la oficina de la terminal atiende **300 consultas por día**.
- Siempre las mismas cuatro: dónde queda el Palmar, a qué hora abre el museo, dónde me baño, qué hay para hacer hoy a la noche.

Herramientas actuales (insuficientes y contradictorias entre sí):

- mostrador con dos personas
- mapa plastificado de 2019
- folletos impresos una vez por año
- Instagram a cargo de una persona por contrato
- página web de 2018 que nadie sabe editar

Hechos que motivan la app:

1. Imprimieron **5.000 folletos** en noviembre con el horario viejo del **Molino Forclaz**. El molino cambió el horario de verano en diciembre. Toda la temporada mandaron gente a un molino cerrado.
2. Un contingente de jubilados de Rosario pasó la tarde en la costanera sin saber que a **300 metros** salía una visita guiada gratuita. Se enteraron al día siguiente, cuando ya se volvían.
3. En 2023 una consultora cobró por poner **códigos QR** en los carteles de la peatonal. Llevan a una página que se ve mal en el celular y no se actualiza. El turista escanea, no entiende, y se lleva la idea de que son un desastre.

Lo que necesita:

- Una aplicación para el **celular del turista**.
- Que la baje cuando llega, que le sirva **mientras camina**.
- Que la información salga de **un solo lugar** que ellos puedan actualizar.
- **No** el folleto en pantalla.
- Algo que sepa **dónde está parada la persona** y le diga **qué tiene alrededor**.

Cita de cierre del PRD: *“Un turista pregunta cuatro cosas. Si se las contestamos bien, vuelve el año que viene y trae a la familia.”*

---

## 7. Qué tiene que hacer la app (seis áreas)

### 7.1 Los lugares (corazón del producto)

Permitir:

- Ver el **listado completo** de lugares.
- **Filtrar por categoría:** playas, termas, museos y patrimonio, gastronomía, artesanías, naturaleza, alojamiento.
- **Buscar por nombre.**
- Entrar al **detalle** de un lugar y ver:
  - fotos
  - descripción
  - horario
  - teléfono
  - cuánto sale entrar
- **Ordenar o filtrar por distancia** a donde está la persona.

De cada lugar hay que guardar:

- nombre
- a qué categoría pertenece
- descripción **corta** (listado) y **larga** (detalle)
- ubicación **exacta**
- dirección
- fotos
- **horarios de cada día de la semana**
- teléfono
- sitio web si tiene
- precio de entrada
- si es **accesible para silla de ruedas**
- si está **activo** o lo dieron de baja

**Ojo con los horarios (requisito de negocio):**

- lugares que abren distinto según el día
- otros que **cierran los lunes**
- las **termas** tienen horario de **verano** y de **invierno**
- no volver a mandar gente a una puerta cerrada

Tipos de lugares mencionados como ejemplos: termas, playas, museos, el Palmar, restaurantes recomendados, bodegas, feria de artesanos.

### 7.2 El mapa y qué tengo cerca

Pantalla que más imagina usando el turista. Necesita:

- Un mapa con **todos los lugares marcados**, y la persona **ubicada arriba**.
- Poder **tocar un marcador**: muestre el nombre y la distancia, y de ahí entrar al detalle.
- **Filtrar el mapa por categoría** (con todo prendido no se ve nada).
- Una lista de **“lo que tenés cerca”** ordenada por distancia.
- Un botón para que el celular **abra la aplicación de mapas** y lo lleve **caminando o en auto**.
- Cuando el lugar está lejos y no se ve el cartel: una **flecha** indique para qué lado queda.

### 7.3 La agenda de eventos

Ejemplos: peñas, Fiesta Nacional de la Artesanía, ferias, recitales en el anfiteatro, visitas guiadas, avistaje de aves en el Palmar. Hoy vive en Instagram y se pierde.

Necesita:

- Ver los eventos **por día**, empezando por **hoy**.
- Entrar al detalle: qué es, cuándo empieza, **cuánto dura**, dónde, si es **gratis**.
- Un evento puede estar **asociado a un lugar del catálogo**, o tener una **dirección suelta** cuando es en un campo o en la costanera.
- **Guardar un evento** y que la app **avise antes de que empiece**.
- Marcar un evento como **cancelado** o **suspendido por lluvia**, y que **quien lo guardó se entere**.

### 7.4 Mi recorrido

Quiere que la visita quede registrada y que el turista se lleve algo.

- Registrar que estuvo en un lugar de **tres formas**:
  1. escaneando el **código QR** del cartel
  2. estando **físicamente cerca**
  3. cargándolo **a mano**
- Sacar una **foto** en el lugar y que quede **asociada a esa visita**.
- Escribir una **nota corta**.
- Ver su **recorrido completo**, **en orden**, con las fotos.
- Los QR de la peatonal los van a **volver a imprimir** ellos; el **formato se define con el equipo de desarrollo**.
- Si alguien escanea un QR que **no es de ellos**, o uno **roto**: la app **no se tiene que romper ni quedar colgada**.

Cola offline de visitas (explícito en el modelo):

- Una visita se registra parada frente al molino, donde puede no haber señal.
- Se guarda primero en el teléfono con `sincronizada: false`.
- Se sube cuando vuelve la conexión.
- **Esa cola local es parte del trabajo, no un detalle.**

### 7.5 Favoritos y la cuenta

- Marcar un lugar como favorito **con un toque**.
- Ver la lista de favoritos.
- Que los **favoritos** y el **recorrido** sigan estando si la persona **cambia de teléfono** o **vuelve el año que viene**.
- Poder **entrar rápido** sin escribir la contraseña cada vez.
- Para **mirar el mapa y los lugares no se pide cuenta a nadie**.
- **La cuenta es para guardar cosas.**

Registro y login (cátedra + PRD combinados):

- Hay **registro** e **ingreso**.
- No es un muro obligatorio al abrir la app (el PRD pide consulta pública sin cuenta).
- Sí es obligatorio poder crear cuenta, iniciar sesión, persistir token y reingresar con biometría (o alternativa).
- Favoritos, recorrido y eventos guardados requieren identidad para poder sincronizar entre dispositivos.

### 7.6 Audioguías

- Tienen grabadas **ocho audioguías** de **tres a cinco minutos**.
- Hechas con el archivo histórico.
- Lugares citados: Molino Forclaz, Casa de la Cultura, puerto viejo, la Iglesia.
- El turista debe poder escucharlas **parado frente al lugar**.
- Reproducir la audioguía del lugar **cuando existe**.
- Poder **pausar**, **adelantar** y ver **cuánto falta**.
- Se pueda seguir escuchando con el celular **en el bolsillo** y la **pantalla apagada**.
- Dentro del **Parque Nacional El Palmar** prácticamente **no hay señal**, y es donde más gente quiere usar la app.
- Lo que se pueda **dejar guardado en el teléfono de antemano**, mejor.

---

## 8. Cómo se imagina el uso (wireframes del PRD)

Valeria aclara que no define el diseño final, pero dibuja lo que tiene en la cabeza.

### 8.1 Pantalla de inicio

```
+-----------------------------------+
| Colon                    [ Q ]    |
+-----------------------------------+
|                                   |
|              M A P A              |
|         con marcadores            |
|         (o) vos estas aca         |
|                                   |
+-----------------------------------+
| Cerca tuyo                        |
| - Termas de Colon           900 m |
| - Playa Paso Vela          1,1 km |
| - Museo Casa de la Cultura 1,4 km |
+-----------------------------------+
| [ Mapa ] [ Agenda ] [ Mi recorrido ] [ Yo ] |
+-----------------------------------+
```

Elementos implícitos:

- Título / ciudad: Colón
- Acción de búsqueda `[ Q ]`
- Mapa con marcadores y posición del usuario
- Bloque “Cerca tuyo” con nombre + distancia
- Barra inferior de cuatro destinos: **Mapa**, **Agenda**, **Mi recorrido**, **Yo**

### 8.2 Detalle de un lugar

```
+-----------------------------------+
| < Molino Forclaz              [*] |
+-----------------------------------+
|         [ fotografia ]            |
+-----------------------------------+
| Museos y patrimonio               |
| Abierto ahora - cierra 19:00      |
| A 4,2 km de donde estas           |
|                                   |
| Construido en 1888 por la familia |
| Forclaz, colonos suizos que ...   |
|                                   |
| [ Escuchar audioguia 4:12 ]       |
| [ Como llegar ]                   |
| [ Registrar visita ]              |
+-----------------------------------+
```

Elementos implícitos:

- Volver
- Favorito `[*]`
- Foto
- Categoría
- Estado de apertura: “Abierto ahora - cierra 19:00”
- Distancia
- Descripción larga
- Botón de audioguía con **duración visible**
- Cómo llegar
- Registrar visita

---

## 9. Requisitos de uso real (UX / restricciones de contexto)

- **Tiene que servir sin señal.** En el Palmar no hay datos y en la costanera se cae seguido. Si la persona ya abrió la app en el hotel, después tiene que poder seguir viendo los **lugares** y su **recorrido**.
- **Si niega un permiso, la app tiene que seguir funcionando.** Hay gente que no le da la ubicación a nada. Que igual pueda ver el **listado** y el **mapa**, aunque no aparezca su punto.
- **No convertirla en una máquina de notificaciones.** Si alguien camina por la peatonal no puede recibir **doce avisos en cinco cuadras**. **Un aviso por lugar y por día** es más que suficiente.
- **Se usa al sol y con una mano.** Turista caminando, con calor, a veces con un chico de la otra mano. **Letra grande, contraste fuerte, botones grandes.**
- **Mucha gente grande.** Si el teléfono tiene la letra agrandada, la app tiene que **respetarlo y no romperse**.
- **Android y iPhone.** Más o menos mitad y mitad. (La entrega de la cátedra pide APK Android con EAS preview.)
- **Nadie lee instrucciones.** Si hay que explicar cómo se usa, está mal hecha.

Preferencias de usuario previstas en el modelo (también son requisitos de datos):

- `categoriasFavoritas: string[]`
- `avisarProximidad: boolean`
- `radioAvisoMetros: number` — **100, 250 o 500**
- `tema: "claro" | "oscuro" | "sistema"`

---

## 10. Fuera de alcance (primera versión)

Valeria las quiere, pero **para después**. No entran ahora:

- Reservas y pagos de entradas o excursiones.
- Comentarios y puntuación de los lugares por parte de los turistas.
- Traducción a **inglés y portugués** (aunque los datos deberían **prever que va a venir**).
- Panel web para que su equipo cargue los lugares. Por ahora los carga ella **pasándoles una planilla**.
- Realidad aumentada, chat, y todo lo demás que le ofrecieron y no entendió.

---

## 11. Cómo viene la información (API, mocks y arquitectura)

### 11.1 Origen de datos

- La **API la provee la cátedra** y va a estar disponible **más adelante en el cuatrimestre**.
- Hasta entonces, la app se construye contra **datos inventados**.
- El panel de carga municipal **no** forma parte de esta versión.

### 11.2 Reglas para que el cambio a la API sea barato

1. Los tipos de este documento se escriben **una sola vez** en `src/tipos/` y **no se tocan** cuando llegue la API.
2. Los datos falsos van en `src/mocks/`, tipados con esos mismos tipos. Si el mock **no compila** contra el tipo, está mal el mock.
3. **Ninguna pantalla importa el mock directamente.** Toda lectura de datos pasa por una capa de servicios (`src/servicios/lugares.ts` como ejemplo) que hoy devuelve el mock y mañana hace `fetch`. **Ese es el único archivo que cambia.**
4. Los servicios son **asíncronos desde el primer día**, aunque el mock responda al instante. Si arrancan sincrónicos, después hay que reescribir todas las pantallas.
5. Los mocks tienen que incluir los **casos feos**:
   - un lugar **sin audioguía**
   - uno **sin teléfono**
   - una **lista vacía**
   - un **texto larguísimo** que rompe el diseño
   - un **error de red**

### 11.3 Forma de la respuesta de la API (el mock ya tiene que tenerla)

Éxito:

```json
{
  "datos": [ ],
  "meta": {
    "total": 42,
    "pagina": 1,
    "porPagina": 20
  }
}
```

Error:

```json
{
  "error": {
    "codigo": "LUGAR_NO_ENCONTRADO",
    "mensaje": "No existe ese lugar."
  }
}
```

### 11.4 Convenciones de datos (sin excepción)

- Los **identificadores son cadenas de texto**, no números. **Nunca** se hace cuentas con ellos.
- Las **fechas y horas** viajan como texto en **ISO 8601 con zona** (`"2026-11-14T21:00:00-03:00"`).
- Nunca un objeto `Date` ni un número en el transporte. Se convierte a `Date` **recién al mostrar**.
- Las claves van en **camelCase**.
- Un campo que puede no tener valor viene como **`null`**, no ausente y no como cadena vacía.
- Los **precios** son números en **pesos**, con **`0` para gratis** y **`null` cuando no aplica**.
- La sesión viaja en la cabecera `Authorization: Bearer <token>`.
- El token se guarda en **`expo-secure-store`**, **nunca** en kv-store.

---

## 12. Entidades, tipos TypeScript y ejemplos de mock

Referencia completa del PRD. Es lo que la app tiene que guardar y mostrar.

### 12.1 Coordenadas, horario y audioguía (tipos auxiliares)

```ts
export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  abre: string;   // "09:00"
  cierra: string; // "19:00"
}

export interface Audioguia {
  url: string;
  duracionSegundos: number;
  idioma: "es" | "en" | "pt";
}
```

### 12.2 Lugar

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"lug-004"` |
| `nombre` | `string` | `"Molino Forclaz"` |
| `categoriaId` | `string` | `"cat-museos"` |
| `descripcionCorta` | `string` | `"Molino de 1888 de colonos suizos"` |
| `descripcion` | `string` | texto largo para el detalle |
| `coordenadas` | `Coordenadas` | `{ latitud: -32.19, longitud: -58.19 }` |
| `direccion` | `string` | `"Colonia San José, Ruta 26"` |
| `imagenes` | `string[]` | `["https://.../molino-1.jpg"]` |
| `horarios` | `Horario[]` | uno por día que abre |
| `telefono` | `string \| null` | `"345-4421234"` |
| `sitioWeb` | `string \| null` | `null` |
| `precioEntrada` | `number \| null` | `1500` |
| `audioguia` | `Audioguia \| null` | ver abajo |
| `codigoQr` | `string \| null` | `"COLON:lug-004"` |
| `accesible` | `boolean` | `false` |
| `activo` | `boolean` | `true` |
| `actualizadoEn` | `string` (ISO) | `"2026-08-01T10:30:00-03:00"` |

```ts
export interface Lugar {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcionCorta: string;
  descripcion: string;
  coordenadas: Coordenadas;
  direccion: string;
  imagenes: string[];
  horarios: Horario[];
  telefono: string | null;
  sitioWeb: string | null;
  precioEntrada: number | null;
  audioguia: Audioguia | null;
  codigoQr: string | null;
  accesible: boolean;
  activo: boolean;
  actualizadoEn: string;
}
```

Ejemplo listo para mock:

```json
{
  "id": "lug-004",
  "nombre": "Molino Forclaz",
  "categoriaId": "cat-museos",
  "descripcionCorta": "Molino de viento de 1888 levantado por colonos suizos.",
  "descripcion": "Construido en 1888 por Juan Bautista Forclaz ...",
  "coordenadas": { "latitud": -32.1904, "longitud": -58.1932 },
  "direccion": "Colonia San José, Ruta Provincial 26",
  "imagenes": ["https://api.colon.tur.ar/img/molino-1.jpg"],
  "horarios": [
    { "dia": 2, "abre": "09:00", "cierra": "19:00" },
    { "dia": 6, "abre": "10:00", "cierra": "20:00" }
  ],
  "telefono": "345-4421234",
  "sitioWeb": null,
  "precioEntrada": 1500,
  "audioguia": {
    "url": "https://api.colon.tur.ar/audio/molino-es.m4a",
    "duracionSegundos": 252,
    "idioma": "es"
  },
  "codigoQr": "COLON:lug-004",
  "accesible": false,
  "activo": true,
  "actualizadoEn": "2026-08-01T10:30:00-03:00"
}
```

Formato de QR del ejemplo: `COLON:lug-004`.

### 12.3 Categoría

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"cat-museos"` |
| `nombre` | `string` | `"Museos y patrimonio"` |
| `icono` | `string` | `"business-outline"` |
| `color` | `string` | `"#8E5A4A"` |
| `orden` | `number` | `3` |

```ts
export interface Categoria {
  id: string;
  nombre: string;
  icono: string; // nombre del ícono de Ionicons
  color: string; // hexadecimal
  orden: number;
}
```

```json
{
  "id": "cat-museos",
  "nombre": "Museos y patrimonio",
  "icono": "business-outline",
  "color": "#8E5A4A",
  "orden": 3
}
```

Categorías de filtro pedidas en texto (nombres de negocio):

- playas
- termas
- museos y patrimonio
- gastronomía
- artesanías
- naturaleza
- alojamiento

### 12.4 Evento

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"evt-017"` |
| `titulo` | `string` | `"Peña en el anfiteatro"` |
| `descripcion` | `string` | texto |
| `lugarId` | `string \| null` | `"lug-009"` |
| `direccionLibre` | `string \| null` | `null` |
| `coordenadas` | `Coordenadas \| null` | sólo si no hay `lugarId` |
| `inicio` | `string` (ISO) | `"2026-11-14T21:00:00-03:00"` |
| `fin` | `string \| null` | `"2026-11-15T02:00:00-03:00"` |
| `imagenUrl` | `string \| null` | `"https://.../pena.jpg"` |
| `precio` | `number \| null` | `0` (gratis) |
| `estado` | `EstadoEvento` | `"programado"` |

```ts
export type EstadoEvento = "programado" | "suspendido" | "cancelado" | "finalizado";

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null;
  inicio: string;
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: EstadoEvento;
}
```

```json
{
  "id": "evt-017",
  "titulo": "Peña en el anfiteatro",
  "descripcion": "Noche de folclore con artistas de la región.",
  "lugarId": "lug-009",
  "direccionLibre": null,
  "coordenadas": null,
  "inicio": "2026-11-14T21:00:00-03:00",
  "fin": "2026-11-15T02:00:00-03:00",
  "imagenUrl": "https://api.colon.tur.ar/img/pena.jpg",
  "precio": 0,
  "estado": "programado"
}
```

### 12.5 Usuario y preferencias

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"usr-201"` |
| `nombre` | `string` | `"Lucía Méndez"` |
| `email` | `string` | `"lucia@mail.com"` |
| `avatarUrl` | `string \| null` | `null` |
| `creadoEn` | `string` (ISO) | `"2026-09-02T18:20:00-03:00"` |
| `preferencias` | `Preferencias` | ver abajo |

```ts
export interface Preferencias {
  categoriasFavoritas: string[];
  avisarProximidad: boolean;
  radioAvisoMetros: number; // 100, 250 o 500
  tema: "claro" | "oscuro" | "sistema";
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  creadoEn: string;
  preferencias: Preferencias;
}
```

```json
{
  "id": "usr-201",
  "nombre": "Lucía Méndez",
  "email": "lucia@mail.com",
  "avatarUrl": null,
  "creadoEn": "2026-09-02T18:20:00-03:00",
  "preferencias": {
    "categoriasFavoritas": ["cat-museos", "cat-playas"],
    "avisarProximidad": true,
    "radioAvisoMetros": 250,
    "tema": "sistema"
  }
}
```

### 12.6 Favorito

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"fav-088"` |
| `usuarioId` | `string` | `"usr-201"` |
| `lugarId` | `string` | `"lug-004"` |
| `creadoEn` | `string` (ISO) | `"2026-11-12T09:05:00-03:00"` |

```ts
export interface Favorito {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
}
```

```json
{
  "id": "fav-088",
  "usuarioId": "usr-201",
  "lugarId": "lug-004",
  "creadoEn": "2026-11-12T09:05:00-03:00"
}
```

### 12.7 Visita

| Propiedad | Tipo | Ejemplo |
|-----------|------|---------|
| `id` | `string` | `"vis-311"` |
| `usuarioId` | `string` | `"usr-201"` |
| `lugarId` | `string` | `"lug-004"` |
| `fechaHora` | `string` (ISO) | `"2026-11-13T16:42:00-03:00"` |
| `origen` | `OrigenVisita` | `"qr"` |
| `fotoUri` | `string \| null` | ruta local hasta que se sube |
| `nota` | `string \| null` | `"Hacía 38 grados"` |
| `sincronizada` | `boolean` | `false` |

```ts
export type OrigenVisita = "qr" | "gps" | "manual";

export interface Visita {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri: string | null;
  nota: string | null;
  sincronizada: boolean;
}
```

```json
{
  "id": "vis-311",
  "usuarioId": "usr-201",
  "lugarId": "lug-004",
  "fechaHora": "2026-11-13T16:42:00-03:00",
  "origen": "qr",
  "fotoUri": "file:///.../visitas/vis-311.jpg",
  "nota": "Hacía 38 grados pero valió la pena",
  "sincronizada": false
}
```

---

## 13. Estructura de carpetas exigida por el PRD

Mínimo implícito / explícito:

```
src/
  tipos/          # tipos una sola vez; no se tocan cuando llegue la API
  mocks/          # datos falsos tipados
  servicios/      # único lugar que importa mocks / hace fetch
    lugares.ts    # ejemplo citado en el PRD
```

Regla: las pantallas **no** importan mocks.

---

## 14. Identidad visual de la app

- Nombre del producto (propio; el PRD usa “Mi Ciudad” / Colón).
- Ícono propio: PNG **1024×1024**, cuadrado, **sin transparencias**.
- Splash / pantalla de presentación propia.

---

## 15. Lista de verificación para aprobar

Usar esto contra la app instalada (no contra el código).

### Entrega

- [ ] APK preview instalable sin Metro ni PC
- [ ] Comando usado: `eas build --platform android --profile preview`
- [ ] Código fuente (Git o zip) con `eas.json` y `app.json`
- [ ] Sin `node_modules` en la entrega
- [ ] Primer build hecho con al menos una semana de anticipación (recomendación de la cátedra)

### Defensa

- [ ] 15–20 minutos grupales
- [ ] App andando en un teléfono (Expo Go o APK)
- [ ] Cada integrante explica su parte y responde sobre su código
- [ ] Sin IA en la defensa

### Diez mínimos de cátedra

- [ ] 1. Pantallas del PRD + Expo Router
- [ ] 2. Registro, login, sesión persistente, token en SecureStore, biometría + alternativa
- [ ] 3. API detrás de servicios; loading / empty / error visibles
- [ ] 4. Cámara (foto y QR si el PRD lo pide) o image-picker; File / Directory / Paths
- [ ] 5. Location + maps; usable si niega permiso
- [ ] 6. Notificaciones por hecho real (no botón de prueba)
- [ ] 7. SQLite + kv-store; algo visible offline; aviso de red
- [ ] 8. Sensors o haptics justificado
- [ ] 9. Audio/video con controles visibles si el PRD lo pide
- [ ] 10. Ícono 1024×1024 sin transparencia + splash + nombre

### PRD — lugares

- [ ] Listado completo
- [ ] Filtro por las 7 categorías
- [ ] Búsqueda por nombre
- [ ] Detalle: fotos, descripción, horario, teléfono, precio
- [ ] Orden/filtro por distancia
- [ ] Horarios por día; no mandar gente a un lugar cerrado
- [ ] Campos: accesible, activo/baja, web, coordenadas, dirección

### PRD — mapa

- [ ] Marcadores de todos los lugares
- [ ] Usuario ubicado en el mapa
- [ ] Tap en marcador: nombre + distancia → detalle
- [ ] Filtro de mapa por categoría
- [ ] Lista “cerca tuyo” por distancia
- [ ] Abrir app de mapas nativa (caminando o auto)
- [ ] Flecha hacia el lugar (magnetómetro)

### PRD — eventos

- [ ] Por día, empezando por hoy
- [ ] Detalle: qué, inicio, duración, dónde, gratis o no
- [ ] Asociado a lugar o dirección suelta
- [ ] Guardar evento + recordatorio antes de que empiece
- [ ] Cancelado / suspendido por lluvia notifica a quien lo guardó

### PRD — recorrido

- [ ] Alta de visita: QR, GPS, manual
- [ ] Foto asociada (cámara y/o galería)
- [ ] Nota corta
- [ ] Recorrido completo en orden con fotos
- [ ] QR inválido o ajeno no rompe la app
- [ ] Cola local `sincronizada: false` y subida al volver la red

### PRD — cuenta y favoritos

- [ ] Consulta de mapa/lugares **sin** cuenta
- [ ] Favorito con un toque + lista
- [ ] Favoritos y recorrido persisten entre dispositivos / al año siguiente
- [ ] Reingreso rápido (biometría)

### PRD — audioguías

- [ ] Play si el lugar tiene audioguía
- [ ] Pausa, adelantar, tiempo restante
- [ ] Sigue con pantalla apagada
- [ ] Cache en disco para El Palmar / sin señal

### PRD — uso

- [ ] Offline: lugares y recorrido si ya se abrió antes
- [ ] Sin ubicación: listado y mapa igual
- [ ] Máximo un aviso de proximidad por lugar y por día
- [ ] Tipografía grande, contraste, botones grandes
- [ ] Respeta Dynamic Type / fuente del sistema
- [ ] Se entiende sin tutorial

### Arquitectura de datos

- [ ] Tipos en `src/tipos/`
- [ ] Mocks en `src/mocks/`
- [ ] Servicios asíncronos; pantallas no importan mocks
- [ ] Envelope `{ datos, meta }` / `{ error }`
- [ ] IDs string, ISO con zona, camelCase, `null` no `""`
- [ ] Token Bearer solo en SecureStore
- [ ] Mocks con casos feos (sin audio, sin teléfono, vacío, texto largo, error de red)

### Fuera de alcance (no implementar ahora)

- [ ] No reservas ni pagos
- [ ] No comentarios ni puntuación de turistas
- [ ] No i18n de UI (sí prever idioma en audioguía: `es | en | pt`)
- [ ] No panel web de carga
- [ ] No AR ni chat

---

## 16. Huecos y contradicciones a preguntar (el PRD lo pide)

El documento dice que tiene errores y olvidos. No resolverlos en silencio. Preguntas que salen del texto mismo:

1. El modelo `Horario` no tiene temporada, pero las termas tienen horario de verano e invierno. ¿Cómo se modela?
2. La cátedra pide APK Android; el cliente pide Android e iPhone. ¿iOS es obligatorio en esta entrega?
3. “Un aviso por lugar y por día” vs. recordatorio de evento + aviso de cancelación + proximidad. ¿Cómo se priorizan?
4. Radio de aviso 100 / 250 / 500 m vs. “estar físicamente cerca” para registrar visita por GPS. ¿Es el mismo radio?
5. Formato QR: el ejemplo es `COLON:lug-004`, pero dice que el formato se define con el equipo. ¿Queda ese?
6. ¿Los lugares inactivos se ocultan del mapa/listado o se muestran como dados de baja?
7. Un evento con `lugarId` y también `direccionLibre`/`coordenadas`: ¿cuál gana?
8. `fin` de evento nulo: ¿cómo se calcula “cuánto dura” en el detalle?
9. Preferencia `tema` claro/oscuro/sistema: ¿es obligatoria la UI en esta versión?
10. `categoriasFavoritas` del usuario: ¿filtran el mapa por defecto o solo son preferencia guardada?
11. Audioguía con idioma `en`/`pt` aunque la UI no se traduce aún: ¿se muestra selector o solo español?
12. Foto de visita: `fotoUri` local hasta que se sube. ¿La API de cátedra acepta upload de archivos? Hasta que exista, ¿solo local?
13. “Favoritos y recorrido siguen si cambia de teléfono” implica sync en servidor. ¿La API de cátedra cubre favoritos y visitas, o hay que simularlo?
14. Registro/login: el PRD no lista campos de contraseña ni endpoints. Dependen de la API de la cátedra.
15. “Declarados en la.” — frase cortada en la consigna. Confirmar integrantes en el Campus.
16. Entrega: “build de producción con EAS” en la tabla técnica vs. “perfil preview” en la consigna. La consigna de entrega manda **preview**.
17. Íconos: Ionicons vía `@react-native-vector-icons/ionicons`; las categorías traen `icono` como nombre (ej. `business-outline`).
18. Multimedia: el PRD de producto pide audio; video está en la tabla de paquetes. ¿Hay clips de video o solo audioguías?

---

## 17. Comando de build de entrega

```bash
eas build --platform android --profile preview
```

Debe resultar un APK de release instalable y usable sin Metro y sin la computadora de nadie.
