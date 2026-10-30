// Dueño: D — Recorrido y audioguías
// Mi recorrido: timeline de visitas locales.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { EstadoVacio } from '@/compartido/componentes/EstadoVacio';
import {
  tipografia,
  useTema,
} from '@/compartido/tema';
import { useRed } from '@/compartido/useRed';
import { useSesion } from '@/cuenta/SesionContext';
import { leerCategorias, leerLugares } from '@/lugares/lugaresDb';
import { sincronizarPendientes } from '@/recorrido/colaVisitas';
import { AvisoSinSenal } from '@/recorrido/componentes/AvisoSinSenal';
import { TimelineVisitas } from '@/recorrido/componentes/TimelineVisitas';
import { useVisitas } from '@/recorrido/useVisitas';
import type { Categoria } from '@/tipos/categoria';

// Pestaña Mi recorrido. useVisitas escucha Query. SQLite sigue
// de copia. El ícono de pendientes usa sincronizada: false (cola del 24).
// No reescribe altas 21–23 ni la cola: solo consume lo guardado.

// La pestaña no tiene encabezado automático: lo dibuja la pantalla
// ("Mi historia / Mi recorrido"), igual que Mapa y Yo, en todos los estados.
export default function PantallaRecorrido() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();

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
        <Text style={[estilos.antetitulo, { color: colores.textoSobreEncabezado }]}>Mi historia</Text>
        <Text
          accessibilityRole="header"
          style={[estilos.tituloEncabezado, { color: colores.textoSobreEncabezado }]}
        >
          Mi recorrido
        </Text>
      </View>
      <View style={estilos.pantalla}>
        <ContenidoRecorrido />
      </View>
    </View>
  );
}

function ContenidoRecorrido() {
  const { colores } = useTema();
  const { usuario, token, cargando, cuentaDesbloqueada, exigirCuenta } = useSesion();
  const [pidiendo, setPidiendo] = useState(false);
  const autoPedido = useRef(false);

  const { visitas, cargando: cargandoLista, error, recargar } = useVisitas();
  const recargarRef = useRef(recargar);
  recargarRef.current = recargar;
  const [nombresPorLugarId, setNombresPorLugarId] = useState<Record<string, string>>({});
  const [categoriaPorLugarId, setCategoriaPorLugarId] = useState<Record<string, Categoria>>({});

  useEffect(() => {
    if (!token) {
      autoPedido.current = false;
    }
  }, [token]);

  // Igual que Favoritos / Yo: si hay token y no desbloqueó, huella.
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

  // Nombres y categorías salen del catálogo en SQLite. No son Query.
  useEffect(() => {
    let cancelado = false;
    void Promise.all([leerLugares(), leerCategorias()])
      .then(([lugares, categorias]) => {
        if (cancelado) {
          return;
        }
        const nombres: Record<string, string> = {};
        const categoriaPorLugar: Record<string, Categoria> = {};
        for (const lugar of lugares) {
          nombres[lugar.id] = lugar.nombre;
          const categoria = categorias.find((item) => item.id === lugar.categoriaId);
          if (categoria) {
            categoriaPorLugar[lugar.id] = categoria;
          }
        }
        setNombresPorLugarId(nombres);
        setCategoriaPorLugarId(categoriaPorLugar);
      })
      .catch((err) => {
        console.error('[recorrido] No se pudieron leer los lugares', err);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Al volver a la pestaña: Query pide de nuevo. Así, si la cola
  // marcó sincronizada: true, el ícono desaparece.
  // recargarRef: si recargar cambia de identidad, no se vuelve a pedir.
  useFocusEffect(
    useCallback(() => {
      if (!usuario || !cuentaDesbloqueada) {
        return;
      }
      void recargarRef.current();
    }, [usuario, cuentaDesbloqueada]),
  );

  // Si la red vuelve con la pestaña abierta, esperar a que la cola
  // termine y releer: así la nube de pendiente se va sola.
  const { online } = useRed();
  const estabaOnline = useRef(online);

  useEffect(() => {
    const volvioLaRed = online && !estabaOnline.current;
    estabaOnline.current = online;
    if (!volvioLaRed || !usuario || !cuentaDesbloqueada) {
      return;
    }
    let vivo = true;
    void sincronizarPendientes(usuario.id).then(() => {
      if (vivo) {
        void recargar();
      }
    });
    return () => {
      vivo = false;
    };
  }, [online, usuario, cuentaDesbloqueada, recargar]);

  if (cargando) {
    return <EstadoCarga mensaje="Leyendo la sesión…" />;
  }

  if (token && !cuentaDesbloqueada) {
    if (pidiendo) {
      return <EstadoCarga mensaje="Confirmá que sos vos…" />;
    }

    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>Tu sesión está guardada</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Desbloqueá con huella, rostro o contraseña para ver tu recorrido.
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

  if (!usuario) {
    return (
      <View style={[estilos.centrado, { backgroundColor: colores.fondo }]}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>Ingresá para ver tu recorrido</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Mirar el mapa no pide cuenta. La cuenta es para guardar visitas.
        </Text>
        <Boton titulo="Ingresar" onPress={() => router.push('/login')} />
      </View>
    );
  }

  if (cargandoLista && visitas.length === 0) {
    return <EstadoCarga mensaje="Cargando tu recorrido…" />;
  }

  if (error && visitas.length === 0) {
    return <EstadoError mensaje={error} onReintentar={() => void recargar()} />;
  }

  if (visitas.length === 0) {
    return (
      <EstadoVacio mensaje="Todavía no registraste ninguna visita. Abrí un lugar y tocá “Guardá este momento”." />
    );
  }

  // Para el aviso de señal: lo que todavía está solo en el teléfono.
  const pendientes = visitas.filter((visita) => !visita.sincronizada);
  const fotosSinSubir = pendientes.filter((visita) => visita.fotoUri !== null).length;
  const lugaresVisitados = new Set(visitas.map((visita) => visita.lugarId)).size;

  return (
    <TimelineVisitas
      visitas={visitas}
      nombresPorLugarId={nombresPorLugarId}
      categoriaPorLugarId={categoriaPorLugarId}
      onAbrirVisita={(visita) =>
        router.push({ pathname: '/visita/[id]', params: { id: visita.id } })
      }
      encabezado={
        <View style={estilos.encabezadoLista}>
          <AvisoSinSenal
            online={online}
            visitasSinSubir={pendientes.length}
            fotosSinSubir={fotosSinSubir}
          />
          {/* QR, Estoy acá o Manual + foto y nota. Todo anda sin señal. */}
          <Boton titulo="Registrar nueva visita" onPress={() => router.push('/visita/registrar')} />
          <Text style={[estilos.contador, { color: colores.textoSuave }]}>
            {lugaresVisitados} {lugaresVisitados === 1 ? 'lugar visitado' : 'lugares visitados'}
          </Text>
        </View>
      }
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  encabezado: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  antetitulo: {
    // Semi-negrita para leerse sobre el encabezado.
    fontSize: tipografia.cuerpo - 1,
    fontWeight: '600',
    marginBottom: 1,
  },
  tituloEncabezado: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
  },
  encabezadoLista: {
    gap: 12,
  },
  contador: {
    fontSize: tipografia.cuerpo - 2,
    fontWeight: '600',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  titulo: {
    fontSize: tipografia.titulo,
    fontWeight: '700',
    textAlign: 'center',
  },
  detalle: {
    fontSize: tipografia.cuerpo,
    textAlign: 'center',
  },
});
