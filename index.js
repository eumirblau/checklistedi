import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Silenciar warnings de Firebase deprecated API globalmente
LogBox.ignoreLogs([
  'This method is deprecated',
  'React Native Firebase namespaced API',
  'Please use `getApp()` instead'
]);

registerRootComponent(App);
