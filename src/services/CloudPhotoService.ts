// Tipo para metadatos de fotos compatible con PhotoButton y lógica actual
export type PhotoMetadata = {
  id: string;
  url: string;
  path: string;
  uploadedAt: string;
  fileName: string;
};

// Servicio para manejo de fotos en la nube (compatible con los servicios actuales)
export class CloudPhotoService {
  // Método para crear metadatos de foto a partir de una URI local
  static createPhotoMetadata(photoUri: string, itemId: string): PhotoMetadata {
    return {
      id: `photo_${Date.now()}`,
      url: photoUri,
      path: photoUri,
      uploadedAt: new Date().toISOString(),
      fileName: photoUri.split('/').pop() || `photo_${itemId}_${Date.now()}.jpg`
    };
  }

  // Método para simular la subida de foto (compatible con lógica actual)
  static async uploadPhoto(photoUri: string, itemId: string): Promise<PhotoMetadata> {
    // Por ahora solo simulamos, pero aquí se puede integrar con Firebase o Cloud Functions
    return this.createPhotoMetadata(photoUri, itemId);
  }
}
