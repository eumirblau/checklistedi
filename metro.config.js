const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración específica para resolver problemas de bundling en EAS
config.resolver.assetExts.push('cjs');

// Optimizaciones para EAS Build
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Resolver problemas de memoria
config.transformer.asyncRequireModulePath = require.resolve(
  'metro-runtime/src/modules/asyncRequire',
);

module.exports = config;
