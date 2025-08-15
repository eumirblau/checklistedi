// Configuración para React Native Firebase
// React Native Firebase usa automáticamente google-services.json
// Solo exportamos configuraciones auxiliares

// Configuración de Storage
export const STORAGE_CONFIG = {
  uploadTimeout: 60000, // 60 segundos
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
};

// Debug logs
export const enableDebugLogs = true;

console.log('🔥 Configuración de Firebase lista para React Native Firebase');
