// Dueño: A — Cuenta y plataforma
// Perfil + preferencias (tema, aviso, radio, categorías).

import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import {
  BORDE_BOTON,
  TEXTO_SOBRE_CATEGORIA,
  colorAbierto,
  tipografia,
  useTema,
} from '@/compartido/tema';
import { cargarNotificaciones } from '@/compartido/notificaciones';
import { leerUltimaSincronizacion, textoMomento } from '@/compartido/ultimaSincronizacion';
import { useRed } from '@/compartido/useRed';
import { useSesion } from '@/cuenta/SesionContext';
import { leerFavoritos } from '@/cuenta/favoritosDb';
import { traerFavoritos } from '@/cuenta/useFavoritos';
import { RADIOS_AVISO_METROS, usePreferencias } from '@/cuenta/usePreferencias';
import { leerIdsEventosGuardados } from '@/eventos/eventosDb';
import { sincronizarEventosGuardados } from '@/eventos/useEventoGuardado';
import { pedirPermisosAlPrenderAviso } from '@/mapa/proximidad';
import { IconoCategoria } from '@/lugares/componentes/IconoCategoria';
import { useCategorias } from '@/lugares/useCategorias';
import { useVisitas } from '@/recorrido/useVisitas';
import type { Tema } from '@/tipos/usuario';

// Pestaña Yo: perfil, resumen y ajustes. Con sesión, el resumen se sincroniza.

const OPCIONES_TEMA: { valor: Tema; texto: string }[] = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Como el teléfono' },
];

const TEXTO_TEMA: Record<Tema, string> = {
  claro: 'Modo claro',
  oscuro: 'Modo oscuro',
  sistema: 'Igual que el teléfono',
};

// Lo que suma una cuenta (PRD §7.5: "la cuenta es para guardar cosas").
const BENEFICIOS: { icono: IoniconsIconName; texto: string }[] = [
  { icono: 'heart-outline', texto: 'Guardar favoritos' },
  { icono: 'footsteps-outline', texto: 'Registrar tus visitas' },
  { icono: 'calendar-outline', texto: 'Guardar eventos con aviso' },
  { icono: 'cloud-outline', texto: 'Recuperarlo en otro teléfono' },
];

type Ajuste = 'apariencia' | 'avisos' | 'categorias';

function inicialDeNombre(nombre: string): string {
  const letra = nombre.trim().charAt(0);
  return letra ? letra.toUpperCase() : '?';
}

export default function PantallaYo() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario, token, cargando, cuentaDesbloqueada, exigirCuenta, cerrarSesion } = useSesion();
  const [pidiendo, setPidiendo] = useState(false);
  const autoPedido = useRef(false);

  useEffect(() => {
    if (!token) {
      autoPedido.current = false;
    }
  }, [token]);

  // useFocusEffect: corre cuando Yo está visible. Si las tabs montan
  // esta pantalla atrás del mapa, no pedimos huella al abrir.
  useFocusEffect(
    useCallback(() => {
      if (cargando || !token || cuentaDesbloqueada || autoPedido.current) {
        return;
      }

      autoPedido.current = true;
      setPidiendo(true);
      void exigirCuenta().finally(() => {
        setPidiendo(false);
      });
    }, [cargando, token, cuentaDesbloqueada, exigirCuenta]),
  );

  if (cargando) {
    return <EstadoCarga mensaje="Leyendo la sesión…" />;
  }

  if (token && !cuentaDesbloqueada) {
    if (pidiendo) {
      return <EstadoCarga mensaje="Confirmá que sos vos…" />;
    }

    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <View style={[estilos.iconoGrande, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
          <Ionicons name="lock-closed-outline" size={30} color={colores.primario} />
        </View>
        <Text style={[estilos.titulo, estilos.textoCentrado, { color: colores.texto }]}>
          Tu sesión está guardada
        </Text>
        <Text style={[estilos.detalle, estilos.textoCentrado, { color: colores.textoSuave }]}>
          Desbloqueá con huella, rostro o contraseña para ver tu cuenta.
        </Text>
        <Boton
          titulo="Desbloquear"
          onPress={() => {
            setPidiendo(true);
            void exigirCuenta().finally(() => {
              setPidiendo(false);
            });
          }}
        />
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: colores.fondo }]}>
      <View
        style={[
          estilos.encabezado,
          {
            backgroundColor: colores.encabezado,
            borderBottomWidth: 1,
            borderBottomColor: colores.bordeEncabezado,
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
      >
        <Text style={[estilos.encabezadoAntetitulo, { color: colores.textoSobreEncabezado }]}>
          Mi espacio
        </Text>
        <Text accessibilityRole="header" style={[estilos.encabezadoTitulo, { color: colores.textoSobreEncabezado }]}>
          Yo
        </Text>
      </View>
      <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
        {usuario ? (
          <ConCuenta
            usuarioId={usuario.id}
            nombre={usuario.nombre}
            email={usuario.email}
            onCerrarSesion={() => void cerrarSesion()}
          />
        ) : (
          <SinCuenta />
        )}
      </ScrollView>
    </View>
  );
}

// ── Sin sesión ──────────────────────────────────────────────

function SinCuenta() {
  const { colores } = useTema();

  return (
    <>
      <Tarjeta>
        <Text style={[estilos.titulo, { color: colores.texto }]}>Tu viaje, a tu manera</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Explorá libremente. Iniciá sesión solo cuando quieras conservar tus recuerdos.
        </Text>
        <View style={estilos.botones}>
          <Boton titulo="Ingresar" onPress={() => router.push('/login')} />
          <Boton titulo="Crear cuenta" variante="secundario" onPress={() => router.push('/registro')} />
        </View>
      </Tarjeta>

      <View style={estilos.bloque}>
        <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>QUÉ SUMA UNA CUENTA</Text>
        <View style={estilos.grilla}>
          {BENEFICIOS.map((beneficio) => (
            <View
              key={beneficio.texto}
              style={[estilos.beneficio, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}
            >
              <Ionicons name={beneficio.icono} size={20} color={colores.primario} />
              <Text style={[estilos.beneficioTexto, { color: colores.texto }]}>{beneficio.texto}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* El tema vive en el teléfono (kv-store): no hace falta cuenta. */}
      <Tarjeta>
        <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>APARIENCIA</Text>
        <SelectorTema />
      </Tarjeta>

      <View style={[estilos.franjaLibre, { borderColor: colores.borde, backgroundColor: colores.fondoElevado }]}>
        <Ionicons name="checkmark-circle-outline" size={20} color={colores.primario} />
        <View style={estilos.flex}>
          <Text style={[estilos.subtitulo, { color: colores.primario }]}>Explorá libremente</Text>
          <Text style={[estilos.franjaTexto, { color: colores.textoSuave }]}>
            Mapa, lugares, agenda y audioguías no requieren cuenta.
          </Text>
        </View>
      </View>
    </>
  );
}

// ── Con sesión ──────────────────────────────────────────────

type Resumen = { favoritos: number; eventos: number };

function ConCuenta({
  usuarioId,
  nombre,
  email,
  onCerrarSesion,
}: {
  usuarioId: string;
  nombre: string;
  email: string;
  onCerrarSesion: () => void;
}) {
  const { colores, oscuro } = useTema();
  const { online } = useRed();
  const { visitas, cargando: cargandoVisitas } = useVisitas();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  const [abierto, setAbierto] = useState<Ajuste | null>(null);

  // Favoritos y eventos: se releen al volver a Yo.
  // Visitas: useVisitas (misma clave que Recorrido).
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        try {
          await traerFavoritos(usuarioId);
          await sincronizarEventosGuardados(usuarioId);
          const favoritos = await leerFavoritos(usuarioId);
          const eventos = await leerIdsEventosGuardados();
          if (vivo) {
            setUltimaSync(leerUltimaSincronizacion());
            setResumen({
              favoritos: favoritos.length,
              eventos: eventos.length,
            });
          }
        } catch (err) {
          console.error('[yo] No se pudo leer el resumen', err);
        }
      })();
      return () => {
        vivo = false;
      };
    }, [usuarioId]),
  );

  // Última sincronización correcta (visitas o favoritos); sin dato, no se muestra hora.
  const pendientes = visitas.filter((visita) => !visita.sincronizada).length;
  const cuando = ultimaSync ? textoMomento(ultimaSync) : null;
  const estadoSync =
    pendientes === 0
      ? {
          texto: cuando ? `Sincronizado · ${cuando}` : 'Todo guardado en tu cuenta',
          color: colorAbierto(oscuro),
        }
      : {
          texto:
            `${pendientes} ${pendientes === 1 ? 'visita' : 'visitas'} por subir` +
            (online ? '' : ' · sin señal') +
            (cuando ? ` · última vez ${cuando}` : ''),
          color: colores.avisoTexto,
        };

  function alternar(ajuste: Ajuste) {
    setAbierto((actual) => (actual === ajuste ? null : ajuste));
  }

  return (
    <>
      <Tarjeta fila>
        <View style={[estilos.avatar, { backgroundColor: colores.fondo, borderColor: colores.primario }]}>
          <Text style={[estilos.avatarTexto, { color: colores.primario }]}>{inicialDeNombre(nombre)}</Text>
        </View>
        <View style={estilos.perfilTextos}>
          <Text style={[estilos.titulo, { color: colores.texto }]} numberOfLines={2}>
            {nombre}
          </Text>
          <Text style={[estilos.detalle, { color: colores.textoSuave }]} numberOfLines={1}>
            {email}
          </Text>
          {resumen ? (
            <View style={estilos.filaEstado}>
              <View style={[estilos.punto, { backgroundColor: estadoSync.color }]} />
              <Text style={[estilos.estadoTexto, { color: estadoSync.color }]}>{estadoSync.texto}</Text>
            </View>
          ) : null}
        </View>
      </Tarjeta>

      <View style={[estilos.resumen, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
        <Dato
          valor={resumen?.favoritos}
          texto="Favoritos"
          ayuda="Abre tus lugares favoritos"
          onPress={() => router.push('/yo/favoritos')}
        />
        <View style={[estilos.separador, { backgroundColor: colores.borde }]} />
        <Dato
          valor={cargandoVisitas ? undefined : visitas.length}
          texto="Visitas"
          ayuda="Abre Mi recorrido"
          onPress={() => router.push('/recorrido')}
        />
        <View style={[estilos.separador, { backgroundColor: colores.borde }]} />
        <Dato
          valor={resumen?.eventos}
          texto="Eventos"
          ayuda="Abre la agenda"
          onPress={() => router.push('/agenda')}
        />
      </View>

      <AjustesConCuenta abierto={abierto} onAlternar={alternar} />

      <Pressable
        onPress={onCerrarSesion}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.cerrarSesion,
          { borderColor: colores.peligro, backgroundColor: colores.fondoElevado },
          pressed && estilos.presionado,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={colores.peligro} />
        <Text style={[estilos.cerrarSesionTexto, { color: colores.peligro }]}>Cerrar sesión</Text>
      </Pressable>

      <Text style={[estilos.nota, { color: colores.textoSuave }]}>
        Tus ajustes se guardan en este teléfono y, si hay red, también en tu cuenta.
      </Text>
    </>
  );
}

function AjustesConCuenta({
  abierto,
  onAlternar,
}: {
  abierto: Ajuste | null;
  onAlternar: (ajuste: Ajuste) => void;
}) {
  const { colores, oscuro } = useTema();
  const { preferencias, guardar } = usePreferencias();
  const { categorias } = useCategorias();

  function alternarCategoria(id: string) {
    const yaEsta = preferencias.categoriasFavoritas.includes(id);
    const categoriasFavoritas = yaEsta
      ? preferencias.categoriasFavoritas.filter((categoriaId) => categoriaId !== id)
      : [...preferencias.categoriasFavoritas, id];
    void guardar({ categoriasFavoritas });
  }

  async function alCambiarAvisoCerca(prender: boolean) {
    if (!prender) {
      await guardar({ avisarProximidad: false });
      return;
    }

    const resultado = await pedirPermisosAlPrenderAviso();
    if (resultado === 'sinGps') {
      Alert.alert(
        'Sin ubicación no podemos avisarte',
        'No diste permiso para usar el GPS. No sabemos si estás cerca de un lugar. El aviso quedó apagado. Si lo querés, activá la ubicación en Ajustes.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }

    await guardar({ avisarProximidad: true });

    if (resultado === 'sinAvisos') {
      Alert.alert(
        'Ubicación sí, avisos no',
        'Vamos a saber si estás cerca, pero no diste permiso para las notificaciones. No va a aparecer el globito. Activalas en Ajustes.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }

    if (resultado === 'siempre') {
      Alert.alert(
        'Listo, te vamos a avisar',
        'Si te acercás a un lugar, te llega un aviso. También con la app cerrada.',
      );
      return;
    }

    Alert.alert(
      'Va a avisarte solo con la app abierta',
      'No diste permiso de ubicación “siempre”. Con la app cerrada no te podemos avisar. Si lo querés, en Ajustes elegí “Permitir todo el tiempo”.',
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
      ],
    );
  }

  const cantidadCategorias = preferencias.categoriasFavoritas.length;

  return (
    <View style={estilos.bloque}>
      <Text style={[estilos.rotulo, { color: colores.textoSuave }]}>AJUSTES</Text>

      <Acordeon
        icono="color-palette-outline"
        titulo="Apariencia"
        subtitulo={TEXTO_TEMA[preferencias.tema]}
        abierto={abierto === 'apariencia'}
        onAlternar={() => onAlternar('apariencia')}
      >
        <SelectorTema />
      </Acordeon>

      <Acordeon
        icono="notifications-outline"
        titulo="Notificaciones"
        subtitulo={
          preferencias.avisarProximidad
            ? `Aviso al acercarme a ${preferencias.radioAvisoMetros} m`
            : 'Aviso al acercarme apagado'
        }
        abierto={abierto === 'avisos'}
        onAlternar={() => onAlternar('avisos')}
      >
        <View style={estilos.filaSwitch}>
          <View style={estilos.flex}>
            <Text style={[estilos.subtitulo, { color: colores.texto }]}>Avisarme al acercarme</Text>
            <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
              Un solo aviso por lugar y por día. Con la app cerrada hace falta ubicación “siempre”.
            </Text>
          </View>
          <Switch
            value={preferencias.avisarProximidad}
            onValueChange={(valor) => void alCambiarAvisoCerca(valor)}
            // Cabeza blanca y riel apagado gris: visibles en claro y oscuro.
            trackColor={{ false: oscuro ? '#6B7590' : '#7C857E', true: colores.primario }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={oscuro ? '#6B7590' : '#7C857E'}
            accessibilityLabel="Avisar cuando esté cerca de un lugar"
          />
        </View>

        <View style={[estilos.bloqueChico, !preferencias.avisarProximidad && estilos.apagado]}>
          <Text style={[estilos.subtitulo, { color: colores.texto }]}>A qué distancia</Text>
          <Segmentado
            opciones={RADIOS_AVISO_METROS.map((radio) => ({ valor: radio, texto: `${radio} m` }))}
            valor={preferencias.radioAvisoMetros}
            onCambiar={(radio) => void guardar({ radioAvisoMetros: radio })}
            etiqueta={(texto) => `${texto.replace(' m', '')} metros`}
          />
        </View>

        <View style={[estilos.divisor, { backgroundColor: colores.borde }]} />

        <PermisoNotificaciones />

        {/* Sin interruptor: el recordatorio se pide con "Avisarme" en cada evento
            y el aviso de cancelado o suspendido lo exige el PRD. */}
        <View style={[estilos.cajaInfo, { backgroundColor: colores.fondo, borderColor: colores.borde }]}>
          <View style={estilos.filaIconoTexto}>
            <Ionicons name="information-circle-outline" size={18} color={colores.textoSuave} />
            <Text style={[estilos.cajaInfoTitulo, { color: colores.textoSuave }]}>
              Cómo funcionan los avisos de eventos
            </Text>
          </View>
          <FilaInfo
            icono="alarm-outline"
            titulo="Recordatorio"
            texto="Llega 1 hora antes de cada evento que guardes con “Avisarme”. Si no lo querés, quitá el evento desde la Agenda."
          />
          <FilaInfo
            icono="alert-circle-outline"
            titulo="Si se suspende o se cancela"
            texto="Te avisamos siempre, para que no vayas en vano."
          />
        </View>
      </Acordeon>

      <Acordeon
        icono="pricetags-outline"
        titulo="Categorías que te interesan"
        subtitulo={
          cantidadCategorias === 0
            ? 'Ninguna elegida'
            : `${cantidadCategorias} ${cantidadCategorias === 1 ? 'elegida' : 'elegidas'}`
        }
        abierto={abierto === 'categorias'}
        onAlternar={() => onAlternar('categorias')}
      >
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
          Tocá las que más te gustan. Podés cambiarlas cuando quieras.
        </Text>
        <View style={estilos.chips}>
          {categorias.map((categoria) => {
            const elegida = preferencias.categoriasFavoritas.includes(categoria.id);
            return (
              <Pressable
                key={categoria.id}
                onPress={() => alternarCategoria(categoria.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: elegida }}
                accessibilityLabel={categoria.nombre}
                style={[
                  estilos.chip,
                  elegida
                    ? { backgroundColor: categoria.color, borderColor: categoria.color }
                    : { backgroundColor: colores.fondo, borderColor: colores.borde },
                ]}
              >
                {elegida ? (
                  <Ionicons name="checkmark" size={16} color={TEXTO_SOBRE_CATEGORIA} />
                ) : (
                  <IconoCategoria icono={categoria.icono} color={categoria.color} tamano={22} />
                )}
                <Text
                  style={[estilos.chipTexto, { color: elegida ? TEXTO_SOBRE_CATEGORIA : colores.texto }]}
                >
                  {categoria.nombre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Acordeon>
    </View>
  );
}

// ── Piezas ──────────────────────────────────────────────────

function FilaInfo({ icono, titulo, texto }: { icono: IoniconsIconName; titulo: string; texto: string }) {
  const { colores } = useTema();
  return (
    <View style={estilos.filaInfo}>
      <Ionicons name={icono} size={20} color={colores.textoSuave} />
      <View style={estilos.flex}>
        <Text style={[estilos.subtitulo, { color: colores.texto }]}>{titulo}</Text>
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>{texto}</Text>
      </View>
    </View>
  );
}

type EstadoPermiso = 'consultando' | 'activado' | 'desactivado' | 'noDisponible';

// Si el teléfono bloqueó las notificaciones, ningún aviso llega:
// mejor decirlo acá y ofrecer Ajustes. Solo consulta, no pide permiso.
function PermisoNotificaciones() {
  const { colores, oscuro } = useTema();
  const [estado, setEstado] = useState<EstadoPermiso>('consultando');

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const Notifications = await cargarNotificaciones();
        if (!Notifications) {
          if (vivo) {
            setEstado('noDisponible');
          }
          return;
        }
        try {
          const permiso = await Notifications.getPermissionsAsync();
          if (vivo) {
            setEstado(permiso.granted ? 'activado' : 'desactivado');
          }
        } catch {
          if (vivo) {
            setEstado('noDisponible');
          }
        }
      })();
      return () => {
        vivo = false;
      };
    }, []),
  );

  if (estado === 'consultando') {
    return null;
  }

  if (estado === 'noDisponible') {
    // Expo Go en Android no carga expo-notifications (SDK 53+).
    return (
      <FilaInfo
        icono="phone-portrait-outline"
        titulo="Permiso del teléfono"
        texto="Las notificaciones funcionan en la app instalada (APK)."
      />
    );
  }

  // Toda la fila abre los ajustes del teléfono, donde se activan o bloquean.
  const activado = estado === 'activado';
  return (
    <Pressable
      onPress={() => void Linking.openSettings()}
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones del teléfono: ${activado ? 'activadas' : 'bloqueadas'}`}
      accessibilityHint="Abre los ajustes del teléfono para cambiarlo"
      style={({ pressed }) => [estilos.filaTocable, pressed && estilos.presionado]}
    >
      <Ionicons
        name={activado ? 'checkmark-circle-outline' : 'close-circle-outline'}
        size={20}
        color={activado ? colorAbierto(oscuro) : colores.peligro}
      />
      <View style={estilos.flex}>
        <Text style={[estilos.subtitulo, { color: colores.texto }]}>Notificaciones del teléfono</Text>
        <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>
          {activado ? 'Activadas: los avisos te van a llegar.' : 'Bloqueadas: no te va a llegar ningún aviso.'}
        </Text>
        <Text style={[estilos.enlaceTexto, { color: colores.primario }]}>
          {activado ? 'Cambiar en los ajustes del teléfono' : 'Activar en los ajustes del teléfono'}
        </Text>
      </View>
      <Ionicons name="open-outline" size={18} color={colores.textoSuave} />
    </Pressable>
  );
}

function Tarjeta({ children, fila = false }: { children: ReactNode; fila?: boolean }) {
  const { colores } = useTema();
  return (
    <View
      style={[
        estilos.tarjeta,
        fila && estilos.tarjetaFila,
        { backgroundColor: colores.fondoElevado, borderColor: colores.borde },
      ]}
    >
      {children}
    </View>
  );
}

function Dato({
  valor,
  texto,
  ayuda,
  onPress,
}: {
  valor: number | undefined;
  texto: string;
  ayuda: string;
  onPress: () => void;
}) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${valor ?? 0} ${texto}`}
      accessibilityHint={ayuda}
      style={({ pressed }) => [estilos.dato, pressed && estilos.presionado]}
    >
      <Text style={[estilos.datoValor, { color: colores.texto }]}>{valor ?? '–'}</Text>
      <Text style={[estilos.datoTexto, { color: colores.textoSuave }]}>{texto}</Text>
    </Pressable>
  );
}

function Acordeon({
  icono,
  titulo,
  subtitulo,
  abierto,
  onAlternar,
  children,
}: {
  icono: IoniconsIconName;
  titulo: string;
  subtitulo: string;
  abierto: boolean;
  onAlternar: () => void;
  children: ReactNode;
}) {
  const { colores } = useTema();
  return (
    <View style={[estilos.acordeon, { backgroundColor: colores.fondoElevado, borderColor: colores.borde }]}>
      <Pressable
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${titulo}. ${subtitulo}`}
        style={({ pressed }) => [estilos.acordeonCabecera, pressed && estilos.presionado]}
      >
        <Ionicons name={icono} size={22} color={colores.primario} />
        <View style={estilos.flex}>
          <Text style={[estilos.subtitulo, { color: colores.texto }]}>{titulo}</Text>
          <Text style={[estilos.ayuda, { color: colores.textoSuave }]}>{subtitulo}</Text>
        </View>
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={20} color={colores.textoSuave} />
      </Pressable>
      {abierto ? (
        <View style={[estilos.acordeonCuerpo, { borderTopColor: colores.borde }]}>{children}</View>
      ) : null}
    </View>
  );
}

function SelectorTema() {
  const { preferencias, guardar } = usePreferencias();
  return (
    <Segmentado
      opciones={OPCIONES_TEMA.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto }))}
      valor={preferencias.tema}
      onCambiar={(tema) => void guardar({ tema })}
    />
  );
}

// Opciones pegadas. Con letra grande bajan de renglón.
function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiqueta?: (texto: string) => string;
}) {
  const { colores } = useTema();
  return (
    <View style={[estilos.segmentado, { backgroundColor: colores.fondo, borderColor: colores.borde }]}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={String(opcion.valor)}
            onPress={() => onCambiar(opcion.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={etiqueta ? etiqueta(opcion.texto) : opcion.texto}
            style={[
              estilos.segmento,
              elegida && { backgroundColor: colores.primario },
            ]}
          >
            <Text
              style={[
                estilos.segmentoTexto,
                { color: elegida ? colores.textoSobrePrimario : colores.texto },
              ]}
            >
              {opcion.texto}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  contenido: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  encabezado: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  encabezadoAntetitulo: {
    // Semi-negrita para leerse sobre el encabezado.
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '600',
  },
  encabezadoTitulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  iconoGrande: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCentrado: {
    textAlign: 'center',
  },
  tarjeta: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  tarjetaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  botones: {
    gap: 10,
    marginTop: 4,
  },
  bloque: {
    gap: 10,
  },
  bloqueChico: {
    gap: 8,
  },
  rotulo: {
    fontSize: tipografia.cuerpo - 4,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  beneficio: {
    // Dos por fila; con letra grande igual entran porque el texto baja.
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  beneficioTexto: {
    flex: 1,
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  franjaLibre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  franjaTexto: {
    flex: 1,
    fontSize: tipografia.cuerpo - 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontSize: tipografia.titulo,
    fontWeight: '800',
  },
  perfilTextos: {
    flex: 1,
    gap: 2,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  estadoTexto: {
    flex: 1,
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '600',
  },
  resumen: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dato: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  datoValor: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  datoTexto: {
    fontSize: tipografia.cuerpo - 3,
    textAlign: 'center',
  },
  separador: {
    width: 1,
    marginVertical: 14,
  },
  acordeon: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  acordeonCabecera: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  acordeonCuerpo: {
    borderTopWidth: 1,
    padding: 16,
    gap: 14,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  apagado: {
    opacity: 0.5,
  },
  divisor: {
    height: 1,
  },
  filaInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  filaTocable: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enlaceTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
    marginTop: 2,
  },
  cajaInfo: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  filaIconoTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cajaInfoTitulo: {
    flex: 1,
    fontSize: tipografia.cuerpo - 3,
    fontWeight: '700',
  },
  segmentado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmento: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentoTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipTexto: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '700',
  },
  cerrarSesion: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: BORDE_BOTON,
  },
  cerrarSesionTexto: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  nota: {
    fontSize: tipografia.cuerpo - 3,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  presionado: {
    opacity: 0.6,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  subtitulo: {
    fontSize: tipografia.cuerpo,
    fontWeight: '700',
  },
  detalle: {
    fontSize: tipografia.cuerpo,
  },
  ayuda: {
    fontSize: tipografia.cuerpo - 2,
  },
});
