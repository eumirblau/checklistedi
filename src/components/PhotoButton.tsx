
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloudPhotoService } from '../services/CloudPhotoService';

export interface PhotoMetadata {
  id: string;
  url: string;
  path: string;
  uploadedAt: string;
  fileName: string;
}

interface PhotoButtonProps {
  itemId: string;
  photos: PhotoMetadata[];
  onPhotoTaken: (uri: string) => void;
  onViewPhotos: () => void;
  onDeletePhoto?: (photo: PhotoMetadata) => void;
  maxPhotos: number;
  jefeGrupo: string;
  obra: string;
  instalacion: string;
  fecha: string;
}

const PhotoButton: React.FC<PhotoButtonProps> = ({
  itemId,
  photos,
  onPhotoTaken,
  onViewPhotos,
  maxPhotos,
  jefeGrupo,
  obra,
  instalacion,
  fecha,
  onDeletePhoto,
}) => {
  // Estados locales para el modal y galería
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhotos, setModalPhotos] = useState<PhotoMetadata[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [zoomPhoto, setZoomPhoto] = useState<PhotoMetadata | null>(null);

  // El modal solo se actualiza cuando el usuario lo solicita explícitamente

  const handleAddPhoto = () => {
    Alert.alert(
      'Agregar foto',
      '¿Cómo quieres agregar la foto?',
      [
        {
          text: 'Cámara',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso requerido', 'Se necesita permiso de cámara para tomar fotos.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                const photoMetadata = await CloudPhotoService.uploadPhoto(uri, itemId, {
                  jefeGrupo,
                  obra,
                  instalacion,
                  fecha
                });

                if (photoMetadata.url && photoMetadata.url.startsWith('http')) {
                  onPhotoTaken(photoMetadata.url);
                  // Ya no se abre el modal automáticamente, solo se actualiza el estado
                } else {
                  Alert.alert('Error', 'No se pudo subir la foto. Inténtalo de nuevo.');
                }
              }
            } catch (error) {
              Alert.alert('Error inesperado', 'Ocurrió un error al tomar o subir la foto.');
              console.error('Error cámara:', error);
            }
          },
        },
        {
          text: 'Subir desde galería',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galería.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const photoUri = result.assets[0].uri;
                const photoMetadata = await CloudPhotoService.uploadPhoto(photoUri, itemId, {
                  jefeGrupo,
                  obra,
                  instalacion,
                  fecha
                });
                if (photoMetadata.url && photoMetadata.url.startsWith('http')) {
                  onPhotoTaken(photoMetadata.url);
                  Alert.alert('Foto subida', 'La foto se subió correctamente desde la galería.');
                  // Ya no se abre el modal automáticamente, solo se actualiza el estado
                } else {
                  Alert.alert('Error', 'No se pudo subir la foto seleccionada.');
                }
              }
            } catch (error) {
              Alert.alert('Error inesperado', 'Ocurrió un error al seleccionar o subir la foto.');
              console.error('Error galería:', error);
            }
          }
        },
        {
          text: 'Galería Firebase',
          onPress: async () => {
            const fotos = await CloudPhotoService.listPhotos({
              jefeGrupo,
              obra,
              instalacion,
              itemId,
              fecha
            });
            if (fotos.length === 0) {
              Alert.alert('Sin fotos', 'No hay fotos en Firebase para este elemento');
              return;
            }
            setModalPhotos(fotos);
            setModalTitle('Galería Firebase');
            setModalVisible(true);
          }
        },
        {
          text: 'Galería local',
          onPress: () => {
            if (!Array.isArray(photos) || photos.length === 0) {
              Alert.alert('Sin fotos', 'No hay fotos locales para este elemento');
              return;
            }
            setModalPhotos(photos);
            setModalTitle('Galería local');
            setModalVisible(true);
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleAddPhoto}
      >
        <Text style={styles.buttonText}>
          📷 Foto / Galería
        </Text>
      </TouchableOpacity>
      {/* Modal galería visual */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>{modalTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {modalPhotos.map((photo, idx) => (
                <View key={photo.id || idx} style={{ marginRight: 12, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setZoomPhoto(photo)}>
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, marginTop: 4 }}>{photo.fileName}</Text>
                  {/* Mostrar fecha de subida si existe */}
                  {photo.uploadedAt && (
                    <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      Fecha: {new Date(photo.uploadedAt).toLocaleString('es-ES')}
                    </Text>
                  )}
                  {/* Mostrar usuario si existe en el nombre del archivo */}
                  {photo.fileName && photo.fileName.includes('_by_') && (
                    <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      Usuario: {photo.fileName.split('_by_')[1].split('.')[0]}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={{ marginTop: 4, backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                    onPress={() => {
                      if (typeof onDeletePhoto === 'function') {
                        onDeletePhoto(photo);
                        setModalPhotos(modalPhotos.filter((_, i) => i !== idx));
                      } else {
                        setModalPhotos(modalPhotos.filter((_, i) => i !== idx));
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12 }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {/* Modal de zoom */}
            {zoomPhoto && (
              <Modal visible={true} transparent animationType="fade" onRequestClose={() => setZoomPhoto(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={{ uri: zoomPhoto.url }}
                    style={{ width: 320, height: 320, borderRadius: 16, backgroundColor: '#eee' }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: '#fff', fontSize: 16, marginTop: 10 }}>{zoomPhoto.fileName}</Text>
                  <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#3498db', padding: 10, borderRadius: 8 }} onPress={() => setZoomPhoto(null)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            )}
            <TouchableOpacity style={{ alignSelf: 'center', backgroundColor: '#3498db', padding: 10, borderRadius: 8 }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2980b9',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  photoCount: {
    marginTop: 5,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoCountText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

export default PhotoButton;

