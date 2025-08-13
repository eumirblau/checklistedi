// Archivo principal de Cloud Functions para Firebase
// Solo debe contener código backend, no Expo/React Native
/**
 * Importaciones principales
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Buffer } = require('buffer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const logger = require("firebase-functions/logger");
const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
admin.initializeApp();

// Opciones globales para limitar instancias
setGlobalOptions({ maxInstances: 10 });

// =====================
// Funciones de Storage
// =====================

exports.uploadPhotoBase64 = functions.https.onRequest(async (req, res) => {
// ...existing code...
// =====================
// Funciones de Google Sheets
// =====================
  try {
    const { base64, fileName, folder } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    const buffer = Buffer.from(base64, 'base64');
    const bucket = admin.storage().bucket();
    const filePath = `${folder || 'uploads'}/${fileName}`;
    const file = bucket.file(filePath);
    await file.save(buffer, { 
      contentType: 'image/jpeg',
      public: true  // Hacer el archivo público
    });
    // En lugar de URL firmada, usar URL pública directa
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
    return res.json({ url });
  } catch (error) {
    console.error('Error en uploadPhotoBase64:', error);
    return res.status(500).json({ error: error.message });
  }
});

exports.getInstalacionesDeObra = functions.https.onRequest(async (req, res) => {
// ...existing code...
  res.set('Access-Control-Allow-Origin', '*');
  const { spreadsheetId: spreadsheetIdOriginal } = req.query;
  const spreadsheetId = MAPEO_NOMBRES_A_IDS[spreadsheetIdOriginal] || spreadsheetIdOriginal;
  if (!spreadsheetId) return res.status(400).json({ error: 'Falta spreadsheetId' });
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Intentar diferentes nombres de pestañas comunes para instalaciones
  const posiblesPestanas = ['Instalaciones', 'INSTALACIONES', 'Hoja1', 'Sheet1', 'instalaciones'];
  
  for (const pestana of posiblesPestanas) {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${pestana}!A2:A`,
      });
      
      // Si encontramos datos, devolvemos el resultado
      if (result.data.values && result.data.values.length > 0) {
        console.log(`✅ Instalaciones encontradas en pestaña: ${pestana}`);
        return res.json({ instalaciones: result.data.values });
      }
    } catch (error) {
      // Si falla con esta pestaña, intentar con la siguiente
      console.log(`❌ No se pudo acceder a pestaña ${pestana}:`, error.message);
      continue;
    }
  }
  
  // Si no encontramos instalaciones en ninguna pestaña, devolver vacío
  console.log('⚠️ No se encontraron instalaciones en ninguna pestaña conocida');
  res.json({ instalaciones: [] });
});

exports.getItemsDeChecklist = functions.https.onRequest(async (req, res) => {
// ...existing code...
  res.set('Access-Control-Allow-Origin', '*');
  const { spreadsheetId: spreadsheetIdOriginal, pestana } = req.query;
  const spreadsheetId = MAPEO_NOMBRES_A_IDS[spreadsheetIdOriginal] || spreadsheetIdOriginal;
  if (!spreadsheetId || !pestana) return res.status(400).json({ error: 'Faltan datos' });
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${pestana}!A2:Z`,
    });
    res.json({ items: result.data.values });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getPestanasDeObra = functions.https.onRequest(async (req, res) => {
// ...existing code...
  res.set('Access-Control-Allow-Origin', '*');
  const { spreadsheetId: spreadsheetIdOriginal } = req.query;
  const spreadsheetId = MAPEO_NOMBRES_A_IDS[spreadsheetIdOriginal] || spreadsheetIdOriginal;
  if (!spreadsheetId) return res.status(400).json({ error: 'Falta spreadsheetId' });
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    const pestanas = spreadsheet.data.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
      index: sheet.properties.index
    }));
    
    console.log(`✅ Pestañas obtenidas para ${spreadsheetId}:`, pestanas);
    res.json({ pestanas });
  } catch (error) {
    console.error('Error obteniendo pestañas:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.getJefesDeGrupo = functions.https.onRequest((req, res) => {
// ...existing code...
  res.set('Access-Control-Allow-Origin', '*');
  const spreadsheetId = MAPEO_NOMBRES_A_IDS['JEFES DE GRUPO'] || '1UUU7rq-mjx4GxoE_tR7F8tGSyue0EyC0WimZ70UfitQ';
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  // Buscar la pestaña correcta dinámicamente
  const posiblesPestanas = ['Jefes de grupo', 'JEFES DE GRUPO', 'Hoja1', 'Sheet1', 'jefes', 'Jefes'];
  (async () => {
    for (const pestana of posiblesPestanas) {
      try {
        const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${pestana}!A1:A`,
        });
        if (result.data.values && result.data.values.length > 0) {
          console.log(`✅ Jefes encontrados en pestaña: ${pestana}`);
          return res.json({ jefes: result.data.values });
        }
      } catch (error) {
        console.log(`❌ No se pudo acceder a pestaña ${pestana}:`, error.message);
        continue;
      }
    }
    // Si no se encuentra nada, devolver vacío
    console.log('⚠️ No se encontraron jefes en ninguna pestaña conocida');
    res.json({ jefes: [] });
  })();
});

exports.getObrasPorJefe = functions.https.onRequest((req, res) => {
// ...existing code...
  res.set('Access-Control-Allow-Origin', '*');
  const { jefe } = req.query;
  if (!jefe) return res.status(400).json({ error: 'Falta jefe' });
  const hojaMaestraId = '1UUU7rq-mjx4GxoE_tR7F8tGSyue0EyC0WimZ70UfitQ';
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: hojaMaestraId,
    range: "Hoja1!A2:D",
  }).then(result => {
    // Filtrar obras por jefe y devolver nombre de obra (columna C) y su ID/URL (columna D)
    const obras = (result.data.values || [])
      .filter(row => row[0] === jefe)
      .map(row => ({ nombreObra: row[2], idObra: row[3] }));
    res.json({ obras });
  }).catch(error => {
    res.status(500).json({ error: error.message });
  });
});

// =====================
// Función para eliminar fotos de Firebase Storage
// =====================
exports.deletePhotoFromFirebase = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Falta filePath' });
    }

    console.log('🗑️ [deletePhotoFromFirebase] Intentando eliminar:', filePath);

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    // Verificar si el archivo existe antes de intentar eliminarlo
    const [exists] = await file.exists();
    if (!exists) {
      console.log('❌ [deletePhotoFromFirebase] Archivo no encontrado:', filePath);
      
      // Listar archivos de la carpeta para debug
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      console.log('🔍 [deletePhotoFromFirebase] Listando contenido de carpeta:', folderPath);
      try {
        const [files] = await bucket.getFiles({ prefix: folderPath + '/' });
        console.log('📁 [deletePhotoFromFirebase] Archivos encontrados:', files.map(f => f.name));
      } catch (listError) {
        console.log('⚠️ [deletePhotoFromFirebase] Error listando carpeta:', listError.message);
      }
      
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    await file.delete();
    console.log('✅ [deletePhotoFromFirebase] Archivo eliminado correctamente:', filePath);
    return res.json({ success: true, message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error en deletePhotoFromFirebase:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =====================
// Función para listar fotos en una carpeta de Firebase Storage
// =====================
/**
 * Cloud Function principal para galería de fotos
 * Debe aparecer como 'listphotosinfolder' en Firebase Console y usarse en el frontend
 */
exports.listphotosinfolder = functions.https.onRequest(async (req, res) => {
  try {
    const { folder } = req.body;
    if (!folder) return res.status(400).json({ error: 'Falta folder' });

    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: folder + '/' });
    const photos = files.map(file => {
      // Usar URL pública directa en lugar de URL firmada
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
      return {
        fileName: file.name.split('/').pop(),
        url,
        uploadedAt: file.metadata.timeCreated
      };
    });

    res.json({ photos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Utilidades y constantes
// =====================
const keyFilePath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(keyFilePath)) {
  console.error('❌ El archivo NO existe en:', keyFilePath);
} else {
  console.log('✅ Archivo encontrado en:', keyFilePath);
}
const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Mapeo de nombres descriptivos a IDs reales de Google Sheets
const MAPEO_NOMBRES_A_IDS = {
  "Centro Los Mayores Los Almendros": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474",
  "San Blas pabellón": "1__5J8ykBjRvgFYW3d4i0vCyM6ukZ4Ax4Pf21N2Le7tw",
  "La Chulapona": "155MQ4WgQ-GNHu1mAyC4DWVtKXAyJLTrh2TfjAzq9Nh4",
  "Barajas pabellón": "1LsJA1rqefygrW1owLiAQjTNleENyvIMOzsn1iu6yBzw",
  "Azul": "1ICEl45f3I59Iz4JDTRHD17huoiyISBxCO9eRXWcPdyU",
  "Copia de Barajas pabellón": "1YWMpahk6CAtw1trGiKuLMlJRTL0JOy9x7rRkxrAaRn4",
  "Copia de San Blas pabellón": "15EYdKNe_GqHi918p8CVh3-RjCc-zEy8jrdWNdoX6Q1A",
  "Copia dneutra": "17OfTNY0OBiId27vCXqIa7p8nhmuvvk9Mh9C_WLGcnhA",
  "verde": "1U5zK1Ov9NWUA-C4HcHomGpYr44jpUOafs6v8sRsEl2E",
  "ObraID001M": "15UNDktnDzB_8lHkxx4QjKYRfABX4_M2wjCXx61Wh474",
  "ObraID002M": "1__5J8ykBjRvgFYW3d4i0vCyM6ukZ4Ax4Pf21N2Le7tw",
  "ObraID003M": "155MQ4WgQ-GNHu1mAyC4DWVtKXAyJLTrh2TfjAzq9Nh4",
  "ObraID004M": "1LsJA1rqefygrW1owLiAQjTNleENyvIMOzsn1iu6yBzw",
  "ObraID005M": "1ICEl45f3I59Iz4JDTRHD17huoiyISBxCO9eRXWcPdyU",
  "ObraID001J": "1YWMpahk6CAtw1trGiKuLMlJRTL0JOy9x7rRkxrAaRn4",
  "ObraID002J": "15EYdKNe_GqHi918p8CVh3-RjCc-zEy8jrdWNdoX6Q1A",
  "ObraID003J": "17OfTNY0OBiId27vCXqIa7p8nhmuvvk9Mh9C_WLGcnhA",
  "ObraID004J": "1U5zK1Ov9NWUA-C4HcHomGpYr44jpUOafs6v8sRsEl2E"
};

const COL_S_CONTRATO_CHECK = 11;
const COL_S_CONTRATO_CROSS = 12;
const COL_FECHAPP = 14;
const COL_OBSERVACIONES = 15;
const COL_USERAPP = 16;
const COL_CARGOAPP = 17;

function columnIndexToLetter(columnIndex) {
  let letter = '';
  let tempColumn = columnIndex;
  while (tempColumn >= 0) {
    letter = String.fromCharCode((tempColumn % 26) + 65) + letter;
    tempColumn = Math.floor(tempColumn / 26) - 1;
  }
  return letter;
}

// =====================
// Función para guardar checks
// =====================
exports.guardarChecks = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Método no permitido. Solo se acepta POST.');
    return;
  }
  const { spreadsheetId: spreadsheetIdOriginal, pestana, usuario, cargo, items } = req.body;
  const spreadsheetId = MAPEO_NOMBRES_A_IDS[spreadsheetIdOriginal] || spreadsheetIdOriginal;
  console.log(`Mapeo guardarChecks: "${spreadsheetIdOriginal}" -> "${spreadsheetId}"`);

  if (!spreadsheetId || !pestana || !usuario || !cargo || !Array.isArray(items)) {
    return res.status(400).send('Error: Faltan datos requeridos en el cuerpo de la solicitud (spreadsheetId, pestana, usuario, cargo, items).');
  }

  if (items.length === 0) {
    return res.status(200).json({ success: true, message: 'No hay ítems para actualizar.' });
  }
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const dataForBatchUpdate = [];
    for (const item of items) {
      if (typeof item.rowIndex !== 'number' || item.rowIndex <= 0) {
        console.warn('Ítem omitido: rowIndex inválido o faltante.', item);
        continue;
      }
      const rowIndex = item.rowIndex;
      // Log detallado de cada item que se va a guardar
      console.log(`[GUARDAR] rowIndex=${rowIndex}, unidad=${item.unidad}, descripcion=${item.descripcion}, observaciones="${item.observaciones}", s_contrato=${item.s_contrato}, fechapp=${item.fechapp}`);
      const hasCheckChange = item.s_contrato === '√' || item.s_contrato === 'X';
      const hasObservations = item.observaciones && item.observaciones.trim() !== '';
      const hasRealChanges = hasCheckChange || hasObservations;
      if (item.s_contrato === '√') {
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CHECK)}${rowIndex}`,
          values: [['√']],
        });
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CROSS)}${rowIndex}`,
          values: [['']],
        });
      } else if (item.s_contrato === 'X') {
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CHECK)}${rowIndex}`,
          values: [['']],
        });
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CROSS)}${rowIndex}`,
          values: [['X']],
        });
      } else {
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CHECK)}${rowIndex}`,
          values: [['']],
        });
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_S_CONTRATO_CROSS)}${rowIndex}`,
          values: [['']],
        });
      }
      dataForBatchUpdate.push({
        range: `${pestana}!${columnIndexToLetter(COL_FECHAPP)}${rowIndex}`,
        values: [[item.fechapp || '']],
      });
      dataForBatchUpdate.push({
        range: `${pestana}!${columnIndexToLetter(COL_OBSERVACIONES)}${rowIndex}`,
        values: [[item.observaciones || '']],
      });
      if (hasRealChanges) {
        console.log(`✅ Guardando usuario/cargo para fila ${rowIndex} (tiene cambios reales)`);
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_USERAPP)}${rowIndex}`,
          values: [[usuario]],
        });
        dataForBatchUpdate.push({
          range: `${pestana}!${columnIndexToLetter(COL_CARGOAPP)}${rowIndex}`,
          values: [[cargo]],
        });
      } else {
        console.log(`⏭️ Saltando usuario/cargo para fila ${rowIndex} (sin cambios reales)`);
      }
    }
    if (dataForBatchUpdate.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: dataForBatchUpdate,
        },
      });
      res.status(200).json({ success: true, message: `${items.length} ítem(s) procesado(s) y guardado(s) correctamente.` });
    } else {
      res.status(200).json({ success: true, message: 'No se generaron actualizaciones válidas para la hoja.' });
    }
  } catch (error) {
    console.error(`Error en guardarChecks para ${spreadsheetId}, pestaña ${pestana}:`, error);
    if (error.response && error.response.data && error.response.data.error) {
        console.error('Google API Error:', error.response.data.error);
        res.status(500).send(`Error de la API de Google: ${error.response.data.error.message || JSON.stringify(error.response.data.error)}`);
    } else {
        res.status(500).send(`Error interno al procesar la solicitud: ${error.message}`);
    }
  }
});
