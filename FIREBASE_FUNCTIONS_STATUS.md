# Estado de Firebase Cloud Functions

## ✅ Funciones disponibles:

### uploadPhotoBase64
- **URL**: `https://us-central1-checklistedhinor.cloudfunctions.net/uploadPhotoBase64`
- **Estado**: ✅ Funcionando
- **Uso**: Subir fotos en formato Base64 a Firebase Storage
- **Parámetros**:
  ```json
  {
    "base64": "string",
    "fileName": "string", 
    "folder": "string"
  }
  ```

### listphotosinfolder  
- **URL**: `https://us-central1-checklistedhinor.cloudfunctions.net/listphotosinfolder`
- **Estado**: ⚠️ Existe pero da error interno
- **Uso**: Listar fotos de una carpeta en Firebase Storage
- **Parámetros**:
  ```json
  {
    "folder": "string"
  }
  ```

## ❌ Funciones faltantes:

### deletePhotoFromFirebase
- **URL**: `https://us-central1-checklistedhinor.cloudfunctions.net/deletePhotoFromFirebase`
- **Estado**: ❌ No existe (404)
- **Uso**: Eliminar fotos de Firebase Storage
- **Parámetros esperados**:
  ```json
  {
    "filePath": "string"
  }
  ```

## 🛠️ Soluciones implementadas:

1. **Eliminación de fotos**: Temporalmente deshabilitada con mensaje informativo
2. **Listado de fotos**: Manejo de errores mejorado
3. **Subida de fotos**: Funcionando correctamente

## 📋 Pendiente:

1. Implementar la Cloud Function `deletePhotoFromFirebase`
2. Corregir errores en `listphotosinfolder`
3. Reactivar funcionalidad de eliminación una vez disponibles las funciones
