# Plan de Implementación del Sistema de Fotos

## Estado Actual
- ✅ Cloud Function `uploadPhotoBase64` ya existe en `functions/index.js`
- ✅ `FirebasePhotoService` completo en `services/FirebasePhotoService.ts` 
- ✅ `PhotoButton` básico en `components/ui/PhotoButton.tsx`
- ✅ `CloudPhotoService` simple en `src/services/CloudPhotoService.ts`
- ⚠️ `GrupoChecklistScreen` tiene botón foto pero sin funcionalidad completa
- ❌ Conexión entre componentes incompleta

## Arquitectura del Sistema de Fotos

### Flujo Principal:
1. **Usuario toca botón "Foto"** → Abre cámara/galería
2. **Se toma/selecciona foto** → Se obtiene URI local
3. **Conversión a Base64** → Para envío a Cloud Function
4. **Upload a Google Cloud** → Via `uploadPhotoBase64` function
5. **Storage en Firebase** → La function sube a Firebase Storage
6. **URL de descarga** → Se retorna URL pública
7. **Guardar metadata** → Se asocia foto con item del checklist

### Componentes Clave:
- **PhotoButton**: Interfaz para tomar/ver fotos
- **FirebasePhotoService**: Manejo directo de Firebase Storage
- **CloudPhotoService**: Wrapper para Cloud Function
- **uploadPhotoBase64**: Cloud Function que hace el upload real

## Pasos de Implementación

### Paso 1: Actualizar PhotoButton
- [ ] Integrar con `CloudPhotoService` para upload
- [ ] Manejar conversión a Base64
- [ ] Mostrar progreso de upload
- [ ] Manejar errores de upload

### Paso 2: Implementar CloudPhotoService
- [ ] Método `uploadToCloud()` que llame a `uploadPhotoBase64`
- [ ] Convertir URI local a Base64
- [ ] Enviar a Cloud Function con folder específico
- [ ] Retornar metadata completa

### Paso 3: Integrar en GrupoChecklistScreen
- [ ] Reemplazar botón actual con `PhotoButton` component
- [ ] Manejar callback `onPhotoTaken`
- [ ] Almacenar fotos en estado local `itemPhotos`
- [ ] Sincronizar con backend al guardar checklist

### Paso 4: Persistencia de Fotos
- [ ] Agregar campo `fotos` a Google Sheets
- [ ] Modificar `guardarChecks` para incluir URLs de fotos
- [ ] Modificar `getItemsDeChecklist` para cargar fotos
- [ ] Manejar múltiples fotos por item

### Paso 5: Visualización de Fotos
- [ ] Modal/galería para ver fotos tomadas
- [ ] Opción para eliminar fotos
- [ ] Mostrar contador de fotos en cada item
- [ ] Thumbnail de preview

## Archivos a Modificar

### Principales:
1. `src/screens/GrupoChecklistScreen.tsx` - Integrar PhotoButton
2. `src/services/CloudPhotoService.ts` - Implementar upload
3. `components/ui/PhotoButton.tsx` - Completar funcionalidad
4. `services/ApiService.ts` - Agregar soporte para fotos

### Secundarios:
5. `src/types/index.ts` - Tipos para fotos
6. `functions/index.js` - Verificar uploadPhotoBase64

## Estructura de Datos

### PhotoMetadata:
```typescript
{
  id: string;           // ID único de la foto
  url: string;          // URL pública de Firebase
  path: string;         // Path en Firebase Storage
  uploadedAt: string;   // Timestamp ISO
  fileName: string;     // Nombre del archivo
  itemId: string;       // ID del item asociado
}
```

### ItemPhotos State:
```typescript
{
  [itemId: string]: PhotoMetadata[]
}
```

## Configuración Necesaria

### Firebase:
- ✅ Ya configurado en `src/config/firebase.ts`
- ✅ Storage rules ya configuradas
- ✅ Cloud Function deployada

### Permisos React Native:
- ✅ Camera permissions en PhotoButton
- ✅ Gallery permissions ya manejados

## Consideraciones Técnicas

### Límites:
- Max 3 fotos por item (configurable)
- Calidad 0.7 para reducir tamaño
- Formato JPEG únicamente

### Performance:
- Upload en background
- Cache local de thumbnails
- Lazy loading de imágenes

### Error Handling:
- Retry automático en fallos de red
- Fallback a storage local temporal
- Notificaciones de progreso

## Testing

### Casos a Probar:
1. Tomar foto con cámara
2. Seleccionar de galería
3. Upload exitoso
4. Upload con error de red
5. Múltiples fotos por item
6. Persistencia después de refresh
7. Eliminación de fotos

---

**Próximo paso**: Empezar por Paso 1 - Actualizar PhotoButton
