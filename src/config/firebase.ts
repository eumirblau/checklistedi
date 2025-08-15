// Configuración de Firebase
// Generado automáticamente desde google-services.json
// Fecha: 2025-08-15T18:59:36.374Z - API Key renovada
export const firebaseConfig = {
  apiKey: "AIzaSyDREB_RGYvMCeNHL7t3CWfLo7402dsOOiE",
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

console.log('🔥 Firebase configurado para React Native Firebase - usando google-services.json');
