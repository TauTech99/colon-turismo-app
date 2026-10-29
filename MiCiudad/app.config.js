// Config dinámica: la key de Google Maps no va en el repo.
// En Expo Go no hace falta (Expo trae la suya). En APK / tienda:
//   GOOGLE_MAPS_KEY=... en .env o secret de EAS.
const appJson = require('./app.json');

module.exports = () => {
  const expo = { ...appJson.expo };
  const key = process.env.GOOGLE_MAPS_KEY;

  const plugins = (expo.plugins ?? []).map((plugin) => {
    if (plugin === 'react-native-maps' || (Array.isArray(plugin) && plugin[0] === 'react-native-maps')) {
      if (key) {
        return ['react-native-maps', { androidGoogleMapsApiKey: key }];
      }
      // Sin key: Expo Go no necesita nada. El APK sin key puede quedar
      // sin teselas (logo Google); no se hardcodea una clave falsa.
      return 'react-native-maps';
    }
    return plugin;
  });

  return {
    expo: {
      ...expo,
      plugins,
    },
  };
};
