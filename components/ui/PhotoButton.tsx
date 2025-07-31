import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


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
  maxPhotos: number;
}

const PhotoButton: React.FC<PhotoButtonProps> = ({
  itemId,
  photos,
  onPhotoTaken,
  onViewPhotos,
  maxPhotos,
}) => {
  // Componente minimalista, sin lógica nativa ni mocks
  // Handler para tomar o seleccionar foto o galería
  const handleAddPhoto = () => {
    Alert.alert(
      'Agregar foto',
      '¿Cómo quieres agregar la foto?',
      [
        {
          text: 'Cámara',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso requerido', 'Se necesita permiso de cámara para tomar fotos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const uri = result.assets[0].uri;
              onPhotoTaken(uri);
            }
          },
        },
        {
          text: 'Galería',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galería.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const uri = result.assets[0].uri;
              onPhotoTaken(uri);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={photos.length === 0 ? handleAddPhoto : onViewPhotos}
      >
        <Text style={styles.buttonText}>
          {photos.length === 0 ? '📷 Añadir' : `📷 Ver (${photos.length})`}
        </Text>
      </TouchableOpacity>
      {photos.length > 0 && photos.length < maxPhotos && (
        <View style={styles.photoCount}>
          <Text style={styles.photoCountText}>
            {photos.length}/{maxPhotos}
          </Text>
        </View>
      )}
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
    backgroundColor: '#e74c3c', // Rojo para test visual
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0392b', // Rojo oscuro para el borde
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

