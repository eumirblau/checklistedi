import React from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import ApiService from '../../services/ApiService';
import PhotoButton from '../components/PhotoButton';

function GrupoChecklistScreen({ route, navigation }) {
  const params = route?.params || {};
  const grupo = params.grupo || 'Sin grupo';
  // Eliminar foto de Firebase y del estado local
  const handleDeletePhoto = async (itemId, photo) => {
    try {
      // Eliminar de Firebase
      const ok = await import('../services/CloudPhotoService').then(mod => mod.CloudPhotoService.deletePhotoFromFirebase({
        jefeGrupo: usuario?.nombre || usuario || 'sin-jefe',
        obra: obraNombre || 'sin-obra',
        instalacion: instalacionNombre || 'sin-instalacion',
        itemId,
        fecha: new Date().toISOString().split('T')[0],
        fileName: photo.fileName || ''
      }));
      if (!ok) {
        Alert.alert('Error', 'No se pudo eliminar la foto de Firebase');
        return;
      }
      // Eliminar del estado local
      setItemPhotos(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || []).filter(p => p.id !== photo.id)
      }));
      Alert.alert('Foto eliminada', 'La foto fue eliminada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar la foto: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  const [items, setItems] = React.useState(Array.isArray(params.items) ? params.items : []);
  const [itemPhotos, setItemPhotos] = React.useState(params.itemPhotos || {});
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Extraer parámetros necesarios para guardar
  const { spreadsheetId, instalacionNombre, usuario, obraNombre } = params;

  // Función para recargar los datos del grupo desde Google Sheets
  const loadGroupItems = React.useCallback(async () => {
    try {
      console.log('🔄 Recargando items del grupo desde Google Sheets...');
      const data = await ApiService.getItemsDeChecklist(obraNombre, instalacionNombre);
      
      if (data && data.length > 0) {
        console.log(`✅ Recargados ${data.length} items totales de Google Sheets`);
        
        // Agrupar items como en ChecklistScreen y encontrar el grupo actual
        const grupos = [];
        let grupoActual = null;
        let ultimoEncabezado = '';
        
        for (const item of data) {
          const unidad = item.unidad?.trim() || '';
          const descripcion = item.descripcion?.trim().toUpperCase() || '';
          
          // Si la unidad es un encabezado o la descripción es especial
          if (
            (unidad && unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2 && unidad !== ultimoEncabezado) ||
            ["EXISTENTE NO SE MODIFICA","NO ES MOTIVO DE LA OBRA","NO SE HA INICIADO","OBSERVACIONES/ANOTACIONES","FIRMAS"].includes(descripcion)
          ) {
            grupoActual = { encabezado: unidad || descripcion, items: [] };
            grupos.push(grupoActual);
            ultimoEncabezado = unidad || descripcion;
          } else if (grupoActual) {
            grupoActual.items.push(item);
          }
        }
        
        // Encontrar el grupo que coincide con el grupo actual
        const grupoEncontrado = grupos.find(g => g.encabezado === grupo);
        if (grupoEncontrado) {
          console.log(`✅ Encontrado grupo "${grupo}" con ${grupoEncontrado.items.length} items`);
          
          // 🔍 DEBUG: Verificar observaciones que llegan de Google Sheets
          grupoEncontrado.items.forEach((item, idx) => {
            console.log(`📝 Item ${idx}: "${item.unidad || item.descripcion}" - Observaciones: "${item.observaciones || 'VACÍAS'}"`);
          });
          
          setItems(grupoEncontrado.items);
        } else {
          console.log(`⚠️ No se encontró el grupo "${grupo}"`);
        }
      }
    } catch (error) {
      console.error('❌ Error recargando items del grupo:', error);
    }
  }, [obraNombre, instalacionNombre, grupo]);

  // ✅ FIX: Recargar datos frescos al abrir la pantalla
  React.useEffect(() => {
    console.log('🔄 GrupoChecklistScreen montado - recargando datos frescos...');
    loadGroupItems();
  }, [loadGroupItems]);

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

  const addObservation = () => {
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
      
      setNewObservation(''); // Limpiar el campo después de agregar
    }
  };

  // Función para manejar cambio de checkbox
  const handleCheckboxChange = (itemId) => {
    setItems(prevItems =>
      prevItems.map(i => {
        if (i.id === itemId) {
          const newCompletado = !i.completado;
          const currentDate = new Date().toLocaleDateString('es-ES');
          const userName = usuario?.nombre || usuario || 'Usuario';
          
          return {
            ...i,
            completado: newCompletado,
            // Usar fechapp que es lo que entiende el backend
            fechapp: newCompletado ? currentDate : null,
            usuarioCompletado: newCompletado ? userName : null
          };
        }
        return i;
      })
    );
  };

  // Subida de foto a Firebase y actualización local
  // Ahora handlePhotoTaken recibe la URL pública directamente desde PhotoButton
  const handlePhotoTaken = (itemId, publicUrl) => {
    console.log('[PHOTO] handlePhotoTaken itemId:', itemId);
    console.log('[PHOTO] handlePhotoTaken publicUrl:', publicUrl);
    if (!publicUrl || typeof publicUrl !== 'string' || !publicUrl.startsWith('http')) {
      Alert.alert('Error', 'No se recibió una URL válida de la foto.');
      return;
    }
    const photoMetadata = {
      id: `photo_${Date.now()}`,
      url: publicUrl,
      path: '',
      uploadedAt: new Date().toISOString(),
      fileName: ''
    };
    setItemPhotos(prevPhotos => ({
      ...prevPhotos,
      [itemId]: [...(prevPhotos[itemId] || []), photoMetadata]
    }));
    Alert.alert('Foto subida', 'La foto se subió correctamente a Firebase.');
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
        'Los cambios se han guardado correctamente.'
      );
      
      // 🔧 FIX: No recargar automáticamente para evitar perder cambios locales
      // La recarga se hará cuando el usuario navegue de vuelta o refresque manualmente
      console.log('� Guardado completado. Los datos se mantendrán localmente hasta la próxima navegación.');
      // await loadGroupItems(); // ❌ COMENTADO: Causaba pérdida de datos
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
              
              {/* Toggle Switch compacto */}
              <TouchableOpacity
                style={[styles.toggleContainerCompact, item.completado && styles.toggleContainerChecked]}
                onPress={() => handleCheckboxChange(item.id)}
              >
                <View style={[styles.toggleSwitchCompact, item.completado && styles.toggleSwitchChecked]}>
                  <Text style={[styles.toggleTextCompact, item.completado && styles.toggleTextChecked]}>
                    {item.completado ? '✓' : '○'}
                  </Text>
                </View>
                <Text style={[styles.toggleLabelCompact, item.completado && styles.toggleLabelChecked]}>
                  {item.completado ? 'Completado' : 'Check'}
                </Text>
                {item.completado && item.fechapp && (
                  <Text style={styles.toggleDateTextCompact}>
                    {item.fechapp}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Observaciones box mejorada */}
              <View style={styles.observationsBox}>
                <Text style={[styles.observationsTitle, { color: '#4a6cf7', fontWeight: 'bold' }]}>Observaciones:</Text>
                {item.observaciones ? (
                  <ScrollView 
                    style={{ maxHeight: 150, marginBottom: 8 }} 
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {item.observaciones.split('\n').filter(obs => obs.trim() !== '').map((observacion, index) => (
                      <View key={index} style={{ marginBottom: 6, padding: 4, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
                        <Text style={[styles.observationsText, { fontSize: 13, lineHeight: 18 }]}>
                          {observacion.trim()}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.observationsText}>Sin observaciones aún.</Text>
                )}
              </View>

              {/* Botones de Foto y Observaciones lado a lado */}
              <View style={styles.buttonRow}>
                <PhotoButton
                  itemId={item.id}
                  checklistName={item.unidad}
                  photos={itemPhotos[item.id] || []}
                  onPhotoTaken={(url) => handlePhotoTaken(item.id, url)}
                  onViewPhotos={() => handleViewPhotos(item.id)}
                  onDeletePhoto={(photo) => handleDeletePhoto(item.id, photo)}
                  maxPhotos={5}
                  jefeGrupo={usuario?.nombre || usuario || 'sin-jefe'}
                  obra={obraNombre || 'sin-obra'}
                  instalacion={instalacionNombre || 'sin-instalacion'}
                  fecha={new Date().toISOString().split('T')[0]}
                />
                
                <TouchableOpacity
                  style={styles.observationsButtonInline}
                  onPress={() => openObservationsModal(item)}
                >
                  <Text style={styles.observationsButtonInlineText}>+ Observación</Text>
                </TouchableOpacity>
              </View>
              {/* Galería de fotos */}
              <ScrollView horizontal style={{ marginTop: 8, marginBottom: 8 }} showsHorizontalScrollIndicator={false}>
                {(itemPhotos[item.id] && itemPhotos[item.id].length > 0) ? (
                  itemPhotos[item.id].map((photo, idx) => (
                    <View key={photo.id || idx} style={{ marginRight: 8 }}>
                      <Image
                        source={{ uri: photo.url }}
                        style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' }}
                        resizeMode="cover"
                      />
                    </View>
                  ))
                ) : (
                  <Text style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>Sin fotos aún.</Text>
                )}
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Agregar observación</Text>
              <TouchableOpacity onPress={closeObservationsModal}>
                <Text style={{ fontSize: 24, color: '#718096', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedItem && (
              <Text style={{ marginBottom: 10, color: '#4a5568' }}>
                {selectedItem.unidad || selectedItem.descripcion || 'Item sin nombre'}
              </Text>
            )}
            {selectedItem?.observaciones ? (
              <View style={{ marginBottom: 10, padding: 12, backgroundColor: '#f8f9ff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontWeight: 'bold', color: '#4a6cf7', marginBottom: 8 }}>Historial:</Text>
                <Text style={{ color: '#4a5568', lineHeight: 20 }}>{selectedItem.observaciones}</Text>
              </View>
            ) : null}
            <Text style={{ fontWeight: 'bold', color: '#4a6cf7', marginBottom: 8 }}>Nueva observación:</Text>
            <TextInput
              style={{ borderWidth: 2, borderColor: '#4a6cf7', borderRadius: 8, padding: 12, marginBottom: 10, minHeight: 80, backgroundColor: '#fff' }}
              placeholder="Escriba su observación aquí..."
              value={newObservation}
              onChangeText={setNewObservation}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={{ backgroundColor: '#4a6cf7', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 10 }}
              onPress={addObservation}
              disabled={!newObservation.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agregar observación</Text>
            </TouchableOpacity>
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
  checkboxDateText: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Estilos para toggle/pestillo
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 25,
    padding: 4,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 50,
  },
  toggleContainerChecked: {
    backgroundColor: '#e6ffed',
    borderColor: '#38a169',
  },
  toggleSwitch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleSwitchChecked: {
    backgroundColor: '#38a169',
  },
  toggleText: {
    fontSize: 18,
    color: '#a0aec0',
    fontWeight: 'bold',
  },
  toggleTextChecked: {
    color: '#fff',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  toggleLabelChecked: {
    color: '#38a169',
    fontWeight: 'bold',
  },
  toggleDateText: {
    fontSize: 11,
    color: '#4a5568',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  // Estilos compactos
  toggleContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 15,
    padding: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 26,
    alignSelf: 'flex-end',
    maxWidth: '50%',
  },
  toggleSwitchCompact: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  toggleTextCompact: {
    fontSize: 10,
    color: '#a0aec0',
    fontWeight: 'bold',
  },
  toggleLabelCompact: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '500',
  },
  toggleDateTextCompact: {
    fontSize: 9,
    color: '#4a5568',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  compactButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  compactButton: {
    backgroundColor: '#f8f9ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactButtonText: {
    fontSize: 18,
  },
  observationsBoxCompact: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  observationsTextCompact: {
    fontSize: 12,
    color: '#4a5568',
    lineHeight: 16,
    marginBottom: 2,
  },
  observationsButtonCompact: {
    backgroundColor: '#4a6cf7',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  observationsButtonTextCompact: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  observationsButtonInline: {
    flex: 1,
    backgroundColor: '#4a6cf7',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  observationsButtonInlineText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
