import * as FileSystem from 'expo-file-system';

// Tipo para metadatos de fotos compatible con PhotoButton y lógica actual
export type PhotoMetadata = {
  id: string;
  url: string;
  path: string;
  uploadedAt: string;
  fileName: string;
};

// Servicio para manejo de fotos en la nube usando uploadPhotoBase64
export class CloudPhotoService {
  // Método para eliminar foto en Firebase Storage usando Cloud Function
  static async deletePhotoFromFirebase(options: {
    jefeGrupo?: string;
    obra?: string;
    instalacion?: string;
    itemId: string;
    fecha?: string;
    fileName: string;
  }): Promise<boolean> {
    // Usar la misma normalización que en uploadPhoto para consistencia
    const normalize = (str?: string) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
    const jefeGrupo = options?.jefeGrupo ? String(options.jefeGrupo).trim() : 'sin-jefe';
    const obra = normalize(options?.obra);
    const instalacion = normalize(options?.instalacion);
    const itemId = options.itemId;
    
    // Carpeta: checklist-photos/jefeGrupo/obra/instalacion/itemId (SIN fecha, igual que uploadPhoto)
    const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${itemId}`;
    const filePath = `${folder}/${options.fileName}`;
    
    console.log('🗂️ [CloudPhotoService] Ruta construida para eliminar:', filePath);
    
    // Cloud Function para eliminar archivo
    const DELETE_FUNCTION_URL = 'https://us-central1-checklistedhinor.cloudfunctions.net/deletePhotoFromFirebase';
    try {
      const response = await fetch(DELETE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en deletePhoto: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('❌ [CloudPhotoService] Error eliminando foto:', error);
      return false;
    }
  }
  // Método para obtener la lista de fotos de una carpeta en Storage (galería)
  static async listPhotos(options: {
    jefeGrupo?: string;
    obra?: string;
    instalacion?: string;
    itemId: string;
    fecha?: string;
  }): Promise<PhotoMetadata[]> {
    // Normalizar nombres para carpetas legibles y sin espacios
    const normalize = (str?: string) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
    const jefeGrupo = options?.jefeGrupo ? String(options.jefeGrupo).trim() : 'sin-jefe';
    const obra = normalize(options?.obra);
    const instalacion = normalize(options?.instalacion);
    // Carpeta completa: checklist-photos/jefeGrupo/obra/instalacion/itemId
    const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${options.itemId}`;
    
    console.log('📂 [CloudPhotoService] Listando fotos en:', folder);
    console.log('📂 [CloudPhotoService] Parámetros completos:', {
      jefeGrupo,
      obra,
      instalacion,
      itemId: options.itemId,
      fecha: options.fecha
    });
    
    // Supongamos que tienes una Cloud Function que lista los archivos de una carpeta
    const LIST_FUNCTION_URL = 'https://us-central1-checklistedhinor.cloudfunctions.net/listphotosinfolder';
    try {
      const response = await fetch(LIST_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ [CloudPhotoService] Error listando fotos (${response.status}):`, errorText);
        
        // Si es un error del servidor interno, devolver array vacío en lugar de fallar
        if (response.status === 500) {
          console.log('📂 [CloudPhotoService] Error interno del servidor, devolviendo array vacío');
          return [];
        }
        
        throw new Error(`Error en listPhotos: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ [CloudPhotoService] Respuesta completa de listphotosinfolder:', JSON.stringify(result, null, 2));
      console.log('✅ [CloudPhotoService] Fotos listadas:', result.photos?.length || 0);
      
      if (result.photos && result.photos.length > 0) {
        console.log('📂 [CloudPhotoService] Detalles de fotos encontradas:');
        result.photos.forEach((photo: any, index: number) => {
          console.log(`  ${index + 1}. ${photo.fileName} - ${photo.url}`);
        });
      }
      
      // Espera un array de objetos { url, fileName, uploadedAt }
      return (result.photos || []).map((photo: any) => ({
        id: photo.fileName,
        url: photo.url,
        path: photo.url,
        uploadedAt: photo.uploadedAt || '',
        fileName: photo.fileName
      }));
    } catch (error) {
      console.error('❌ [CloudPhotoService] Error listando fotos:', error);
      // En lugar de fallar completamente, devolver array vacío para mejor UX
      return [];
    }
  }
  private static readonly CLOUD_FUNCTION_URL = 'https://us-central1-checklistedhinor.cloudfunctions.net/uploadPhotoBase64';

  // Método para crear metadatos de foto a partir de una URI local
  static createPhotoMetadata(photoUri: string, itemId: string, downloadUrl?: string): PhotoMetadata {
    return {
      id: `photo_${Date.now()}`,
      url: downloadUrl || photoUri,
      path: photoUri,
      uploadedAt: new Date().toISOString(),
      fileName: photoUri.split('/').pop() || `photo_${itemId}_${Date.now()}.jpg`
    };
  }

  // Método principal para subir foto a la nube
  static async uploadPhoto(photoUri: string, itemId: string, options?: {
    jefeGrupo?: string;
    obra?: string;
    instalacion?: string;
    fecha?: string;
  }): Promise<PhotoMetadata> {
    try {
      console.log('📤 [CloudPhotoService] Iniciando upload de foto:', photoUri);
      // 1. Convertir URI local a Base64
      const base64 = await this.convertUriToBase64(photoUri);
      // 2. Generar nombre único del archivo
      // Formatear fecha como DD-MM-YY
      let fechaStr = options?.fecha;
      if (!fechaStr) {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        fechaStr = `${day}-${month}-${year}`;
      } else {
        // Si viene en formato ISO, convertir a DD-MM-YY
        const parts = fechaStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          // yyyy-mm-dd -> dd-mm-yy
          fechaStr = `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
        }
      }
      // Normalizar nombres para obra e instalación (solo para evitar caracteres inválidos)
      const normalize = (str?: string) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
      // Usar el nombre tal cual, permitiendo espacios y caracteres
      const jefeGrupo = options?.jefeGrupo ? String(options.jefeGrupo).trim() : 'sin-jefe';
      // Carpeta completa: checklist-photos/jefeGrupo/obra/instalacion/checklistName
      const obra = normalize(options?.obra);
      const instalacion = normalize(options?.instalacion);
      const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${itemId}`;
      // Nombre del archivo: nombre del checklist + timestamp
      const fileName = `${itemId}_${Date.now()}.jpg`;
      // 3. Llamar a la Cloud Function
      const response = await fetch(this.CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64: base64,
          fileName: fileName,
          folder: folder
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en upload: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      console.log('✅ [CloudPhotoService] Upload exitoso:', result);
      // 4. Crear metadata con la URL real
      return this.createPhotoMetadata(photoUri, itemId, result.url);
    } catch (error) {
      console.error('❌ [CloudPhotoService] Error uploading photo:', error);
      // Fallback: retornar metadata local si falla el upload
      return this.createPhotoMetadata(photoUri, itemId);
    }
  }

  // Método privado para convertir URI a Base64
  private static async convertUriToBase64(uri: string): Promise<string> {
    try {
      console.log('🔄 [CloudPhotoService] Convirtiendo a Base64:', uri);
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('✅ [CloudPhotoService] Conversión a Base64 exitosa');
      return base64;
      
    } catch (error) {
      console.error('❌ [CloudPhotoService] Error convirtiendo a Base64:', error);
      throw error;
    }
  }

  // Método para validar URI de foto
  static isValidPhotoUri(uri: string): boolean {
    return uri && (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('http'));
  }
}
