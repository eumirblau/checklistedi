# Implementación de Photo URL en Backend Firebase Functions

## ✅ OPCIÓN 1 ELEGIDA: Modificar endpoint guardarChecks existente

### Resumen
Modificar el endpoint existente `guardarChecks` para detectar cuando es una actualización de foto y actualizar solo la columna S (19).

### Estructura del Request que recibirás
```json
{
  "spreadsheetId": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474",
  "pestana": "BT",
  "items": [
    {
      "id": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474-9-Aérea-ó-enterrada",
      "rowIndex": 11,
      "photoUrl": "https://firebasestorage.googleapis.com/v0/b/...",
      "isPhotoUpdate": true
    }
  ],
  "usuario": "Sistema_Foto",
  "cargo": "Automatico",
  "isPhotoUpdate": true,
  "updatePhotoOnly": true
}
```

### Modificación del endpoint guardarChecks

Agrega esta lógica al **inicio** de tu función `guardarChecks`:

```javascript
exports.guardarChecks = functions.https.onRequest(async (req, res) => {
  try {
    const { spreadsheetId, pestana, items, usuario, cargo, isPhotoUpdate, updatePhotoOnly } = req.body;
    
    // 🆕 NUEVA LÓGICA: Detectar si es actualización de foto únicamente
    if (isPhotoUpdate && updatePhotoOnly && items.length === 1) {
      const photoItem = items[0];
      
      if (photoItem.isPhotoUpdate && photoItem.photoUrl && photoItem.rowIndex) {
        console.log(`[guardarChecks] Photo update detected for row ${photoItem.rowIndex}`);
        
        // Configurar Google Sheets API
        const sheets = google.sheets({ version: 'v4', auth: /* tu auth */ });
        
        // Actualizar solo la columna S (19) con la URL de la foto
        const range = `${pestana}!S${photoItem.rowIndex}`;
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: {
            values: [[photoItem.photoUrl]]
          }
        });
        
        console.log(`[guardarChecks] Photo URL updated successfully in ${range}`);
        
        return res.json({ 
          success: true, 
          message: 'Photo URL updated successfully',
          data: { 
            spreadsheetId, 
            pestana, 
            range, 
            photoUrl: photoItem.photoUrl 
          }
        });
      }
    }
    
    // 🔄 LÓGICA EXISTENTE: Continuar con el guardado normal de checks
    // ... tu código existente para guardar checks normales ...
    
  } catch (error) {
    console.error('Error in guardarChecks:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### ✅ Estado Actual del Frontend
- Función `updatePhotoUrl` implementada en ApiService.ts
- Integración en GrupoChecklistScreen.tsx 
- Envío via endpoint `guardarChecks` con flags especiales
- Logs detallados para debugging

### 🧪 Para probar
1. Implementa la modificación en tu endpoint `guardarChecks`
2. Toma una foto en la app
3. Verás en los logs del backend el request con `isPhotoUpdate: true`
4. La URL se escribirá en la columna S (19) de Google Sheets

### 📋 Checklist de implementación
- [ ] Agregar lógica de detección de `isPhotoUpdate` al inicio de `guardarChecks`
- [ ] Configurar Google Sheets API en el endpoint (si no está ya)
- [ ] Actualizar columna S con `sheets.spreadsheets.values.update`
- [ ] Probar con una foto real

### 🚀 Ventajas de esta implementación
- ✅ Usa infraestructura existente
- ✅ No requiere endpoint nuevo
- ✅ Mantiene compatibilidad con guardado normal
- ✅ Fácil de implementar

¡El frontend ya está completamente listo! Solo necesitas la modificación del backend.
