import React from 'react';
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import PhotoButton from '../../components/ui/PhotoButton';
import { FirebasePhotoService } from '../../services/FirebasePhotoService';

function GrupoChecklistScreen({ route, navigation }) {
  const params = route?.params || {};
  const grupo = params.grupo || 'Sin grupo';
  const [items, setItems] = React.useState(Array.isArray(params.items) ? params.items : []);
  const [itemPhotos, setItemPhotos] = React.useState(params.itemPhotos || {});
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');

  // Tipo local para fotos compatible con PhotoButton
  type PhotoMetadata = {
    id: string;
    url: string;
    path: string;
    uploadedAt: string;
    fileName: string;
  };

  const openObservationsModal = (item) => {
    setSelectedItem(item);
    setNewObservation('');
    setModalVisible(true);
  };
  const saveObservations = () => {
    if (selectedItem && newObservation.trim()) {
      const updatedObservations = selectedItem.observaciones 
        ? `${selectedItem.observaciones}\n[${new Date().toLocaleString()}] ${selectedItem.nombre || ''}: ${newObservation.trim()}`
        : `[${new Date().toLocaleString()}] ${selectedItem.nombre || ''}: ${newObservation.trim()}`;
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedItem.id
            ? { ...item, observaciones: updatedObservations }
            : item
        )
      );
    }
    setModalVisible(false);
  };

  // Subida de foto a Firebase y actualización local
  const handlePhotoTaken = async (itemId, photoUri) => {
    try {
      const result = await FirebasePhotoService.uploadPhoto(photoUri, itemId);
      if (result.success && result.downloadURL) {
        const photoMetadata = {
          id: `photo_${Date.now()}`,
          url: result.downloadURL,
          path: result.uploadPath || '',
          uploadedAt: new Date().toISOString(),
          fileName: result.fileName || ''
        };
        setItemPhotos(prevPhotos => ({
          ...prevPhotos,
          [itemId]: [...(prevPhotos[itemId] || []), photoMetadata]
        }));
        Alert.alert('Foto subida', 'La foto se subió correctamente a Firebase.');
      } else {
        Alert.alert('Error', 'No se pudo subir la foto: ' + (result.error || 'Error desconocido'));
      }
    } catch (error) {
      Alert.alert('Error', 'Error inesperado al subir la foto: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Visualización de fotos
  const handleViewPhotos = (itemId) => {
    const photos = itemPhotos[itemId] || [];
    if (photos.length === 0) {
      Alert.alert('Sin fotos', 'No hay fotos para este elemento');
      return;
    }
    const photoList = photos.map((photo, index) => 
      `${index + 1}. ${photo.fileName} (${new Date(photo.uploadedAt).toLocaleString()})`
    ).join('\n');
    Alert.alert(
      `Fotos del elemento (${photos.length})`,
      photoList,
      [{ text: 'OK' }]
    );
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <ThemedText type="title">{grupo}</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <ThemedText>No hay items para mostrar.</ThemedText>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <ThemedText>{item.nombre}</ThemedText>
              {/* Observaciones box */}
              <View style={{ marginTop: 8, marginBottom: 8, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 8 }}>
                <ThemedText type="subtitle">Observaciones:</ThemedText>
                <ThemedText>{item.observaciones ? item.observaciones : 'Sin observaciones aún.'}</ThemedText>
                <TouchableOpacity
                  style={styles.observationsButton}
                  onPress={() => openObservationsModal(item)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agregar observación</Text>
                </TouchableOpacity>
              </View>
              <PhotoButton
                itemId={item.id}
                photos={itemPhotos[item.id] || []}
                onPhotoTaken={(photoUri) => handlePhotoTaken(item.id, photoUri)}
                onViewPhotos={() => handleViewPhotos(item.id)}
                maxPhotos={3}
              />
            </View>
          ))
        )}
      </ScrollView>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Agregar observación</Text>
            {selectedItem && (
              <Text style={{ marginBottom: 10 }}>{selectedItem.nombre}</Text>
            )}
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 10 }}
              placeholder="Escribe tu observación..."
              value={newObservation}
              onChangeText={setNewObservation}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#4a6cf7', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveObservations}>
                <Text style={{ color: '#4a6cf7', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#667eea',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  observationsButton: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#4a6cf7',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
});

export default GrupoChecklistScreen;
