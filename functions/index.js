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

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    // Verificar si el archivo existe antes de intentar eliminarlo
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    await file.delete();
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
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { folder } = req.body;
    if (!folder) return res.status(400).json({ error: 'Falta folder' });

    console.log(`📂 [listphotosinfolder] Buscando fotos en: ${folder}`);

    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: folder + '/' });
    
    console.log(`📂 [listphotosinfolder] Archivos encontrados (raw): ${files.length}`);
    
    // Filtrar solo archivos de imagen y que no sean la carpeta misma
    const imageFiles = files.filter(file => {
      const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isNotFolder = !file.name.endsWith('/');
      const isInCorrectFolder = file.name.startsWith(folder + '/');
      
      if (!isImageFile || !isNotFolder || !isInCorrectFolder) {
        console.log(`📂 [listphotosinfolder] Archivo filtrado: ${file.name} (isImage: ${isImageFile}, notFolder: ${isNotFolder}, correctFolder: ${isInCorrectFolder})`);
      }
      
      return isImageFile && isNotFolder && isInCorrectFolder;
    });
    
    console.log(`📂 [listphotosinfolder] Archivos de imagen válidos: ${imageFiles.length}`);
    
    const photos = imageFiles.map(file => {
      // Usar URL pública directa en lugar de URL firmada
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
      const fileName = file.name.split('/').pop();
      
      console.log(`📂 [listphotosinfolder] Foto procesada: ${fileName} -> ${url}`);
      
      return {
        fileName,
        url,
        uploadedAt: file.metadata.timeCreated
      };
    });

    console.log(`📂 [listphotosinfolder] ✅ Retornando ${photos.length} fotos para folder: ${folder}`);
    res.json({ photos });
  } catch (error) {
    console.error(`❌ [listphotosinfolder] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Función para obtener URL de carpeta de fotos
// =====================
exports.getFolderUrl = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { jefeGrupo, obra, instalacion, itemId } = req.body;
    
    if (!jefeGrupo || !obra || !instalacion || !itemId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Normalizar nombres para carpetas (misma lógica que CloudPhotoService)
    const normalize = (str) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
    const jefeGrupoNorm = String(jefeGrupo).trim();
    const obraNorm = normalize(obra);
    const instalacionNorm = normalize(instalacion);
    
    // Construir el path de la carpeta
    const folderPath = `checklist-photos/${jefeGrupoNorm}/${obraNorm}/${instalacionNorm}/${itemId}`;
    
    // Generar URL de Firebase Console para la carpeta
    const bucketName = 'checklistedhinor.firebasestorage.app';
    const encodedFolderPath = encodeURIComponent(folderPath.replace(/\//g, '%2F'));
    const folderUrl = `https://console.firebase.google.com/project/checklistedhinor/storage/${bucketName}/files~2F${encodedFolderPath}`;
    
    console.log(`📂 [getFolderUrl] Carpeta: ${folderPath}`);
    console.log(`📂 [getFolderUrl] URL generada: ${folderUrl}`);
    
    res.json({ 
      folderPath,
      folderUrl,
      bucketName
    });
    
  } catch (error) {
    console.error(`❌ [getFolderUrl] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Renombrar foto
// =====================
exports.renamePhoto = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  
  try {
    const { oldFilePath, newFileName } = req.body;
    
    if (!oldFilePath || !newFileName) {
      res.status(400).json({ error: 'oldFilePath y newFileName son requeridos' });
      return;
    }
    
    console.log(`🔄 [renamePhoto] Iniciando renombrado:`);
    console.log(`📄 Archivo original: ${oldFilePath}`);
    console.log(`📝 Nuevo nombre: ${newFileName}`);
    
    const bucket = admin.storage().bucket();
    const oldFile = bucket.file(oldFilePath);
    
    // Verificar que el archivo existe
    const [exists] = await oldFile.exists();
    if (!exists) {
      res.status(404).json({ error: 'Archivo no encontrado' });
      return;
    }
    
    // Crear el nuevo path manteniendo la estructura de carpetas
    const pathParts = oldFilePath.split('/');
    pathParts[pathParts.length - 1] = newFileName; // Reemplazar solo el nombre del archivo
    const newFilePath = pathParts.join('/');
    
    console.log(`📂 Nuevo path: ${newFilePath}`);
    
    // Copiar archivo al nuevo nombre
    const newFile = bucket.file(newFilePath);
    await oldFile.copy(newFile);
    console.log(`✅ Archivo copiado exitosamente`);
    
    // Eliminar archivo original
    await oldFile.delete();
    console.log(`🗑️ Archivo original eliminado`);
    
    res.json({
      success: true,
      oldFilePath,
      newFilePath,
      message: 'Archivo renombrado exitosamente'
    });
    
  } catch (error) {
    console.error(`❌ [renamePhoto] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Galería web pública de fotos
// =====================
exports.photoGallery = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { jefe, obra, instalacion, item } = req.query;
    
    if (!jefe || !obra || !instalacion || !item) {
      return res.status(400).send('Faltan parámetros: jefe, obra, instalacion, item');
    }

    // Normalizar nombres para carpetas (misma lógica que CloudPhotoService) - v2.0.1
    const normalize = (str) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
    const jefeGrupoNorm = String(jefe).trim();
    const obraNorm = normalize(obra);
    const instalacionNorm = normalize(instalacion);
    
    // Construir el path de la carpeta
    const folderPath = `checklist-photos/${jefeGrupoNorm}/${obraNorm}/${instalacionNorm}/${item}`;
    
    console.log(`📷 [photoGallery] Mostrando galería para: ${folderPath}`);

    // Obtener las fotos de la carpeta
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: folderPath + '/' });
    
    // Filtrar solo archivos de imagen
    const imageFiles = files.filter(file => {
      const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isNotFolder = !file.name.endsWith('/');
      const isInCorrectFolder = file.name.startsWith(folderPath + '/');
      return isImageFile && isNotFolder && isInCorrectFolder;
    });
    
    // Generar URLs públicas para las fotos
    const photos = imageFiles.map(file => {
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
      const fileName = file.name.split('/').pop();
      return { fileName, url, fullPath: file.name };
    });

    console.log(`📷 [photoGallery] ${photos.length} fotos encontradas`);

    // Generar HTML de la galería
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galería de Fotos - ${item}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .header-logo {
            position: absolute;
            top: 20px;
            left: 30px;
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .header-logo img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 50%;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .info {
            background: #f8f9fa;
            padding: 20px 30px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #2c3e50;
            font-size: 1.1em;
        }
        
        .gallery {
            padding: 30px;
        }
        
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .photo-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
        }
        
        .photo-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .photo-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .photo-card:hover img {
            transform: scale(1.05);
        }
        
        .photo-info {
            padding: 20px;
        }
        
        .photo-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .photo-date {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .no-photos {
            text-align: center;
            padding: 60px 30px;
            color: #6c757d;
        }
        
        .no-photos-icon {
            font-size: 4em;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
            animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
            position: relative;
            margin: 5% auto;
            max-width: 90%;
            max-height: 90%;
        }
        
        .modal img {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }
        
        .close {
            position: absolute;
            top: -40px;
            right: 0;
            color: white;
            font-size: 30px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0,0,0,0.5);
            padding: 5px 15px;
            border-radius: 50%;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2em; }
            .gallery-grid { grid-template-columns: 1fr; }
            .info-grid { grid-template-columns: 1fr; }
            .header-logo {
                width: 60px;
                height: 60px;
                top: 15px;
                left: 15px;
            }
            .header-logo img {
                width: 45px;
                height: 45px;
            }
            .header {
                padding: 20px 20px 20px 90px;
                text-align: left;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">
                <img src="data:image/png;base64,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" alt="Edhinor Logo" />
            </div>
            <h1>📷 Galería de Fotos</h1>
            <div class="subtitle">${item}</div>
        </div>
        
        <div class="info">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">👨‍💼 Jefe de Grupo</div>
                    <div class="info-value">${jefe}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🏗️ Obra</div>
                    <div class="info-value">${obra}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">⚡ Instalación</div>
                    <div class="info-value">${instalacion}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📋 Elemento</div>
                    <div class="info-value">${item}</div>
                </div>
            </div>
        </div>
        
        <div class="gallery">
            ${photos.length > 0 ? `
                <div class="gallery-grid">
                    ${photos.map((photo, index) => `
                        <div class="photo-card" onclick="openModal('${photo.url}', '${photo.fileName}')">
                            <img src="${photo.url}" alt="${photo.fileName}" loading="lazy">
                            <div class="photo-info">
                                <div class="photo-name">${photo.fileName}</div>
                                <div class="photo-date">Foto ${index + 1} de ${photos.length}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="no-photos">
                    <div class="no-photos-icon">📸</div>
                    <h3>No hay fotos disponibles</h3>
                    <p>Aún no se han subido fotos para este elemento.</p>
                </div>
            `}
        </div>
    </div>
    
    <!-- Modal para vista ampliada -->
    <div id="photoModal" class="modal" onclick="closeModal()">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <img id="modalImage" src="" alt="">
        </div>
    </div>
    
    <script>
        function openModal(imageUrl, imageName) {
            const modal = document.getElementById('photoModal');
            const modalImg = document.getElementById('modalImage');
            modal.style.display = 'block';
            modalImg.src = imageUrl;
            modalImg.alt = imageName;
        }
        
        function closeModal() {
            document.getElementById('photoModal').style.display = 'none';
        }
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error(`❌ [photoGallery] Error:`, error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>Error al cargar la galería</h2>
          <p>${error.message}</p>
        </body>
      </html>
    `);
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

// Índices de columnas para Google Sheets
const COL_S_CONTRATO_CHECK = 11;
const COL_S_CONTRATO_CROSS = 12;
const COL_FECHAPP = 14;
const COL_OBSERVACIONES = 15;
const COL_USERAPP = 16;
const COL_CARGOAPP = 17;
const COL_URL_FOTOS = 18; // Columna S (19) para URLs de fotos

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
// Función para guardar checks (MODIFICADA PARA SOPORTAR FOTOS)
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
  
  const { 
    spreadsheetId: spreadsheetIdOriginal, 
    pestana, 
    usuario, 
    cargo, 
    items,
    // ✅ NUEVOS PARÁMETROS PARA FOTOS
    isPhotoUpdate,
    updatePhotoOnly,
    photoUrl,
    itemId
  } = req.body;
  
  const spreadsheetId = MAPEO_NOMBRES_A_IDS[spreadsheetIdOriginal] || spreadsheetIdOriginal;
  console.log(`Mapeo guardarChecks: "${spreadsheetIdOriginal}" -> "${spreadsheetId}"`);

  // ✅ DEBUG: LOGGING DE PARÁMETROS RECIBIDOS
  console.log(`🔍 [FOTO DEBUG] Parámetros recibidos:`);
  console.log(`🔍 [FOTO DEBUG] - isPhotoUpdate: ${isPhotoUpdate} (tipo: ${typeof isPhotoUpdate})`);
  console.log(`🔍 [FOTO DEBUG] - updatePhotoOnly: ${updatePhotoOnly} (tipo: ${typeof updatePhotoOnly})`);
  console.log(`🔍 [FOTO DEBUG] - photoUrl: ${photoUrl} (tipo: ${typeof photoUrl})`);
  console.log(`🔍 [FOTO DEBUG] - itemId: ${itemId} (tipo: ${typeof itemId})`);
  console.log(`🔍 [FOTO DEBUG] - items array length: ${Array.isArray(items) ? items.length : 'not array'}`);
  console.log(`🔍 [FOTO DEBUG] - Condición completa: ${isPhotoUpdate && updatePhotoOnly && photoUrl && itemId}`);

  // ✅ DETECTAR SI ES UNA ACTUALIZACIÓN DE FOTO (FORZAR SIEMPRE POR AHORA PARA DEBUG)
  if ((isPhotoUpdate && updatePhotoOnly && photoUrl && itemId) || (photoUrl && itemId)) {
    console.log(`🔥 [FOTO UPDATE] Actualizando URL de carpeta para item ${itemId}`);
    
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      
      // � GENERAR URL DE LA CARPETA en lugar de URL individual
      // Extraer información de la URL de la foto para construir la URL de la carpeta
      const urlParts = photoUrl.split('/');
      const encodedPath = urlParts.find(part => part.includes('checklist-photos'));
      
      if (encodedPath) {
        // Decodificar el path para obtener la estructura de carpetas
        const decodedPath = decodeURIComponent(encodedPath);
        // Extraer la carpeta padre (sin el nombre del archivo)
        const folderPath = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
        
        // ✅ EXTRAER PARÁMETROS DE LA CARPETA PARA LA GALERÍA WEB
        // folderPath formato: "checklist-photos/Monserrat/Centro_de_Mayores_Los_Almendros/BT/Tipo de aislamiento"
        const pathParts = folderPath.split('/');
        if (pathParts.length >= 5) {
          const jefeGrupo = pathParts[1];
          const obra = pathParts[2].replace(/_/g, ' ');
          const instalacion = pathParts[3];
          const item = pathParts[4];
          
          // ✅ CREAR URL DE GALERÍA WEB PÚBLICA
          const galleryUrl = `https://us-central1-checklistedhinor.cloudfunctions.net/photoGallery?jefe=${encodeURIComponent(jefeGrupo)}&obra=${encodeURIComponent(obra)}&instalacion=${encodeURIComponent(instalacion)}&item=${encodeURIComponent(item)}`;
          
          console.log(`🎨 [FOTO UPDATE] URL de galería web generada: ${galleryUrl}`);
          console.log(`📂 [FOTO UPDATE] Carpeta de fotos: ${folderPath}`);
          
          // Actualizar la columna S (URL_FOTOS) con la URL de la galería web
          const photoUpdateData = [{
            range: `${pestana}!${columnIndexToLetter(COL_URL_FOTOS)}${itemId}`,
            values: [[galleryUrl]],
          }];
          
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
              valueInputOption: 'USER_ENTERED',
              data: photoUpdateData,
            },
          });
          
          console.log(`✅ [FOTO UPDATE] URL de galería web actualizada correctamente en fila ${itemId}, columna S`);
          return res.status(200).json({ 
            success: true, 
            message: `URL de galería web de fotos actualizada correctamente para item ${itemId}`,
            photoUrl: galleryUrl,  // ✅ URL de galería web pública
            galleryUrl: galleryUrl,
            folderPath: folderPath
          });
        } else {
          console.error(`❌ [FOTO UPDATE] Estructura de carpeta inválida: ${folderPath}`);
          return res.status(400).json({ 
            error: `Estructura de carpeta inválida: ${folderPath}` 
          });
        }
      } else {
        console.error(`❌ [FOTO UPDATE] No se pudo extraer el path de la foto: ${photoUrl}`);
        return res.status(400).json({ 
          error: `No se pudo procesar la URL de la foto` 
        });
      }
      
    } catch (error) {
      console.error(`❌ [FOTO UPDATE] Error actualizando URL de carpeta:`, error);
      return res.status(500).json({ 
        error: `Error actualizando URL de carpeta: ${error.message}` 
      });
    }
  }

  // ✅ VALIDACIÓN NORMAL PARA GUARDADO ESTÁNDAR
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
