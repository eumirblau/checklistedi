import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
        jefeGrupo: jefeNombre || 'sin-jefe',
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
  const [items, setItems] = React.useState([]);
  const [itemPhotos, setItemPhotos] = React.useState(params.itemPhotos || {});
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false); // Prevenir recargas automáticas después del guardado
  const [savedDataCache, setSavedDataCache] = React.useState(null); // Cache de datos guardados exitosamente

  // Extraer parámetros necesarios para guardar
  const { spreadsheetId, instalacionNombre, usuario, obraNombre, jefeNombre } = params;

  // Clave única para AsyncStorage basada en la ubicación del checklist
  const storageKey = `checklist_${spreadsheetId}_${instalacionNombre}_${grupo}`;

  // Funciones para persistencia con AsyncStorage
  const saveToAsyncStorage = async (data) => {
    try {
      console.log('💾 [ASYNC] Guardando en AsyncStorage:', storageKey, data.length, 'items');
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ [ASYNC] Error guardando en AsyncStorage:', error);
    }
  };

  const loadFromAsyncStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('📱 [ASYNC] Cargando desde AsyncStorage:', storageKey, data.length, 'items');
        return data;
      }
    } catch (error) {
      console.error('❌ [ASYNC] Error cargando desde AsyncStorage:', error);
    }
    return null;
  };

  // 🔍 DEBUG: Verificar usuario que llega
  console.log('🔍 [GrupoChecklistScreen] DEBUG USUARIO RECIBIDO:', {
    usuario_completo: usuario,
    es_objeto: typeof usuario === 'object',
    propiedades: typeof usuario === 'object' ? Object.keys(usuario) : 'N/A',
    nombre: usuario?.nombre,
    cargo: usuario?.cargo
  });

  // Siempre cargar datos frescos desde Google Sheets al entrar y después de guardar
  const loadGroupItems = React.useCallback(async () => {
    try {
      console.log('🔄 [GrupoChecklistScreen] Cargando datos frescos desde Google Sheets...');
      
      // Si acabamos de guardar, no recargar automáticamente para evitar sobrescribir los datos locales
      if (justSaved) {
        console.log('⚠️ [GrupoChecklistScreen] Saltando recarga automática - acabamos de guardar');
        return;
      }
      
      const freshData = await ApiService.getItemsDeChecklist(spreadsheetId, instalacionNombre);
      if (!Array.isArray(freshData) || freshData.length === 0) {
        setItems([]);
        return;
      }
      // Agrupar y filtrar el grupo actual
      const grupos = [];
      let grupoActual = null;
      let ultimoEncabezado = '';
      for (const item of freshData) {
        const unidad = item.unidad?.trim() || '';
        const descripcion = item.descripcion?.trim().toUpperCase() || '';
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
        const grupoEncontrado = grupos.find(g => g.encabezado === grupo);
        // LOG EXTRA: Mostrar items recibidos para depuración
        console.log('🟣 [GrupoChecklistScreen] Items recibidos tras filtro:', JSON.stringify(grupoEncontrado ? grupoEncontrado.items : [], null, 2));
        // LOG de observaciones y estado de check
        (grupoEncontrado ? grupoEncontrado.items : []).forEach(item => {
          console.log(`🟣 [GrupoChecklistScreen] Item: ${item.unidad || item.descripcion}`);
          console.log(`   📝 Observaciones: "${item.observaciones}"`);
          console.log(`   ✅ Completado: ${item.completado} (tipo: ${typeof item.completado})`);
          console.log(`   📅 fechapp: "${item.fechapp}"`);
          console.log(`   🏗️ s_contrato: "${item.s_contrato}"`);
        });
        const itemsFiltrados = grupoEncontrado
          ? grupoEncontrado.items.filter(item => (item.descripcion || '').trim().toLowerCase() !== 'no check')
          : [];
        
        console.log('🔍 [DEBUG] Items antes del mapeo final:', itemsFiltrados.length);
        itemsFiltrados.forEach((item, index) => {
          console.log(`🔍 [DEBUG] Item ${index}: completado=${item.completado}, observaciones="${item.observaciones}"`);
        });
        
        // Asegurar que se muestra el historial completo de observaciones y el check como completado si corresponde
        const itemsMejorados = itemsFiltrados.map(item => ({
          ...item,
          observaciones: item.observaciones || '',
          completado: Boolean(item.completado),
          fechapp: item.fechapp || '',
        }));
        
        console.log('✅ [DEBUG] Items después del mapeo final:', itemsMejorados.length);
        itemsMejorados.forEach((item, index) => {
          console.log(`✅ [DEBUG] Item ${index}: completado=${item.completado}, observaciones="${item.observaciones}"`);
        });
        setItems(itemsMejorados);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setItems([]);
    }
  }, [spreadsheetId, instalacionNombre, grupo, justSaved]);

  // ✅ APK ORIGINAL: Solo cargar datos al montar el componente
  React.useEffect(() => {
    const initializeData = async () => {
      // 1. Intentar cargar desde AsyncStorage primero
      const storedData = await loadFromAsyncStorage();
      if (storedData && Array.isArray(storedData) && storedData.length > 0) {
        console.log('📱 [INIT] Usando datos de AsyncStorage:', storedData.length, 'items');
        setItems(storedData);
        setSavedDataCache(storedData);
        return;
      }

      // 2. Si hay datos cacheados en los parámetros de navegación, usarlos
      if (params.cachedItems && Array.isArray(params.cachedItems)) {
        console.log('💾 [INIT] Usando datos cacheados de navegación:', params.cachedItems.length, 'items');
        setItems(params.cachedItems);
        setSavedDataCache(params.cachedItems);
        // Guardar también en AsyncStorage para futuras sesiones
        await saveToAsyncStorage(params.cachedItems);
        return;
      }

      // 3. Solo cargar datos frescos si no hay ningún cache
      if (items.length === 0) {
        console.log('🌐 [INIT] Cargando datos frescos desde servidor...');
        loadGroupItems();
      }
    };

    initializeData();
  }, []); // Solo ejecutar una vez al montar

  // Verificar datos cacheados cuando la pantalla se enfoca (regresa a ella)
  useFocusEffect(
    React.useCallback(() => {
      const restoreDataOnFocus = async () => {
        // Si no hay datos cargados, intentar restaurar desde AsyncStorage
        if (items.length === 0) {
          const storedData = await loadFromAsyncStorage();
          if (storedData && Array.isArray(storedData) && storedData.length > 0) {
            console.log('🔄 [FOCUS ASYNC] Restaurando desde AsyncStorage:', storedData.length, 'items');
            setItems(storedData);
            setSavedDataCache(storedData);
            return;
          }

          // Fallback al cache en memoria
          if (savedDataCache && Array.isArray(savedDataCache)) {
            console.log('🔄 [FOCUS CACHE] Restaurando desde savedDataCache:', savedDataCache.length, 'items');
            setItems(savedDataCache);
          }
        }
      };

      restoreDataOnFocus();
    }, [items.length, savedDataCache])
  );

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
      // Formato fecha: DD/MM/AA HH:MM + nombre usuario
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${day}/${month}/${year} ${hours}:${minutes} - ${usuario?.nombre || usuario || 'Usuario'}`;
      
      // 🐛 DEBUG: Ver qué timestamp se está generando
      console.log('🕐 [DEBUG TIMESTAMP] Timestamp generado:', timestamp);
      console.log('🕐 [DEBUG TIMESTAMP] Usuario:', usuario);
      
      const updatedObservations = selectedItem.observaciones 
        ? `${selectedItem.observaciones}\n[${timestamp}] ${newObservation.trim()}`
        : `[${timestamp}] ${newObservation.trim()}`;
      
      console.log('🔍 [DEBUG OBSERVACIONES] Añadiendo observación:');
      console.log('   📝 Item:', selectedItem.unidad || selectedItem.descripcion);
      console.log('   📝 Observaciones ANTES:', `"${selectedItem.observaciones || 'VACÍAS'}"`);
      console.log('   📝 Nueva observación:', `"${newObservation.trim()}"`);
      console.log('   📝 Resultado DESPUÉS:', `"${updatedObservations}"`);
        
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedItem.id
            ? { ...item, observaciones: updatedObservations }
            : item
        )
      );
      
      setNewObservation(''); // Limpiar el campo después de agregar
      setModalVisible(false); // Cerrar modal
      
      console.log('✅ [DEBUG] Observación añadida al estado local. Recuerda GUARDAR.');
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
            fechapp: newCompletado ? currentDate : '',
            usuarioCompletado: newCompletado ? userName : ''
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
    console.log('� [GrupoChecklistScreen] Iniciando guardado...');
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
      // Log de los datos que se van a guardar
      console.log('🟡 [DEBUG] Items que se van a guardar:', items.map(item => ({
        id: item.id,
        unidad: item.unidad,
        descripcion: item.descripcion,
        completado: item.completado,
        observaciones: item.observaciones,
        fechapp: item.fechapp,
        rowIndex: item.rowIndex
      })));
      const result = await ApiService.guardarChecks(
        obraNombre,
        instalacionNombre,
        items.map(item => ({
          ...item,
          observaciones: item.observaciones || '',
          completado: item.completado || false,
          fechapp: item.fechapp || '',
        })),
        usuario.nombre || usuario,
        usuario.cargo || 'Sin cargo',
        obraNombre
      );
      console.log('🟢 [DEBUG] Respuesta de la API guardarChecks:', result);
      
      // Cachear los datos guardados exitosamente
      const savedData = items.map(item => ({
        ...item,
        observaciones: item.observaciones || '',
        completado: item.completado || false,
        fechapp: item.fechapp || '',
      }));
      setSavedDataCache(savedData);
      console.log('💾 [CACHE] Datos guardados cacheados:', savedData.length, 'items');
      
      // Guardar también en AsyncStorage para persistencia completa
      await saveToAsyncStorage(savedData);
      console.log('📱 [ASYNC] Datos guardados en AsyncStorage');
      
      // También actualizar los parámetros de navegación con los datos cacheados
      navigation.setParams({ cachedItems: savedData });
      console.log('🧭 [NAVIGATION] Parámetros actualizados con cache para futuras navegaciones');
      
      // Marcar que acabamos de guardar para evitar recargas automáticas
      setJustSaved(true);
      
      Alert.alert('Guardado exitoso', 'Los cambios se han guardado correctamente.');
      
      // Aumentar el tiempo de espera para que Google Sheets procese los cambios
      console.log('⏰ [DEBUG] Esperando 5 segundos antes de permitir recargas automáticas...');
      setTimeout(() => {
        console.log('🔄 [DEBUG] Permitiendo recargas automáticas de nuevo...');
        setJustSaved(false);
      }, 5000);
    } catch (error) {
      console.error('❌ Error guardando checklist:', error);
      Alert.alert('Error al guardar', `No se pudieron guardar los cambios: ${error.message || error}`, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={async () => {
            // Guardar datos en AsyncStorage antes de volver
            if (items.length > 0) {
              console.log('🔄 Guardando datos antes de volver');
              console.log('🔄 Datos a guardar:', items.length, 'items');
              
              // Guardar en AsyncStorage para persistencia completa
              await saveToAsyncStorage(items);
              
              // También mantener el cache en memoria y navegación
              setSavedDataCache(items);
              navigation.setParams({ cachedItems: items });
              
              console.log('💾 Datos guardados en AsyncStorage, cache local y parámetros de navegación');
            }
            navigation.goBack();
          }} style={styles.backButton}>
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
                  jefeGrupo={jefeNombre || 'sin-jefe'}
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
