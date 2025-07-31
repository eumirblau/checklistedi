// Configuración de Firebase
// Generado automáticamente desde google-services.json
// Fecha: 2025-07-06T18:59:36.374Z
export const firebaseConfig = {
apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,

// Alias para compatibilidad
export const FIREBASE_CONFIG = firebaseConfig;

// Configuración de Storage
export const STORAGE_CONFIG = {
  uploadTimeout: 60000, // 60 segundos
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
};

// Debug logs
export const enableDebugLogs = true;

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Inicializa Firebase solo una vez
const app = initializeApp(firebaseConfig);

// Exporta el storage para usarlo en tu app
export const storage = getStorage(app);

export default firebaseConfig;
