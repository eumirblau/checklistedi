// Configuración de Firebase
// Generado automáticamente desde google-services.json
// Fecha: 2025-07-06T18:59:36.374Z
export const firebaseConfig = {
  apiKey: "AIzaSyDufCoO06U4YaPeX-8zFRBUFxwlGCs_06I",
  authDomain: "checklistedhinor.firebaseapp.com",
  projectId: "checklistedhinor",
  storageBucket: "checklistedhinor.firebasestorage.app",
  messagingSenderId: "972633539581",
  appId: "1:972633539581:android:1971e7f9cd4930c807cf94",
};

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
