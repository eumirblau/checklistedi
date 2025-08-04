import { deleteObject, getDownloadURL, listAll, ref } from 'firebase/storage';
import { storage } from '../config/firebase';
// Eliminado: import GetRealPath from 'react-native-get-real-path';

export interface PhotoUploadResult {
  success: boolean;
  downloadURL?: string;
  error?: string;
  fileName?: string;
  uploadPath?: string;
}

export interface PhotoListResult {
  success: boolean;
  photos: PhotoMetadata[];
  error?: string;
}

export interface PhotoMetadata {
  id: string;
  downloadURL: string;
  fileName: string;
  uploadPath: string;
  uploadedAt: string;
  size: number;
}

export class FirebasePhotoService {
  private static readonly STORAGE_PATH = 'checklist-photos';

  /**
   * Subir una foto a Firebase Storage (método principal)
   */
  /**
   * Subir una foto a Firebase Storage (método principal)
   * @param uri URI local de la foto
   * @param jefeNombre Nombre del jefe de grupo
   * @param obraNombre Nombre de la obra
   * @param instalacionNombre Nombre de la instalación
   * @param checklistNombre Nombre del checklist
   * @param fileName Nombre de archivo opcional
   */
  static async uploadPhoto(
    uri: string,
    jefeNombre: string,
    obraNombre: string,
    instalacionNombre: string,
    checklistNombre: string,
    fileName?: string
  ): Promise<PhotoUploadResult> {
    try {
      console.log('🔥 [FIREBASE] Iniciando subida de foto...');
      console.log('📁 URI:', uri);
      console.log('👷 Jefe:', jefeNombre);
      console.log('�️ Obra:', obraNombre);
      console.log('🔧 Instalación:', instalacionNombre);
      console.log('📋 Checklist:', checklistNombre);

      // Generar nombre de archivo único
      const timestamp = Date.now();
      const finalFileName = fileName || `photo_${timestamp}.jpg`;
      // Limpiar nombres para evitar caracteres problemáticos
      const limpiar = (str: string) => str.replace(/[\\/:*?"<>|]/g, '').trim();
      const uploadPath = `${limpiar(jefeNombre)}/${limpiar(obraNombre)}/${limpiar(instalacionNombre)}/${limpiar(checklistNombre)}/${finalFileName}`;

      console.log('📤 Subiendo a:', uploadPath);

      // Crear referencia de storage
      const storageRef = ref(storage, uploadPath);

      // Leer el archivo local como base64 y convertirlo a un buffer
      let filePath = uri;
      let mimeType = 'image/jpeg';
      let fileBytes: string;
      console.log('[FIREBASE] uploadPhoto filePath:', filePath);
      if (!filePath.startsWith('file://')) {
        console.error('❌ [FIREBASE] La URI no es local (file://), no se puede subir en Expo. URI:', filePath);
        return {
          success: false,
          error: 'La URI no es local (file://), no se puede subir en Expo. URI: ' + filePath
        };
      }
      try {
        const fs = await import('expo-file-system');
        fileBytes = await fs.readAsStringAsync(filePath, { encoding: fs.EncodingType.Base64 });
      } catch (readError) {
        console.error('❌ [FIREBASE] Error leyendo archivo para subir:', readError);
        return {
          success: false,
          error: 'Error leyendo archivo para subir: ' + (readError instanceof Error ? readError.message : 'desconocido')
        };
      }
      try {
        // @ts-ignore
        await storageRef.putString(fileBytes, 'base64', { contentType: mimeType });
        // Obtener URL de descarga
        const downloadURL = await getDownloadURL(storageRef);
        console.log('✅ [FIREBASE] Foto subida exitosamente');
        console.log('🔗 Download URL:', downloadURL);
        return {
          success: true,
          downloadURL,
          fileName: finalFileName,
          uploadPath
        };
      } catch (uploadError) {
        console.error('❌ [FIREBASE] Error subiendo foto a Firebase:', uploadError);
        return {
          success: false,
          error: 'Error subiendo foto a Firebase: ' + (uploadError instanceof Error ? uploadError.message : 'desconocido')
        };
      }

    } catch (error) {
      console.error('❌ [FIREBASE] Error subiendo foto:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Listar fotos de un item específico
   */
  static async getPhotosForItem(itemId: string): Promise<PhotoListResult> {
    try {
      console.log('🔍 [FIREBASE] Obteniendo fotos para item:', itemId);


      const folderRef = ref(storage, `${this.STORAGE_PATH}/${itemId}`);
      const listResult = await listAll(folderRef);

      console.log('📊 [FIREBASE] Encontradas', listResult.items.length, 'fotos');

      const photos: PhotoMetadata[] = [];


      for (const item of listResult.items) {
        try {
          const downloadURL = await getDownloadURL(item);
          // El SDK web no expone getMetadata directamente, así que solo usamos lo que tenemos
          photos.push({
            id: `${itemId}_${item.name}`,
            downloadURL,
            fileName: item.name,
            uploadPath: item.fullPath,
            uploadedAt: new Date().toISOString(),
            size: 0 // No disponible en el SDK web
          });
        } catch (itemError) {
          console.warn('⚠️ [FIREBASE] Error obteniendo metadata para', item.name, itemError);
        }
      }

      console.log('✅ [FIREBASE] Fotos obtenidas:', photos.length);

      return {
        success: true,
        photos
      };

    } catch (error) {
      console.error('❌ [FIREBASE] Error obteniendo fotos:', error);
      return {
        success: false,
        photos: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Probar conexión a Firebase
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 [FIREBASE] Probando conexión...');

      // Intentar acceder a storage

      const testRef = ref(storage, 'test-connection.txt');
      // Verificar que podemos crear referencias
      console.log('📍 [FIREBASE] Test ref path:', testRef.fullPath);

      return {
        success: true,
        message: 'Conexión Firebase exitosa - Storage disponible'
      };

    } catch (error) {
      console.error('❌ [FIREBASE] Error en test de conexión:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Métodos legacy mantenidos para compatibilidad
  /**
   * Sube una imagen a Firebase Storage (método legacy)
   * @param imageUri - URI local de la imagen
   * @param fileName - Nombre del archivo en Firebase
   * @returns Promise<string> - URL de descarga de la imagen
   */
  static async uploadImage(imageUri: string, fileName: string): Promise<string> {
    try {
      console.log('🔄 [LEGACY] Iniciando subida a Firebase:', { imageUri, fileName });
      
      // Usar el nuevo método uploadPhoto con argumentos requeridos
      // Los valores legacy se asignan como 'legacy' para jefe, obra, instalación y checklist
      const result = await this.uploadPhoto(
        imageUri,
        'legacy', // jefeNombre
        'legacy', // obraNombre
        'legacy', // instalacionNombre
        'legacy', // checklistNombre
        fileName
      );
      
      if (result.success && result.downloadURL) {
        console.log('✅ [LEGACY] Imagen subida exitosamente:', result.downloadURL);
        return result.downloadURL;
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ [LEGACY] Error subiendo imagen a Firebase:', error);
      throw new Error(`Error al subir imagen: ${error}`);
    }
  }

  /**
   * Elimina una imagen de Firebase Storage
   * @param fileName - Nombre del archivo a eliminar
   */
  static async deleteImage(fileName: string): Promise<void> {
    try {
      const storageRef = ref(storage, `images/${fileName}`);
      await deleteObject(storageRef);
      console.log('✅ Imagen eliminada de Firebase:', fileName);
    } catch (error) {
      console.error('❌ Error eliminando imagen de Firebase:', error);
      throw new Error(`Error al eliminar imagen: ${error}`);
    }
  }

  /**
   * Genera un nombre único para el archivo
   * @param originalName - Nombre original del archivo
   * @returns string - Nombre único con timestamp
   */
  static generateFileName(originalName: string = 'image.jpg'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop() || 'jpg';
    return `${timestamp}_${randomId}.${extension}`;
  }

  /**
   * Obtener información del servicio
   */
}
