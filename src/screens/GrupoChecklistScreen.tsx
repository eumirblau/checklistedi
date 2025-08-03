import React from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import PhotoButton from '../../components/ui/PhotoButton';
import ApiService from '../../services/ApiService';
import { FirebasePhotoService } from '../../services/FirebasePhotoService';

function GrupoChecklistScreen({ route, navigation }) {
  const params = route?.params || {};
  const grupo = params.grupo || 'Sin grupo';
  const [items, setItems] = React.useState(Array.isArray(params.items) ? params.items : []);
  const [itemPhotos, setItemPhotos] = React.useState(params.itemPhotos || {});
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Extraer parámetros necesarios para guardar
  const { spreadsheetId, instalacionNombre, usuario, obraNombre } = params;

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
    setNewObservation(''); // Limpiar observación anterior
    setModalVisible(true);
  };
  
  const closeObservationsModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setNewObservation('');
  };

  // Función para manejar cambio de checkbox
  const handleCheckboxChange = (itemId) => {
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === itemId
          ? { ...i, completado: !i.completado }
          : i
      )
    );
  };
  const saveObservations = () => {
    if (selectedItem && newObservation.trim()) {
      const timestamp = new Date().toLocaleString('es-ES');
      const userName = usuario?.nombre || usuario || 'Usuario';
      
      const updatedObservations = selectedItem.observaciones 
        ? `${selectedItem.observaciones}\n[${timestamp}] ${userName}: ${newObservation.trim()}`
        : `[${timestamp}] ${userName}: ${newObservation.trim()}`;
        
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedItem.id
            ? { ...item, observaciones: updatedObservations }
            : item
        )
      );
      
      // Limpiar el formulario y cerrar modal
      setNewObservation('');
      setSelectedItem(null);
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

  // Función para guardar los cambios
  const saveChecklist = async () => {
    console.log('🚀 [GrupoChecklistScreen] Iniciando guardado...');
    console.log('📋 spreadsheetId:', spreadsheetId);
    console.log('🏢 instalacionNombre:', instalacionNombre);
    console.log('👤 usuario:', usuario);
    console.log('🏗️ obraNombre:', obraNombre);
    console.log('📝 items a guardar:', items.length);
    
    if (!spreadsheetId || !instalacionNombre || !usuario || !obraNombre) {
      Alert.alert('Error', 'Faltan datos necesarios para guardar. Por favor, regresa e intenta de nuevo.');
      return;
    }

    setSaving(true);
    try {
      console.log('📤 Llamando a ApiService.guardarChecks...');
      const result = await ApiService.guardarChecks(
        obraNombre, // obraIdOrName
        instalacionNombre, // instalacionNombre
        items, // itemsToSave
        usuario.nombre || usuario, // usuario
        usuario.cargo || 'Sin cargo', // cargo
        obraNombre // _obraNombreOriginal
      );
      
      console.log('✅ Resultado del guardado:', result);
      Alert.alert(
        'Guardado exitoso',
        'Los cambios se han guardado correctamente.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navegar de vuelta y forzar actualización
              navigation.navigate('Checklist', {
                ...route.params,
                forceRefresh: true,
                timestamp: Date.now() // Para forzar recarga
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error guardando checklist:', error);
      Alert.alert(
        'Error al guardar',
        `No se pudieron guardar los cambios: ${error.message || error}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          
          {/* Botón de guardar */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveChecklist}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <ThemedText type="title" style={styles.headerTitle}>{grupo}</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <ThemedText>No hay items para mostrar.</ThemedText>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              {/* Mostrar unidad y descripción del item */}
              <ThemedText style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                {item.unidad || 'Sin unidad'}
              </ThemedText>
              {item.descripcion && (
                <ThemedText style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  {item.descripcion}
                </ThemedText>
              )}
              
              {/* Checkbox para marcar completado */}
              <TouchableOpacity
                style={[styles.checkboxContainer, item.completado && styles.checkboxChecked]}
                onPress={() => handleCheckboxChange(item.id)}
              >
                <Text style={[styles.checkboxText, item.completado && styles.checkboxTextChecked]}>
                  {item.completado ? '✓' : '○'} {item.completado ? 'Completado' : 'Pendiente'}
                </Text>
              </TouchableOpacity>
              {/* Observaciones box */}
              <View style={styles.observationsBox}>
                <ThemedText type="subtitle" style={styles.observationsTitle}>Observaciones:</ThemedText>
                <ThemedText style={styles.observationsText}>
                  {item.observaciones || 'Sin observaciones aún.'}
                </ThemedText>
                <TouchableOpacity
                  style={styles.observationsButton}
                  onPress={() => openObservationsModal(item)}
                >
                  <Text style={styles.observationsButtonText}>
                    {item.observaciones ? 'Agregar más observaciones' : 'Agregar observación'}
                  </Text>
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
              <Text style={{ marginBottom: 10 }}>
                {selectedItem.unidad || selectedItem.descripcion || 'Item sin nombre'}
              </Text>
            )}
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 10 }}
              placeholder="Escribe tu observación..."
              value={newObservation}
              onChangeText={setNewObservation}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={closeObservationsModal} style={{ marginRight: 16 }}>
                <Text style={{ color: '#4a6cf7', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveObservations}>
                <Text style={{ color: '#ff6b35', fontWeight: 'bold' }}>Guardar</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    textAlign: 'center',
    color: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
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
  observationsBox: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  observationsTitle: {
    color: '#4a6cf7',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  observationsText: {
    color: '#4a5568',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    minHeight: 20,
  },
  observationsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkboxContainer: {
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  checkboxChecked: {
    backgroundColor: '#e6ffed',
    borderColor: '#38a169',
  },
  checkboxText: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  checkboxTextChecked: {
    color: '#38a169',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#ff6b35', // Naranja brillante más llamativo
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#a0aec0',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GrupoChecklistScreen;
