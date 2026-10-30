// Dueño: A — Cuenta y plataforma
// Lista de favoritos offline (tabla SQLite de A).

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Boton } from '@/compartido/componentes/Boton';
import { EstadoCarga } from '@/compartido/componentes/EstadoCarga';
import { EstadoError } from '@/compartido/componentes/EstadoError';
import { EstadoVacio } from '@/compartido/componentes/EstadoVacio';
import { tipografia, useTema } from '@/compartido/tema';
import { useSesion } from '@/cuenta/SesionContext';
import { useFavoritos } from '@/cuenta/useFavoritos';
import { TarjetaLugar } from '@/lugares/componentes/TarjetaLugar';
import { leerCategorias, leerLugares } from '@/lugares/lugaresDb';
import type { Categoria } from '@/tipos/categoria';
import type { Favorito } from '@/tipos/favorito';
import type { Lugar } from '@/tipos/lugar';

function buscarCategoria(categorias: Categoria[], categoriaId: string): Categoria | null {
  return categorias.find((categoria) => categoria.id === categoriaId) ?? null;
}

// Solo LEE el catálogo ya guardado. No llama a useLugares /
// useCategorias: esos hooks vuelven a escribir y SQLite se enoja.
function ListaConLugares({ favoritos }: { favoritos: Favorito[] }) {
  const { colores } = useTema();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function leerCatalogo() {
      try {
        const todos = await leerLugares();
        const todas = await leerCategorias();
        if (cancelado) {
          return;
        }
        setLugares(todos);
        setCategorias(todas);
      } catch (error) {
        console.error('[favoritos] No se pudo leer el catálogo local', error);
      } finally {
        if (!cancelado) {
          setCargandoCatalogo(false);
        }
      }
    }

    void leerCatalogo();

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargandoCatalogo) {
    return <EstadoCarga mensaje="Cargando favoritos…" />;
  }

  const lugaresFavoritos = favoritos
    .map((favorito) => lugares.find((lugar) => lugar.id === favorito.lugarId))
    .filter((lugar): lugar is Lugar => lugar !== undefined);

  if (lugaresFavoritos.length === 0) {
    return (
      <EstadoVacio mensaje="Todavía no marcaste ningún lugar. Abrí un lugar y tocá la estrella." />
    );
  }

  return (
    <FlatList
      data={lugaresFavoritos}
      keyExtractor={(lugar) => lugar.id}
      style={[estilos.lista, { backgroundColor: colores.fondo }]}
      contentContainerStyle={estilos.contenido}
      renderItem={({ item }) => (
        <TarjetaLugar lugar={item} categoria={buscarCategoria(categorias, item.categoriaId)} />
      )}
    />
  );
}

export default function PantallaFavoritos() {
  const { colores } = useTema();
  const { usuario, token, cargando, cuentaDesbloqueada, exigirCuenta } = useSesion();
  const [pidiendo, setPidiendo] = useState(false);
  const autoPedido = useRef(false);
  const { favoritos, cargando: cargandoFavoritos, error, recargar, refrescarLocal } =
    useFavoritos();
  const refrescarLocalRef = useRef(refrescarLocal);
  const yaMostroLista = useRef(false);

  useEffect(() => {
    refrescarLocalRef.current = refrescarLocal;
  }, [refrescarLocal]);

  useEffect(() => {
    if (!token) {
      autoPedido.current = false;
    }
  }, [token]);

  // Igual que Yo: si hay token y no desbloqueó, huella o contraseña.
  // Sin cuenta: más abajo se pide el ingreso. El mapa no llama esto.
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

  // Al volver del detalle: la estrella ya escribió SQLite.
  // La primera vez no hace falta (el hook carga solo).
  useFocusEffect(
    useCallback(() => {
      if (!usuario || !cuentaDesbloqueada) {
        return;
      }
      if (!yaMostroLista.current) {
        yaMostroLista.current = true;
        return;
      }
      void refrescarLocalRef.current();
    }, [usuario, cuentaDesbloqueada]),
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
        <Text style={[estilos.titulo, { color: colores.texto }]}>Tu sesión está guardada</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Desbloqueá con huella, rostro o contraseña para ver tus favoritos.
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
        <Text style={[estilos.titulo, { color: colores.texto }]}>Ingresá para guardar favoritos</Text>
        <Text style={[estilos.detalle, { color: colores.textoSuave }]}>
          Mirar el mapa no pide cuenta. La cuenta es para guardar lugares.
        </Text>
        <Boton titulo="Ingresar" onPress={() => router.push('/login')} />
      </View>
    );
  }

  if (cargandoFavoritos) {
    return <EstadoCarga mensaje="Cargando favoritos…" />;
  }

  if (error && favoritos.length === 0) {
    return <EstadoError mensaje={error} onReintentar={() => void recargar()} />;
  }

  return <ListaConLugares favoritos={favoritos} />;
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
  },
  contenido: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
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
