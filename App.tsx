import React from 'react';
import { LogBox } from 'react-native';
import AppReal from './AppReal';

// Comentado React Native Firebase para usar Firebase Web con Expo Go
// import '@react-native-firebase/app';

// Silenciar warnings 
LogBox.ignoreLogs([
  'This method is deprecated',
  'React Native Firebase namespaced API',
  'Please use `getApp()` instead',
  'Setting a timer',
  'Expo Go'
]);

export default function App() {
  console.log('🚀 App iniciando con Firebase Web para Expo Go...');
  return <AppReal />;
}
