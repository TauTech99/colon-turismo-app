// Dueño: A — Cuenta y plataforma
// Tab bar: Mapa · Agenda · Mi recorrido · Yo.

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router';
import { Text, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { crearOpcionesEncabezado, tipografia, useTema } from '@/compartido/tema';

const TAMANO_ETIQUETA = tipografia.cuerpo - 3;
// Decisión del equipo: las palabras de la barra crecen como mucho 1.2 veces
// (el ícono ayuda y el lector de pantalla dice el nombre). Así "Recorrido"
// entra entera en un teléfono de 360 de ancho. El resto de la app sigue la
// letra del teléfono sin tope.
const MAXIMO_AGRANDADO_ETIQUETA = 1.2;

function EtiquetaPestana({ color, texto }: { color: ColorValue; texto: string }) {
  return (
    // Todo el ancho de la pestaña, no solo el de la palabra: Android dibuja
    // la negrita un poco más ancha de lo que mide y aparecía "Recorrid…".
    // Sin adjustsFontSizeToFit: por ese mismo error achicaba solo "Recorrido".
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={MAXIMO_AGRANDADO_ETIQUETA}
      style={{
        width: '100%',
        textAlign: 'center',
        color,
        fontSize: TAMANO_ETIQUETA,
        fontWeight: '700',
      }}
    >
      {texto}
    </Text>
  );
}

export default function LayoutPestanas() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // Espacio para los botones del sistema (atrás / inicio / recientes).
  const paddingTabInferior = Math.max(insets.bottom, 8);
  // La librería le da a la barra un alto fijo que no crece con la letra
  // del teléfono: lo calculamos. Cada pestaña de la librería tiene 5 de
  // margen arriba y abajo y un ícono de 28 de alto.
  const agrandado = Math.min(fontScale, MAXIMO_AGRANDADO_ETIQUETA);
  const altoEtiqueta = Math.ceil(TAMANO_ETIQUETA * agrandado * 1.4);
  const altoPestana = 5 + 28 + altoEtiqueta + 5;

  return (
    <Tabs
      screenOptions={{
        ...crearOpcionesEncabezado(colores),
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: {
          backgroundColor: colores.fondoBarra,
          borderTopColor: colores.borde,
          borderTopWidth: 1,
          minHeight: 8 + altoPestana + paddingTabInferior,
          paddingBottom: paddingTabInferior,
          paddingTop: 8,
        },
        tabBarLabel: ({ color, children }) => <EtiquetaPestana color={color} texto={children} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          // El mapa ya tiene "Colón" + lupa: sin segundo título "Mapa".
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          // La pantalla dibuja su encabezado ("Qué hacer / Agenda").
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="recorrido"
        options={{
          title: 'Mi recorrido',
          // La pantalla dibuja su encabezado ("Mi historia / Mi recorrido").
          headerShown: false,
          // Etiqueta corta: con letra del sistema grande, "Mi recorrido"
          // se cortaba en la barra. El título de pantalla sigue completo.
          tabBarLabel: ({ color }) => <EtiquetaPestana color={color} texto="Recorrido" />,
          tabBarAccessibilityLabel: 'Mi recorrido',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="footsteps-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="yo"
        options={{
          title: 'Yo',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
