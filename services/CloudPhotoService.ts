/**
 * Cloud Photo Service
 * Servicio unificado para manejo de fotos en la nube
 * Solo usa Firebase real, sin fallback a mock
 */
import FirebaseStorageReal from './FirebaseStorageReal';

// Siempre usa Firebase real

// Asegúrate de tener configurado Firebase correctamente en config/firebase.ts

export interface PhotoMetadata {
  id: string;
  url: string;
  path: string;
  uploadedAt: string;
  fileName: string;
}

interface UploadPhotoParams {
  photoUri: string;
  obraId: string;
  instalacionId: string;
  itemId: string;
  fileName?: string;
}

class CloudPhotoService {
  private static instance: CloudPhotoService;
  private storageService: FirebaseStorageReal;

  constructor() {
    console.log('🔥 [CLOUD] Usando solo Firebase Storage REAL');
    this.storageService = FirebaseStorageReal.getInstance();
  }

  static getInstance(): CloudPhotoService {
    if (!CloudPhotoService.instance) {
      CloudPhotoService.instance = new CloudPhotoService();
    }
    return CloudPhotoService.instance;
  }

  /**
   * Subir foto
   */
  async uploadPhoto(params: UploadPhotoParams): Promise<PhotoMetadata | null> {
    try {
      console.log('📤 [CLOUD] Subiendo foto usando FIREBASE REAL');
      return await this.storageService.uploadPhoto(params);
    } catch (error) {
      console.error('❌ [CLOUD] Error en uploadPhoto:', error);
      return null;
    }
  }

  /**
   * Obtener fotos de un item
   */
  async getPhotos(obraId: string, instalacionId: string, itemId: string): Promise<PhotoMetadata[]> {
    try {
      return await this.storageService.getPhotos(obraId, instalacionId, itemId);
    } catch (error) {
      console.error('❌ [CLOUD] Error en getPhotos:', error);
      return [];
    }
  }

  /**
   * Eliminar foto
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      return await this.storageService.deletePhoto(photoId);
    } catch (error) {
      console.error('❌ [CLOUD] Error en deletePhoto:', error);
      return false;
    }
  }

  /**
   * Verificar conexión
   */
  async testConnection(): Promise<{ success: boolean; message: string; type: string }> {
    try {
      const isConnected = await this.storageService.testConnection();
      const serviceInfo = this.getServiceInfo();

      return {
        success: isConnected,
        message: isConnected
          ? `Conexión exitosa (${serviceInfo.type})`
          : `Error de conexión (${serviceInfo.type})`,
        type: serviceInfo.type
      };
    } catch (error) {
      console.error('❌ [CLOUD] Error en testConnection:', error);
      return {
        success: false,
        message: `Error: ${error}`,
        type: this.getServiceInfo().type
      };
    }
  }

  /**
   * Obtener información del servicio
   */
  getServiceInfo(): { type: string; isReal: boolean } {
    return {
      type: 'Firebase Real',
      isReal: true
    };
  }
}

// Exportar instancia singleton
export default CloudPhotoService.getInstance();
