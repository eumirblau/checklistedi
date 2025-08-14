// ✅ SCRIPT PARA LIMPIAR ASYNCSTORAGE
// Usar este script para eliminar todos los datos cacheados

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAsyncStorage = async () => {
  try {
    // Obtener todas las claves
    const keys = await AsyncStorage.getAllKeys();
    
    // Filtrar solo las claves de checklist
    const checklistKeys = keys.filter(key => key.includes('checklist_'));
    
    if (checklistKeys.length > 0) {
      await AsyncStorage.multiRemove(checklistKeys);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const clearAllAsyncStorageComplete = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    return false;
  }
};
