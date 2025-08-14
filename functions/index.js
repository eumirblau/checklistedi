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

    // Normalizar nombres para carpetas (misma lógica que CloudPhotoService)
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
                <img src="data:image/jpeg;base64,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" alt="Edhinor Logo" />
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
