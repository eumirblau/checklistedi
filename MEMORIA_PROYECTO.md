### Ejemplo de código: Subida de foto a Firebase Storage con Expo

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

export async function pickAndUploadPhoto() {
  // 1. Pedir permisos y abrir selector
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled) return;
  const uri = result.assets[0].uri;

  // 2. Leer archivo como blob
  const file = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const blob = new Blob([Uint8Array.from(atob(file), c => c.charCodeAt(0))], { type: 'image/jpeg' });

  // 3. Subir a Firebase Storage
  const storage = getStorage();
  const storageRef = ref(storage, `fotos/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  // ¡Listo!
}
```

---

### Testing y debugging en Expo
- Probar siempre en Expo Go antes de compilar para producción.
- Usar consola de Firebase para verificar que las fotos llegan correctamente.
- Si hay errores de permisos, revisar los permisos en `app.json` (cámara, almacenamiento).
- Si la subida falla, revisar la configuración de Firebase y las reglas de Storage.
- Para debugging avanzado, usar `console.log` y la consola de Expo.

---
## 🚚 MIGRACIÓN A EXPO Y SUBIDA DE FOTOS A FIREBASE

### Resumen de la migración
- Se migró el proyecto de React Native nativo a Expo para evitar problemas de dependencias nativas y facilitar la subida de fotos a Firebase usando solo JavaScript.
- Se eliminaron todos los módulos nativos, mocks y configuraciones específicas de Android/iOS.
- Se creó un nuevo proyecto Expo limpio y se copiaron únicamente los archivos de código fuente (`src/`), recursos (`assets/`), y configuraciones necesarias (`app.json`, `babel.config.js`, `tsconfig.json`, `index.js`).
- Se ajustó el `package.json` para mantener solo dependencias compatibles con Expo.
- Se documentó el proceso y los problemas encontrados (especialmente el error de Hermes JS Engine).

### Subida de fotos a Firebase (Expo + Firebase Web)
- Se utiliza `expo-image-picker` para seleccionar o tomar fotos.
- Se utiliza `expo-file-system` para leer el archivo local y obtener el blob.
- Se utiliza el SDK web de Firebase (`firebase/storage`) para subir el blob a Firebase Storage.
- No se requiere ningún código nativo ni dependencias adicionales.

#### Ejemplo de flujo para subir una foto:
1. El usuario pulsa el botón de foto (`PhotoButton.tsx`).
2. Se abre el selector de imágenes/cámara con `expo-image-picker`.
3. Se obtiene la URI local de la imagen.
4. Se lee el archivo como blob con `expo-file-system`.
5. Se sube el blob a Firebase Storage usando el SDK web.

### Recomendaciones para futuras migraciones
- Siempre limpiar dependencias nativas y referencias a Hermes al migrar a Expo.
- No copiar archivos de configuración nativa (`android/`, `ios/`, `metro.config.js`, `react-native.config.js`).
- Mantener la memoria del proyecto actualizada con cada cambio importante.
- Probar la subida de fotos en Expo Go antes de compilar para producción.
- Si se requiere soporte nativo en el futuro, considerar EAS Build de Expo.

---
# 📋 MEMORIA DEL PROYECTO - Estado Actual
## ⚠️ PROBLEMA: Hermes JS Engine en Expo

### Descripción del problema
Al migrar a Expo, aparece el error relacionado con Hermes JS Engine ("js engine hermes"), aunque el proyecto ya no usa código nativo ni configuración manual de Hermes.

### Causa
- Expo gestiona Hermes automáticamente. No se debe configurar manualmente en `app.json` ni instalar dependencias como `hermes-engine` o `react-native`.
- Si existen referencias a Hermes en `app.json` (por ejemplo, `"jsEngine": "hermes"`), o si hay dependencias nativas en `package.json`, Expo puede fallar.

### Solución recomendada
1. **Eliminar cualquier referencia a Hermes en `app.json`**
   - No debe existir la línea `"jsEngine": "hermes"`.
2. **Eliminar dependencias nativas en `package.json`**
   - No debe haber `react-native`, `hermes-engine`, `metro`, etc.
   - Solo deben estar las dependencias compatibles con Expo (ver ejemplo abajo).
3. **Borrar `node_modules` y `package-lock.json`**
   - Ejecutar en la raíz del proyecto:
     ```pwsh
     Remove-Item -Recurse -Force .\node_modules
     Remove-Item -Force .\package-lock.json
     ```
4. **Instalar dependencias correctas**
   - Ejecutar:
     ```pwsh
     npm install
     ```
5. **Arrancar Expo limpiando caché**
   - Ejecutar:
     ```pwsh
     npx expo start --clear
     ```

#### Ejemplo de `package.json` correcto para Expo:
```json
{
  "name": "nuevoproyecto",
  "version": "1.0.0",
  "main": "index.js",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "^53.0.20",
    "expo-image-picker": "^16.1.4",
    "expo-file-system": "^18.1.11",
    "expo-modules-core": "^2.5.0",
    "firebase": "^12.0.0",
    "@react-navigation/native": "^7.1.16",
    "@react-navigation/stack": "^7.4.4",
    "invariant": "^2.2.4",
    "react": "^19.1.1"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "typescript": "~5.8.3"
  }
}
```

---

## 🎯 **CONTEXTO ACTUAL**
- **Proyecto**: React Native 0.79.3 con cámara nativa funcionando
- **Commit de restauración**: `155bcc3` ("PUNTO DE RESTAURACIÓN: Cámara Nativa Funcionando")
- **Problema actual**: Emulador corrompido/offline, no conecta con Metro
- **Acción en curso**: Recreando emulador desde cero
- **Fecha**: 30 de julio de 2025

## 🔧 **CONFIGURACIÓN TÉCNICA ESTABLE**
```groovy
// android/app/build.gradle - CONFIGURACIÓN EXACTA DEL COMMIT
applicationId "com.eumirblau.checklistapp"
versionCode 15
versionName "1.0.15"
compileSdk 35
targetSdk 35
minSdk 24

// React Native Build Configuration
buildConfigField "boolean", "IS_NEW_ARCHITECTURE_ENABLED", "false"
buildConfigField "boolean", "IS_HERMES_ENABLED", "true"
buildConfigField "boolean", "DEBUG", "true"

// Dependencies principales
implementation("com.facebook.react:react-android:0.79.3")
implementation("com.facebook.react:hermes-android:0.79.3")
```

## 📁 **ESTRUCTURA DE ARCHIVOS CLAVE**
```
c:\RNI\
├── android/app/build.gradle ✅ (igual al commit 155bcc3)
├── src/components/PhotoButton.tsx ✅ (cámara nativa funcionando)
├── android/app/src/main/java/.../SimpleCameraModule.kt ✅ (módulo nativo)
├── android/app/google-services.json ❌ (ELIMINADO - causaba conflictos)
└── src/services/ ⚠️ (archivos Firebase no trackeados)
```

## 🚀 **COMANDOS DE RESTAURACIÓN RÁPIDA**
```bash
# 1. Navegar al proyecto
cd C:\RNI

# 2. Verificar commit actual
git log --oneline -5

# 3. Si necesitas volver al estado limpio:
git reset --hard 155bcc3

# 4. Limpiar proyecto completamente
cd android && ./gradlew clean
cd ..

# 5. Reinstalar dependencias
npm install

# 6. Iniciar Metro (puerto 8081)
npx react-native start

# 7. Compilar y ejecutar (con emulador nuevo)
npx react-native run-android
```

## 🔍 **DIAGNÓSTICO ANTES DEL CACHE CLEAR**
- ✅ **Compilación**: BUILD SUCCESSFUL in 5s
- ✅ **Build.gradle**: Idéntico al commit de restauración
- ❌ **Emulador**: Offline/corrompido (emulator-5554 offline)
- ⚠️ **Metro**: Necesita reinicio con --reset-cache
- 🧹 **Archivos limpios**: google-services.json eliminado

## 📱 **EMULADOR NUEVO - ESPECIFICACIONES RECOMENDADAS**
```
Nombre: Pixel_9_API_35 (o similar)
API Level: 35 (Android 15)
Target: Google APIs
ABI: x86_64
RAM: 4GB mínimo
Storage: 32GB
Hardware: Camera support enabled
```

## 🎯 **PRÓXIMOS PASOS POST-CACHE CLEAR**
1. **Recrear emulador** con especificaciones arriba
2. **Verificar ADB**: `adb devices` debe mostrar device online
3. **Probar compilación**: `npx react-native run-android`
4. **Verificar cámara nativa**: Botón de foto debe funcionar
5. **Si todo funciona**: Entonces reintegrar Firebase paso a paso

## 🔥 **PUNTOS CRÍTICOS A RECORDAR**
- **NO tocar build.gradle** hasta que funcione básico
- **NO agregar Firebase** hasta confirmar cámara nativa
- **Emulador ARM64** si x86_64 da problemas
- **Metro puerto 8081** debe estar libre
- **SimpleCameraModule** es el corazón del sistema

## 💾 **BACKUP RÁPIDO SI NECESITAS**
```bash
# Crear branch de respaldo
git checkout -b backup-pre-cache-clear
git add .
git commit -m "Backup antes de limpiar cache VS Code"
git checkout camera-nativa-funcionando
```

## 📊 **ESTADO DE ARCHIVOS NO TRACKEADOS**
```
Untracked files:
├── .npmrc
├── android/app/google-services.json (ELIMINADO)
├── android/dependencies.txt
├── react-native.json
├── src/AppMinimal.tsx
├── src/components/FirebaseDiagnosticButton.tsx
├── src/components/SimpleCameraButtonFixed.tsx
├── src/components/SimpleCameraTest.tsx
├── src/config/
├── src/services/CloudPhotoService.ts
├── src/services/FirebasePhotoService.ts
├── src/services/FirebaseStorageMock.ts
└── src/services/FirebaseStorageReal.ts
```

## 🎯 **OBJETIVO PRINCIPAL**
Volver al estado del commit `155bcc3` funcionando + emulador estable = ✅ Cámara nativa operativa

---
**MEMORIA CREADA**: Para recuperar contexto post-limpieza cache VS Code
**REPOSITORIO**: Checklistapp-.v01 (branch: camera-nativa-funcionando)
