import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text as RNText,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// ...ya importados arriba, eliminar duplicado
import PhotoButton from '../../components/ui/PhotoButton'; // Importación corregida
import ApiService from '../../services/ApiService';
// importación eliminada: CloudPhotoService no existe
import { FirebasePhotoService } from '../../services/FirebasePhotoService';
import { ChecklistItem } from '../../types';

// Tipo local para fotos compatible con PhotoButton y lógica actual
type PhotoMetadata = {
  id: string;
  url: string;
  path: string;
  uploadedAt: string;
  fileName: string;
};

// Componente Text seguro que previene el error "Text strings must be rendered within a <Text> component"
const Text = ({ children, style, ...props }: any) => {
  const safeContent = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(item => safeContent(item)).join('');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }; // <--- aquí debe ir la llave

  return (
    <RNText style={style} {...props}>
      {safeContent(children)}
    </RNText>
  );
};

type ChecklistScreenNavigationProp = any;
type ChecklistScreenRouteProp = any;

interface Props {
  navigation: ChecklistScreenNavigationProp;
  route: ChecklistScreenRouteProp;
}

const ChecklistScreen = ({ navigation, route }: Props) => {
  const { instalacionId, instalacionNombre, spreadsheetId, usuario, obraNombre, obraId, jefeNombre } = route.params;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newObservation, setNewObservation] = useState('');
  const [itemPhotos, setItemPhotos] = useState<{ [itemId: string]: PhotoMetadata[] }>({});  const handleGoBack = () => {
    navigation.navigate('Instalaciones', {
      obraId,
      obraNombre,
      jefeNombre,
      usuario,
      spreadsheetId,
    });
  };  const loadChecklist = useCallback(async () => {    try {
      setLoading(true);
        const data = await ApiService.getItemsDeChecklist(spreadsheetId, instalacionNombre);
      
      console.log('DATOS RECIBIDOS:', data?.length || 0, 'items');
      
      // Validación y limpieza de datos
      const validatedData = (data || []).map(item => ({
        ...item,
        id: item.id || Math.random().toString(),
        unidad: item.unidad ? String(item.unidad).trim() : '',
        descripcion: item.descripcion ? String(item.descripcion).trim() : '',
        observaciones: item.observaciones ? String(item.observaciones).trim() : '',
        completado: Boolean(item.completado)
      })).filter(item => {
        // Filtramos items vacíos
        if (!item.unidad && !item.descripcion) return false;
        
        // Filtramos items que contienen "no check" en la descripción
        if (item.descripcion.toLowerCase().includes('no check')) return false;

        return true;
      });

      console.log('DATOS FILTRADOS:', validatedData?.length || 0, 'items');
      setItems(validatedData);
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudieron cargar los items: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: 'Reintentar', onPress: loadChecklist }]
      );
    } finally {
      setLoading(false);
    }
  }, [instalacionId, instalacionNombre, spreadsheetId]);
  useEffect(() => {
    loadChecklist();
  }, [loadChecklist, instalacionNombre, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChecklist();
    setRefreshing(false);
  };

  const toggleItem = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? {
              ...item,
              completado: !item.completado,
              fechaCompletado: !item.completado ? new Date().toISOString() : '',
            }
          : item
      )
    );
  };

  const openObservationsModal = (item: ChecklistItem) => {
    setSelectedItem(item);
    setNewObservation('');
    setModalVisible(true);
  };
  const saveObservations = () => {
    if (selectedItem && newObservation.trim()) {
      const updatedObservations = selectedItem.observaciones 
        ? `${selectedItem.observaciones}\n[${new Date().toLocaleString()}] ${usuario.nombre}: ${newObservation.trim()}`
        : `[${new Date().toLocaleString()}] ${usuario.nombre}: ${newObservation.trim()}`;

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

  // Versión asíncrona: sube la foto a Firebase y actualiza el estado local con la URL real
  const handlePhotoTaken = async (itemId: string, photoUri: string) => {
    try {
      const result = await FirebasePhotoService.uploadPhoto(photoUri, itemId);
      if (result.success && result.downloadURL) {
        const photoMetadata: PhotoMetadata = {
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


  const handleViewPhotos = async (itemId: string) => {
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

  const saveChecklist = async () => {
    try {
      setSaving(true);
      await ApiService.guardarChecks(
        spreadsheetId,
        instalacionNombre,
        items,
        usuario.nombre,
        usuario.cargo,
        obraNombre
      );
      Alert.alert('Éxito', 'Checklist guardado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el checklist');
    } finally {
      setSaving(false);
    }
  };  const renderItem = ({ item }: { item: ChecklistItem }) => {
    const getInitials = (text: string) => {
      return text
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };

    const displayText = item.unidad || item.descripcion || 'Item';

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemCardContent}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, item.completado && styles.avatarCompleted]}>
              <Text style={styles.avatarText}>{getInitials(String(displayText))}</Text>
            </View>
          </View>

          <View style={styles.itemInfo}>
            {item.unidad ? <Text style={styles.itemTitle}>{String(item.unidad)}</Text> : null}
            {item.descripcion ? <Text style={styles.itemDescription}>{String(item.descripcion)}</Text> : null}
            {/* Pantalla/box de observaciones debajo de la descripción, siempre visible */}
            <View style={styles.observationsBox}>
              <Text style={styles.observationsBoxTitle}>Observaciones:</Text>
              <Text style={styles.observationsBoxText}>{item.observaciones ? String(item.observaciones) : 'Sin observaciones aún.'}</Text>
              <TouchableOpacity
                style={styles.observationsButtonBlue}
                onPress={() => openObservationsModal(item)}
              >
                <Text style={styles.observationsButtonTextBlue}>Agregar observación</Text>
              </TouchableOpacity>
            </View>
            {/* Botón para tomar foto integrado con PhotoButton, debajo del box de observaciones */}
            <PhotoButton 
              itemId={item.id}
              photos={itemPhotos[item.id] || []}
              onPhotoTaken={(photoUri) => handlePhotoTaken(item.id, photoUri)}
              onViewPhotos={() => handleViewPhotos(item.id)}
              maxPhotos={3}
            />
            {item.fechaCompletado ? (
              <Text style={styles.completedDate}>
                ✅ {`Completado: ${new Date(item.fechaCompletado).toLocaleString()}`}
              </Text>
            ) : null}
          </View>

          <View style={styles.switchContainer}>
            <Switch
              value={item.completado}
              onValueChange={() => toggleItem(item.id)}
              trackColor={{ false: '#e2e8f0', true: '#48bb78' }}
              thumbColor={item.completado ? '#fff' : '#cbd5e0'}
            />
          </View>
        </View>
      </View>
    );
  };

  // Agrupación de items por encabezados detectados
  function agruparPorEncabezados(items: ChecklistItem[]) {
    // Detectar dinámicamente los encabezados presentes en los datos
    const grupos: { encabezado: string, items: ChecklistItem[] }[] = [];
    let grupoActual: { encabezado: string, items: ChecklistItem[] } | null = null;
    let ultimoEncabezado = '';
    for (const item of items) {
      const unidad = item.unidad?.trim() || '';
      const descripcion = item.descripcion?.trim().toUpperCase() || '';
      // Si la unidad es un encabezado (mayúsculas y sin números) o la descripción es especial
      if (
        unidad && unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2 && unidad !== ultimoEncabezado
        || ["EXISTENTE NO SE MODIFICA","NO ES MOTIVO DE LA OBRA","NO SE HA INICIADO","OBSERVACIONES/ANOTACIONES","FIRMAS"].includes(descripcion)
      ) {
        grupoActual = { encabezado: unidad || descripcion, items: [] };
        grupos.push(grupoActual);
        ultimoEncabezado = unidad || descripcion;
      } else if (grupoActual) {
        grupoActual.items.push(item);
      }
    }
    // Solo devolver grupos con al menos un item
    return grupos.filter(g => g.items.length > 0);
  }

  const gruposChecklist = agruparPorEncabezados(items);
  const completedCount = items.filter(item => item.completado).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  if (loading) {
    return (
      <View style={[styles.container, styles.gradientBackground]}>
        <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando checklist...</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.container, styles.gradientBackground]}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeText}>Instalación: {instalacionNombre}</Text>
        <Text style={styles.title}>📋 Checklist</Text>
        <Text style={styles.subtitle}>
          {`${String(completedCount)} de ${String(totalCount)} completados (${String(Math.round(progress))}%)`}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(progress)}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.listWrapper}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContainer}>
          {/* Collapsibles por grupo */}
          {gruposChecklist.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay items en este checklist</Text>
              <Text style={styles.emptySubtext}>Desliza hacia abajo para refrescar</Text>
            </View>
          ) : gruposChecklist.length === 1 ? (
            // Si solo hay un grupo, mostrar los items directamente sin collapsible
            gruposChecklist[0].items.map(item => renderItem({ item }))
          ) : (
            gruposChecklist.map((grupo, idx) => (
              <TouchableOpacity
                key={idx}
                style={{ marginBottom: 12, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 16 }}
                onPress={() => {
                  const params = {
                    grupo: grupo.encabezado,
                    items: grupo.items,
                    itemPhotos: grupo.items.reduce((acc, item) => {
                      acc[item.id] = itemPhotos[item.id] || [];
                      return acc;
                    }, {} as { [itemId: string]: any[] }),
                  };
                  console.log('NAVEGANDO A GrupoChecklistScreen CON:', params);
                  navigation.navigate('GrupoChecklistScreen', params);
                }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#4a6cf7' }}>{grupo.encabezado}</Text>
                <Text style={{ color: '#718096', fontSize: 14 }}>{grupo.items.length} ítems</Text>
              </TouchableOpacity>
            ))
          )}
          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveChecklist}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>💾 Guardar Checklist</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
      {/* Observations Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Observaciones</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
          </View>
          {selectedItem && (
            <Text style={styles.modalItemTitle}>
              {String(selectedItem.descripcion || selectedItem.unidad || 'Item sin nombre')}
            </Text>
          )}
          {selectedItem?.observaciones ? (
            <View style={styles.observationsHistoryContainer}>
              <Text style={styles.observationsHistoryTitle}>Historial:</Text>
              <Text style={styles.observationsHistory}>{String(selectedItem.observaciones)}</Text>
            </View>
          ) : null}
          <Text style={styles.newObservationTitle}>Nueva observación:</Text>
          <TextInput
            style={styles.observationsInput}
            value={newObservation}
            onChangeText={setNewObservation}
            placeholder="Escriba aquí..."
            multiline
            numberOfLines={4}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={saveObservations}
            >
              <Text style={styles.modalSaveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradientBackground: {
    backgroundColor: '#667eea',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginBottom: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 15,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  listWrapper: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    marginTop: -10,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a6cf7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarCompleted: {
    backgroundColor: '#48bb78',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  itemActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  photoButtonRed: {
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
    minWidth: 120,
    alignItems: 'center',
  },
  photoButtonTextRed: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  observationsButtonBlue: {
    backgroundColor: '#4a6cf7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a6cf7',
    minWidth: 120,
    alignItems: 'center',
  },
  observationsButtonTextBlue: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 12,
    color: '#48bb78',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  switchContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#e74c3c',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '400',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    padding: 20,
    borderBottomColor: '#4a6cf7',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a6cf7',
  },
  modalClose: {
    fontSize: 24,
    color: '#718096',
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 20,
  },
  modalItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 20,
    textAlign: 'center',
  },
  observationsInput: {
    borderWidth: 2,
    borderColor: '#4a6cf7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  modalCancelText: {
    textAlign: 'center',
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4a6cf7',
    marginLeft: 10,
  },
  modalSaveText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  observationsHistoryContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  observationsHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a6cf7',
    marginBottom: 12,
  },
  observationsHistory: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  newObservationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a6cf7',
    marginBottom: 12,
  },
  // Estilos para el box de observaciones
  observationsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  observationsBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a6cf7',
    marginBottom: 8,
  },
  observationsBoxText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 12,
  },
});

export default ChecklistScreen;

