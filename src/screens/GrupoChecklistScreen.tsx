import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import PhotoButton from '../components/PhotoButton';
import ApiService from '../services/ApiService';

function GrupoChecklistScreen({ route, navigation }) {
  const params = route?.params || {};
  const grupo = params.grupo || 'Sin grupo';
  
  console.log('🏷️ [PARAMETROS] Grupo recibido por parámetros:', grupo);
  console.log('🏷️ [PARAMETROS] Todos los parámetros:', JSON.stringify(params, null, 2));
  // Extraer spreadsheetId y obraNombre antes del efecto
  const spreadsheetId = params.spreadsheetId;
  const obraNombre = params.obraNombre;
  // Validar que siempre tengamos spreadsheetId real
  React.useEffect(() => {
    const checkSpreadsheetId = async () => {
      if (!spreadsheetId && obraNombre) {
        const resolvedId = await ApiService.mapToRealSpreadsheetId(obraNombre);
        if (resolvedId) {
          params.spreadsheetId = resolvedId;
          // Actualizar navegación para que el resto del flujo use el id correcto
          navigation.setParams({ ...params, spreadsheetId: resolvedId });
        } else {
          Alert.alert('Error', 'No se pudo encontrar el ID de la hoja para esta obra.');
        }
      }
    };
    checkSpreadsheetId();
  }, [spreadsheetId, obraNombre]);
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
  const { instalacionNombre, usuario, jefeNombre } = params;

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
      
      console.log('🔄 [CARGA] spreadsheetId:', spreadsheetId);
      console.log('🔄 [CARGA] instalacionNombre:', instalacionNombre);
      const freshData = await ApiService.getItemsDeChecklist(spreadsheetId, instalacionNombre);
      console.log('🔄 [CARGA] Datos recibidos tras refrescar:', JSON.stringify(freshData, null, 2));
      if (!Array.isArray(freshData) || freshData.length === 0) {
        console.warn('⚠️ [DEBUG] La API devolvió datos vacíos tras refrescar. Mostrando datos locales guardados.');
        if (savedDataCache && Array.isArray(savedDataCache) && savedDataCache.length > 0) {
          setItems(savedDataCache);
        } else {
          setItems([]);
        }
        return;
      }
      // Agrupamiento robusto y filtrado: evitar encabezados y duplicados
      const grupos = [];
      let grupoActual = null;
      let ultimoEncabezado = '';
      const vistosRowIndex = new Set();
      
      console.log('🔍 [DEBUG AGRUPAMIENTO] Empezando agrupamiento con', freshData.length, 'items');
      console.log('🔍 [DEBUG AGRUPAMIENTO] Grupo buscado:', grupo);
      
      for (const item of freshData) {
        const unidad = item.unidad?.trim() || '';
        const descripcion = item.descripcion?.trim().toUpperCase() || '';
        const esEncabezado = unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2;
        
        console.log(`🔍 [DEBUG AGRUPAMIENTO] Item: unidad="${unidad}", descripcion="${descripcion}", esEncabezado=${esEncabezado}`);
        
        if (
          unidad && esEncabezado && unidad !== ultimoEncabezado
          || ["EXISTENTE NO SE MODIFICA","NO ES MOTIVO DE LA OBRA","NO SE HA INICIADO","OBSERVACIONES/ANOTACIONES","FIRMAS"].includes(descripcion)
        ) {
          grupoActual = { encabezado: unidad || descripcion, items: [] };
          grupos.push(grupoActual);
          ultimoEncabezado = unidad || descripcion;
          console.log(`✅ [DEBUG AGRUPAMIENTO] Nuevo grupo creado: "${grupoActual.encabezado}"`);
        } else if (grupoActual) {
          // Solo agregar si el rowIndex no está repetido
          if (!vistosRowIndex.has(item.rowIndex)) {
            grupoActual.items.push(item);
            vistosRowIndex.add(item.rowIndex);
            console.log(`➕ [DEBUG AGRUPAMIENTO] Item agregado al grupo "${grupoActual.encabezado}": ${item.unidad}`);
          } else {
            console.warn('⚠️ [DEBUG] Duplicado rowIndex detectado en carga:', item.rowIndex, item);
          }
        }
      }
      
      console.log('🔍 [DEBUG AGRUPAMIENTO] Grupos encontrados:', grupos.map(g => `"${g.encabezado}" (${g.items.length} items)`));
      
      const normalizar = str => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
      const grupoEncontrado = grupos.find(g => normalizar(g.encabezado) === normalizar(grupo));
      
      console.log('🔍 [DEBUG AGRUPAMIENTO] Grupo normalizado buscado:', normalizar(grupo));
      console.log('🔍 [DEBUG AGRUPAMIENTO] Grupos normalizados disponibles:', grupos.map(g => normalizar(g.encabezado)));
      console.log('🔍 [DEBUG AGRUPAMIENTO] Grupo encontrado:', grupoEncontrado ? `"${grupoEncontrado.encabezado}" con ${grupoEncontrado.items.length} items` : 'NO ENCONTRADO');
        // LOG EXTRA: Mostrar items recibidos para depuración
        console.log('🟣 [GrupoChecklistScreen] Items recibidos tras filtro:', JSON.stringify(grupoEncontrado ? grupoEncontrado.items : [], null, 2));
        // LOG de observaciones y estado de check
        let itemsFiltrados = [];
        if (grupoEncontrado && Array.isArray(grupoEncontrado.items)) {
          // Filtrado robusto: solo ítems chequeables, nunca encabezados ni duplicados
          const vistos = new Set();
          itemsFiltrados = grupoEncontrado.items.filter(item => {
            const idUnico = item.rowIndex || item.id;
            const descripcion = (item.descripcion || '').trim().toLowerCase();
            const unidad = (item.unidad || '').trim();
            const esEncabezado = unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2;
            const valido = !vistos.has(idUnico) && descripcion !== 'no check' && unidad !== '' && !esEncabezado;
            if (valido) {
              vistos.add(idUnico);
            } else if (vistos.has(idUnico)) {
              console.warn('⚠️ [DEBUG] Duplicado rowIndex detectado en filtrado:', idUnico, item);
            }
            return valido;
          });
          // Log de rowIndex únicos
          const rowIndexes = itemsFiltrados.map(item => item.rowIndex);
          const rowIndexesSet = new Set(rowIndexes);
          if (rowIndexes.length !== rowIndexesSet.size) {
            console.error('❌ [DEBUG] ¡Se detectaron rowIndex duplicados en itemsFiltrados!', rowIndexes);
          } else {
            console.log('✅ [DEBUG] Todos los rowIndex son únicos en itemsFiltrados:', rowIndexes);
          }
        }
        
        console.log('🔍 [DEBUG] Items antes del mapeo final:', itemsFiltrados.length);
        itemsFiltrados.forEach((item, index) => {
          console.log(`🔍 [DEBUG] Item ${index}: completado=${item.completado}, observaciones="${item.observaciones}"`);
        });
        
        // Asegurar que se muestra el historial completo de observaciones y el check como completado si corresponde
        const itemsMejorados = itemsFiltrados.map(item => ({
          ...item,
          id: String(item.rowIndex),
          observaciones: item.observaciones || '',
          completado: item.s_contrato === '√' || item.s_contrato_cross === 'X',
          fechapp: item.fechapp || '',
        }));
        
        console.log('✅ [DEBUG] Items después del mapeo final:', itemsMejorados.length);
        itemsMejorados.forEach((item, index) => {
          console.log(`✅ [DEBUG] Item ${index}: completado=${item.completado}, observaciones="${item.observaciones}"`);
        });
        // Log final antes de renderizar
        console.log('🔵 [RENDER] Array final de items a mostrar:', itemsMejorados.map(item => ({
          rowIndex: item.rowIndex,
          unidad: item.unidad,
          descripcion: item.descripcion,
          completado: item.completado,
          observaciones: item.observaciones,
          fechapp: item.fechapp
        })));
        setItems(itemsMejorados);
        setSavedDataCache(itemsMejorados);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setItems([]);
    }
  }, [spreadsheetId, instalacionNombre, grupo, justSaved]);

  // Cargar los ítems solo al montar la pantalla
  React.useEffect(() => {
    loadGroupItems();
  }, []);

  

  // Verificar datos cacheados cuando la pantalla se enfoca (regresa a ella)
  // Refresco manual: solo se recarga desde la hoja si el usuario lo solicita

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
          String(item.rowIndex) === String(selectedItem.rowIndex)
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
        if (String(i.rowIndex) === String(itemId)) {
          const newCompletado = !i.completado;
          const currentDate = new Date().toLocaleDateString('es-ES');
          const userName = usuario?.nombre || usuario || 'Usuario';
          console.log(`✅ [TOGGLE] Item ${itemId}: ${i.completado ? 'DESMARCADO' : 'MARCADO'}`);
          return {
            ...i,
            completado: newCompletado,
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
    console.log('📋 [GUARDAR] spreadsheetId:', spreadsheetId);
    console.log('🏢 [GUARDAR] instalacionNombre:', instalacionNombre);
    console.log('👤 [GUARDAR] usuario:', usuario);
    console.log('🏗️ [GUARDAR] obraNombre:', obraNombre);
    console.log('📝 [GUARDAR] items a guardar:', JSON.stringify(items, null, 2));
    
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
      // Filtrar solo ítems chequeables antes de guardar
        // Filtrado robusto: solo ítems chequeables, nunca encabezados ni duplicados
        const vistosRowIndex = new Set();
        const itemsChequeables = items.filter(item => {
          const descripcion = (item.descripcion || '').trim().toLowerCase();
          const unidad = (item.unidad || '').trim();
          const esEncabezado = unidad === unidad.toUpperCase() && !/\d/.test(unidad) && unidad.length > 2;
          const valido = descripcion !== 'no check' && unidad !== '' && !esEncabezado && item.rowIndex && !vistosRowIndex.has(item.rowIndex);
          if (valido) {
            vistosRowIndex.add(item.rowIndex);
          } else if (vistosRowIndex.has(item.rowIndex)) {
            console.warn('⚠️ [DEBUG] Duplicado rowIndex detectado:', item.rowIndex, item);
          }
          return valido;
        });
        // Log de rowIndex únicos
        const rowIndexes = itemsChequeables.map(item => item.rowIndex);
        const rowIndexesSet = new Set(rowIndexes);
        if (rowIndexes.length !== rowIndexesSet.size) {
          console.error('❌ [DEBUG] ¡Se detectaron rowIndex duplicados en itemsChequeables!', rowIndexes);
        } else {
          console.log('✅ [DEBUG] Todos los rowIndex son únicos en itemsChequeables:', rowIndexes);
        }
        console.log('🟢 [DEBUG] Items chequeables enviados al backend:', itemsChequeables.map(item => ({
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
        itemsChequeables.map(item => ({
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

      // Actualizar el estado local inmediatamente con los datos guardados
      const savedData = items.map(item => ({
        ...item,
        observaciones: item.observaciones || '',
        completado: item.completado || false,
        fechapp: item.fechapp || '',
      }));
  setItems(savedData);
  setSavedDataCache(savedData);
  console.log('💾 [CACHE] Datos guardados cacheados:', savedData.length, 'items');
  // No refrescar automáticamente tras guardar; solo al entrar o cambiar de grupo

      // Guardar también en AsyncStorage para persistencia completa
      await saveToAsyncStorage(savedData);
      console.log('📱 [ASYNC] Datos guardados en AsyncStorage');

      // También actualizar los parámetros de navegación con los datos cacheados
      navigation.setParams({ cachedItems: savedData });
      console.log('🧭 [NAVIGATION] Parámetros actualizados con cache para futuras navegaciones');

      Alert.alert('Guardado exitoso', 'Los cambios se han guardado correctamente.');

      // Refrescar desde la API después de un delay mayor para asegurar que Google Sheets procese los cambios
      setTimeout(() => {
        console.log('🔄 [DEBUG] Refrescando datos desde la API tras guardar...');
        loadGroupItems();
      }, 7000);
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
            <View key={item.rowIndex} style={styles.itemCard}>
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
                onPress={() => {
                  console.log('🎯 [CLICK] TouchableOpacity presionado para item:', item.rowIndex);
                  console.log('🎯 [CLICK] Item completo:', JSON.stringify(item, null, 2));
                  handleCheckboxChange(item.rowIndex);
                }}
                activeOpacity={0.7}
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
  }
});

export default GrupoChecklistScreen;
