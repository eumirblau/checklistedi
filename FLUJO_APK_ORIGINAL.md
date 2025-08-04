# Flujo de Guardado del APK Original

## Análisis del archivo descompilado: `index.android.bundle`

### 1. Estructura de Items del Checklist

```javascript
// Estructura básica de un item
{
  id: string,
  unidad: string,
  descripcion: string, 
  observaciones: string,
  completado: boolean,
  fechaCompletado: string // ISO string cuando se completa
}
```

### 2. Función guardarChecks (MÉTODO PRINCIPAL)

**Parámetros exactos encontrados en el APK:**
```javascript
guardarChecks(spreadsheetId, instalacionNombre, items, usuario.nombre, usuario.cargo, obraNombre)
```

**Implementación del APK:**
- Se llama cuando el usuario presiona "Guardar Checklist"
- Envía TODOS los items con su estado actual
- Incluye observaciones formateadas con timestamp
- Actualiza fechaCompletado para items completados

### 3. Manejo de Observaciones

**Formato encontrado en el APK:**
```javascript
// Al agregar una nueva observación:
const newObservation = `[${new Date().toLocaleString()}] ${usuario.nombre}: ${textoObservacion}`;

// Si ya hay observaciones anteriores:
const updatedObservations = existingObservations 
  ? `${existingObservations}\n${newObservation}`
  : newObservation;
```

**Patrón de guardado:**
1. Usuario agrega observación → se actualiza estado local
2. Usuario presiona "Guardar Checklist" → se envía todo a Google Sheets
3. Después del guardado exitoso → se recargan datos desde Google Sheets

### 4. Toggle de Items Completados

**Implementación del APK:**
```javascript
const toggleItem = (itemId) => {
  setItems(prevItems =>
    prevItems.map(item =>
      item.id === itemId 
        ? { 
            ...item, 
            completado: !item.completado,
            fechaCompletado: item.completado ? '' : new Date().toISOString()
          }
        : item
    )
  );
};
```

### 5. Flujo Completo de Guardado

1. **Modificación local**: Usuario marca items o agrega observaciones
2. **Estado en memoria**: Cambios se guardan solo en el estado local de React
3. **Guardado manual**: Usuario presiona "Guardar Checklist" 
4. **Envío a API**: Se llama `guardarChecks` con todos los datos
5. **Recarga de datos**: Después del guardado exitoso, se recargan datos desde Google Sheets
6. **Sincronización**: Los datos locales se actualizan con la respuesta del servidor

### 6. Manejo de Errores

**Patrón del APK:**
- Si falla el guardado → mostrar alert de error
- Si falla la carga → mostrar alert con opción "Reintentar"
- Mantener datos locales hasta confirmación del servidor

### 7. API Endpoints Identificados

**Cargar datos:**
```javascript
await ApiService.getItemsDeChecklist(spreadsheetId, instalacionNombre);
```

**Guardar datos:**
```javascript
await ApiService.guardarChecks(
  spreadsheetId,
  instalacionNombre, 
  items,
  usuario.nombre,
  usuario.cargo,
  obraNombre
);
```

### 8. Puntos Clave para Implementación

1. **Las observaciones NO se guardan inmediatamente** - solo al hacer "Guardar Checklist"
2. **Siempre recargar datos después de guardar** - para sincronizar con Google Sheets
3. **Usar fechaCompletado con .toISOString()** para items completados
4. **Formato específico para observaciones** con timestamp y nombre de usuario
5. **Enviar TODOS los items** en cada guardado, no solo los modificados

### 9. Estados de la Interfaz

**Estados necesarios:**
- `items`: Array de items del checklist
- `loading`: Cargando datos iniciales
- `saving`: Guardando datos
- `refreshing`: Refrescando datos (pull to refresh)

**Modales:**
- Modal de observaciones con historial y campo para nueva observación
- Manejo de texto seguro para evitar errores de renderizado

### 10. Persistencia de Datos

**IMPORTANTE**: El APK original NO persiste datos localmente entre sesiones.
- Todos los datos se cargan desde Google Sheets al abrir la pantalla
- Los cambios solo existen en memoria hasta que se guarden
- Después de guardar, se recargan datos para confirmar sincronización
