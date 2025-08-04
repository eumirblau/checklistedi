# ARQUITECTURA DE LA APLICACIÓN CHECKLIST EDHINOR

## 📱 RESUMEN EJECUTIVO
Aplicación React Native (Expo) para gestión de checklists de construcción con fotos en Firebase Storage y datos dinámicos desde Google Sheets via Cloud Functions.

## 🗂️ ESTRUCTURA DE ARCHIVOS PRINCIPAL

```
nuevoproyecto/
├── index.js                          # Punto de entrada → src/App.tsx
├── src/
│   ├── App.tsx                       # App principal → navigation/AppNavigator.tsx
│   ├── components/
│   │   └── PhotoButton.tsx           # ⭐ COMPONENTE FOTOS (modal, cámara, galería)
│   ├── screens/                      # 🚀 FLUJO DE NAVEGACIÓN PRINCIPAL
│   │   ├── LoginScreen.tsx           # 1️⃣ Login inicial
│   │   ├── JefesScreen.tsx           # 2️⃣ Selección de jefe de obra
│   │   ├── ObrasScreen.tsx           # 3️⃣ Selección de obra del jefe
│   │   ├── InstalacionesScreen.tsx   # 4️⃣ Selección de instalación
│   │   ├── ChecklistScreen.tsx       # 5️⃣ Grupos de checklist
│   │   └── GrupoChecklistScreen.tsx  # 6️⃣ Items individuales + PhotoButton
│   └── services/
│       ├── ApiService.ts             # 🌐 API Google Sheets (nuevo)
│       └── CloudPhotoService.ts      # 📸 Gestión fotos Firebase
├── navigation/
│   └── AppNavigator.tsx              # 🧭 React Navigation Stack
├── services/
│   └── ApiService.ts                 # 🌐 API Google Sheets (original, más completo)
├── types/
│   └── index.ts                      # 📝 TypeScript interfaces
└── functions/
    └── index.js                      # ☁️ Cloud Functions backend
```

## 🔄 FLUJO DE NAVEGACIÓN Y DATOS

### Arquitectura de Navegación
```
LoginScreen 
    ↓ (usuario)
JefesScreen 
    ↓ (jefeNombre + usuario)
ObrasScreen 
    ↓ (obraNombre + jefeNombre + usuario)
InstalacionesScreen 
    ↓ (instalacionNombre + obraNombre + jefeNombre + usuario)
ChecklistScreen 
    ↓ (grupo.encabezado + items + todos los parámetros)
GrupoChecklistScreen ← 🎯 AQUÍ SE USA PhotoButton
```

### Origen de Datos (TODO DINÁMICO)
- **Jefes**: `ApiService.getJefesDeGrupo()` → Google Sheets
- **Obras**: `ApiService.getObrasPorJefe(jefeNombre)` → Google Sheets  
- **Instalaciones**: Desde spreadsheet de la obra seleccionada
- **Checklist**: `ApiService.getItemsDeChecklist(obra, instalacion)` → Google Sheets
- **Fotos**: Firebase Storage via Cloud Functions

## 📸 SISTEMA DE FOTOS - PhotoButton.tsx

### Props que recibe PhotoButton:
```typescript
interface PhotoButtonProps {
  itemId: string;        // ID único del checklist (ej: "123")
  photos: PhotoMetadata[];
  onPhotoTaken: (uri: string) => void;
  onViewPhotos: () => void;
  onDeletePhoto?: (photo: PhotoMetadata) => void;
  maxPhotos: number;
  jefeGrupo: string;     // Nombre del jefe (ej: "montse")
  obra: string;          // Nombre de la obra (ej: "lola")
  instalacion: string;   // Instalación (ej: "CLIMA")
  fecha: string;
}
```

### Dónde se llama PhotoButton:
**Archivo**: `src/screens/GrupoChecklistScreen.tsx` (línea ~340)
```tsx
<PhotoButton
  itemId={item.id}                                    // ⚠️ AQUÍ ESTÁ EL PROBLEMA
  photos={itemPhotos[item.id] || []}
  onPhotoTaken={(url) => handlePhotoTaken(item.id, url)}
  onViewPhotos={() => handleViewPhotos(item.id)}
  onDeletePhoto={(photo) => handleDeletePhoto(item.id, photo)}
  maxPhotos={5}
  jefeGrupo={usuario?.nombre || usuario || 'sin-jefe'}
  obra={obraNombre || 'sin-obra'}
  instalacion={instalacionNombre || 'sin-instalacion'}
  fecha={new Date().toISOString().split('T')[0]}
/>
```

### Estructura de item (ChecklistItem):
```typescript
interface ChecklistItem {
  id: string;          // ID único (número como "123")
  unidad?: string;     // 🎯 NOMBRE REAL DEL CHECKLIST (ej: "falcoins")
  descripcion: string; // Descripción del item
  completado: boolean;
  observaciones?: string;
  // ... otros campos
}
```

## 🗂️ ESTRUCTURA DE CARPETAS FIREBASE (ACTUAL)

### Estructura Actual (PROBLEMÁTICA):
```
checklist-photos/
  └── jefeGrupo/          # ej: "montse"
      └── obra/           # ej: "lola"  
          └── instalacion/ # ej: "CLIMA"
              └── itemId/  # ❌ PROBLEMA: usa "123" en vez de "falcoins"
```

### Estructura Deseada:
```
checklist-photos/
  └── jefeGrupo/          # ej: "montse"
      └── obra/           # ej: "lola"
          └── instalacion/ # ej: "CLIMA"
              └── checklistName/ # ✅ SOLUCIÓN: usar "falcoins"
```

## 🔧 SERVICIOS PRINCIPALES

### CloudPhotoService.ts
```typescript
// 📍 Ubicación: src/services/CloudPhotoService.ts
class CloudPhotoService {
  // Sube foto a Firebase Storage
  static uploadPhoto(uri, itemId, options)
  
  // Lista fotos de una carpeta 
  static listPhotos(options)
  
  // Elimina foto
  static deletePhoto(photo)
}
```

### ApiService.ts (HAY 2 VERSIONES)
1. **services/ApiService.ts** - Original, más completo, con datos offline
2. **src/services/ApiService.ts** - Versión simplificada

```typescript
class ApiService {
  // Obtiene jefes desde Google Sheets
  getJefesDeGrupo(): Promise<JefeDeGrupo[]>
  
  // Obtiene obras de un jefe específico
  getObrasPorJefe(jefeNombre: string): Promise<Obra[]>
  
  // Obtiene items de checklist de una instalación
  getItemsDeChecklist(obra: string, instalacion: string): Promise<ChecklistItem[]>
}
```

## ☁️ BACKEND - Cloud Functions

### functions/index.js
```javascript
// Función para subir fotos
exports.uploadPhotoBase64 = functions.https.onRequest((req, res) => {
  // Recibe: base64, fileName, folder
  // Guarda en: Storage Firebase
});

// Función para listar fotos de carpeta
exports.listphotosinfolder = functions.https.onRequest((req, res) => {
  // Recibe: folder
  // Retorna: lista de fotos con metadata
});
```

## 🐛 PROBLEMA IDENTIFICADO

### El Issue:
- PhotoButton recibe `itemId` (número como "123")
- Pero necesitamos usar `item.unidad` (nombre como "falcoins") para la carpeta
- La galería Firebase no encuentra las fotos porque busca en carpeta incorrecta

### Datos Disponibles en GrupoChecklistScreen:
```typescript
// En el map de items tenemos acceso a:
items.map((item) => (
  // item.id → "123" (lo que se pasa actualmente)
  // item.unidad → "falcoins" (lo que necesitamos usar)
  // item.descripcion → "Descripción del checklist"
))
```

## 🎯 SOLUCIÓN PROPUESTA

### Cambios Necesarios:

1. **PhotoButton.tsx** - Agregar nueva prop:
```typescript
interface PhotoButtonProps {
  // ... props existentes
  checklistName?: string;  // 🆕 NUEVA PROP para nombre real
}
```

2. **GrupoChecklistScreen.tsx** - Pasar nombre real:
```tsx
<PhotoButton
  itemId={item.id}
  checklistName={item.unidad}  // 🆕 PASAR NOMBRE REAL
  // ... otras props
/>
```

3. **CloudPhotoService.ts** - Usar checklistName en folder:
```typescript
// En uploadPhoto y listPhotos:
const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${checklistName || itemId}`;
```

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Modificar PhotoButtonProps para incluir checklistName
- [ ] Actualizar GrupoChecklistScreen para pasar item.unidad
- [ ] Modificar CloudPhotoService.uploadPhoto para usar checklistName
- [ ] Modificar CloudPhotoService.listPhotos para usar checklistName  
- [ ] Probar subida de foto nueva
- [ ] Verificar que galería muestra fotos correctas
- [ ] Hacer commit con los cambios

## 🔍 COMANDOS ÚTILES PARA DEBUGGING

```bash
# Ver estructura de archivos
Get-ChildItem -Recurse src/

# Buscar código específico
grep -r "PhotoButton" src/

# Ver commits recientes  
git log --oneline -5

# Estado actual del repo
git status

# Ver cambios específicos
git diff HEAD~1
```

## 📱 FLUJO DE USUARIO TÍPICO

1. Usuario abre app → LoginScreen
2. Selecciona jefe → JefesScreen → ObrasScreen
3. Selecciona obra → InstalacionesScreen  
4. Selecciona instalación → ChecklistScreen
5. Ve grupos de checklist → selecciona grupo → GrupoChecklistScreen
6. Ve items individuales con PhotoButton
7. Presiona 📷 → puede tomar foto o ver galería Firebase
8. Galería debe mostrar fotos del checklist específico

## ⚠️ NOTAS IMPORTANTES

- **TODO ES DINÁMICO**: No hay datos hardcodeados, todo viene de Google Sheets
- **DOS ApiService**: Usar el de `services/ApiService.ts` (más completo)
- **Estructura Escalable**: La app puede manejar cualquier número de jefes/obras/instalaciones
- **Firebase Storage**: Las fotos se guardan con estructura jerárquica de carpetas
- **Cloud Functions**: Backend en Node.js para operaciones Firebase

---
**📅 Última actualización**: 4 de agosto de 2025
**🔄 Punto de restauración**: Commit `a535dc1`
