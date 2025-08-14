# Implementación de Photo URL en Backend Firebase Functions

## Resumen
Para completar la funcionalidad de subir URLs de fotos a Google Sheets, necesitas implementar un nuevo endpoint en Firebase Functions.

## Endpoint Requerido
- **URL**: `https://us-central1-checklistedhinor.cloudfunctions.net/updatePhotoUrl`
- **Método**: POST
- **Content-Type**: application/json

## Estructura del Request Body
```json
{
  "spreadsheetId": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474",
  "sheetName": "BT",
  "itemId": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474-9-Aérea-ó-enterrada",
  "rowIndex": 11,
  "photoUrl": "https://firebasestorage.googleapis.com/v0/b/...",
  "timestamp": "2025-08-14T10:30:00.000Z"
}
```

## Funcionalidad del Endpoint
1. Recibir los datos del request
2. Conectar con Google Sheets API
3. Actualizar la celda en la **columna S (19)** de la fila correspondiente
4. Escribir la URL de la foto en esa celda
5. Devolver confirmación de éxito

## Ejemplo de Implementación (Firebase Functions)
```javascript
exports.updatePhotoUrl = functions.https.onRequest(async (req, res) => {
  try {
    const { spreadsheetId, sheetName, itemId, rowIndex, photoUrl } = req.body;
    
    // Configurar Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth: /* tu auth */ });
    
    // Actualizar celda en columna S (19)
    const range = `${sheetName}!S${rowIndex}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [[photoUrl]]
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Photo URL updated successfully',
      data: { spreadsheetId, sheetName, rowIndex, photoUrl }
    });
    
  } catch (error) {
    console.error('Error updating photo URL:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

## Estado Actual del Frontend
- ✅ Función `updatePhotoUrl` implementada en ApiService.ts
- ✅ Integración en GrupoChecklistScreen.tsx
- ✅ Extracción correcta de datos (spreadsheetId, sheetName, rowIndex)
- ✅ Logs detallados para debugging
- ⏳ **PENDIENTE**: Implementación del endpoint en Firebase Functions

## Datos que se están registrando
Cuando tomes una foto, verás en los logs del Metro/Expo todos los datos necesarios:
- spreadsheetId: ID de la hoja de Google Sheets
- sheetName: Nombre de la pestaña
- rowIndex: Número de fila donde actualizar
- photoUrl: URL de Firebase Storage
- columna: S (19) - donde se debe escribir la URL

## Una vez implementado el endpoint
Simplemente cambia esta línea en `ApiService.ts`:

```javascript
// De esto:
// return { success: true, message: 'Photo URL data logged successfully...' };

// A esto:
const response = await fetch(`${BASE_URL}/updatePhotoUrl`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
});
```

¡Todo el frontend ya está listo! Solo necesitas el endpoint del backend.
