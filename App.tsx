import React from 'react';
import { LogBox } from 'react-native';
import AppReal from './AppReal';

// Importar Firebase para asegurar inicialización
import '@react-native-firebase/app';

// Silenciar warnings de Firebase deprecated API
LogBox.ignoreLogs([
  'This method is deprecated',
  'React Native Firebase namespaced API',
  'Please use `getApp()` instead'
]);

export default function App() {
  console.log('App iniciando con navegación real...');
  return <AppReal />;
}
