// ✅ SCRIPT PARA LIMPIAR ASYNCSTORAGE
// Usar este script para eliminar todos los datos cacheados

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAsyncStorage = async () => {
  try {
    console.log('🧹 [CLEAR] Limpiando AsyncStorage...');
    
    // Obtener todas las claves
    const keys = await AsyncStorage.getAllKeys();
    console.log('🔍 [CLEAR] Claves encontradas:', keys);
    
    // Filtrar solo las claves de checklist
    const checklistKeys = keys.filter(key => key.includes('checklist_'));
    console.log('🗑️ [CLEAR] Claves de checklist a eliminar:', checklistKeys);
    
    if (checklistKeys.length > 0) {
      await AsyncStorage.multiRemove(checklistKeys);
      console.log('✅ [CLEAR] AsyncStorage limpiado exitosamente');
    } else {
      console.log('ℹ️ [CLEAR] No se encontraron datos de checklist en AsyncStorage');
    }
    
    return true;
  } catch (error) {
    console.error('❌ [CLEAR] Error limpiando AsyncStorage:', error);
    return false;
  }
};

export const clearAllAsyncStorageComplete = async () => {
  try {
    console.log('🧹 [CLEAR ALL] Limpiando TODO AsyncStorage...');
    await AsyncStorage.clear();
    console.log('✅ [CLEAR ALL] AsyncStorage completamente limpiado');
    return true;
  } catch (error) {
    console.error('❌ [CLEAR ALL] Error limpiando AsyncStorage:', error);
    return false;
  }
};
