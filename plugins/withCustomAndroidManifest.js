const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

const withCustomAndroidManifest = (config) => {
  // Primero configuramos gradle.properties para AndroidX
  config = withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.useAndroidX',
      value: 'true'
    });
    config.modResults.push({
      type: 'property', 
      key: 'android.enableJetifier',
      value: 'true'
    });
    config.modResults.push({
      type: 'property',
      key: 'android.suppressUnsupportedCompileSdk',
      value: '35'
    });
    return config;
  });

  // Luego modificamos el AndroidManifest
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Agregar tools namespace si no existe
    if (!androidManifest.manifest.$) {
      androidManifest.manifest.$ = {};
    }
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    
    // Resolver conflictos de AndroidX vs Support Library
    if (androidManifest.manifest.application) {
      const application = androidManifest.manifest.application[0];
      
      // Remover appComponentFactory para evitar conflictos AndroidX vs Support Library
      if (!application.$) {
        application.$ = {};
      }
      application.$['tools:remove'] = 'android:appComponentFactory';
      
      // Limpiar duplicados de intent-filters si existen
      if (application.activity) {
        application.activity.forEach(activity => {
          if (activity['intent-filter']) {
            // Remover intent-filters duplicados
            const seen = new Set();
            activity['intent-filter'] = activity['intent-filter'].filter(filter => {
              const key = JSON.stringify(filter);
              if (seen.has(key)) {
                return false;
              }
              seen.add(key);
              return true;
            });
          }
        });
      }
    }
    
    return config;
  });
};

module.exports = withCustomAndroidManifest;
