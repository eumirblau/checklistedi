import Voice, {
    SpeechErrorEvent,
    SpeechRecognizedEvent,
    SpeechResultsEvent,
} from '@react-native-voice/voice';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  style?: any;
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscription,
  style,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationText, setSimulationText] = useState('');
  const [forceVoiceMode, setForceVoiceMode] = useState(false);
  
  // Solo usar modal de texto si Voice realmente no existe o está forzado
  const isEmulator = !Voice;

  useEffect(() => {
    // Configurar eventos de Voice
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
  Voice.onSpeechPartialResults = onSpeechPartialResults;

    console.log('🎤 VoiceButton inicializado');

    return () => {
      // Cleanup
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  const onSpeechStart = (e: any) => {
    console.log('🎤 Iniciando reconocimiento de voz');
    setIsListening(true);
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {
    console.log('🔊 Voz reconocida');
  };

  const onSpeechEnd = (e: any) => {
    console.log('⏹️ Finalizando reconocimiento de voz');
    setIsListening(false);
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
  console.error('❌ Error de reconocimiento de voz:', e?.error);
    setIsListening(false);
    
    let errorMessage = 'Error en el reconocimiento de voz';
  switch (e?.error?.code) {
      case '2':
        errorMessage = 'Red no disponible';
        break;
      case '7':
        errorMessage = 'No se detectó audio';
        break;
      case '6':
        errorMessage = 'Sin permisos de micrófono';
        break;
      default:
    errorMessage = `Error: ${e?.error?.message || 'Desconocido'}`;
    }
    
    Alert.alert('Error de Voz', errorMessage);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('✅ Resultados de voz:', e.value);
    if (e.value && e.value.length > 0) {
      const transcription = e.value[0];
      onTranscription(transcription);
    }
    setIsListening(false);
  };

  const onSpeechPartialResults = (e: any) => {
    console.log('📝 Parciales:', e?.value);
    // Optional UI handling
  };

  const resetVoiceSession = async () => {
    try {
      if (!Voice) return;
      if (typeof Voice.stop === 'function') {
        await Voice.stop();
      }
      if (typeof (Voice as any).cancel === 'function') {
        await (Voice as any).cancel();
      }
      if (typeof Voice.destroy === 'function') {
        await Voice.destroy();
      }
      if (typeof Voice.removeAllListeners === 'function') {
        Voice.removeAllListeners();
      }
    } catch (e) {
      console.warn('Error reseteando sesión de voz', e);
    } finally {
      // Re-registrar listeners tras reset
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechRecognized = onSpeechRecognized;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechPartialResults;
    }
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permiso de micrófono',
          message:
            'ChecklistApp necesita usar el micrófono para transcribir tu voz en observaciones.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permiso de micrófono bloqueado',
          'Para usar la voz, activa el permiso de micrófono en Ajustes > Apps > ChecklistApp > Permisos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Ajustes',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        Alert.alert('Permiso requerido', 'No se concedió el permiso de micrófono.');
      }
      return false;
    } catch (e) {
      console.warn('Error comprobando/solicitando permiso de micrófono', e);
      return false;
    }
  };

  const startListening = async () => {
    if (disabled) {
      console.log('Voice button is disabled');
      return;
    }

    try {
      // Verificar disponibilidad del servicio de voz si la API existe
      if (Voice && typeof (Voice as any).isAvailable === 'function') {
        try {
          const available = await (Voice as any).isAvailable();
          if (!available) {
            Alert.alert(
              'Reconocimiento no disponible',
              'No hay servicio de reconocimiento de voz disponible en este dispositivo. Asegúrate de tener "Speech Services by Google" o la app de Google actualizada y activa.'
            );
            return;
          }
        } catch (e) {
          console.warn('No se pudo verificar disponibilidad de voz', e);
        }
      }

      // Android: verificar/solicitar permiso con manejo de never_ask_again
      const permissionOk = await requestMicPermission();
      if (!permissionOk) return;
      console.log('🎤 Preparando reconocimiento de voz...');
      
      // Verificar si Voice y sus métodos están disponibles
      if (!Voice || typeof Voice.start !== 'function') {
        console.error('Voice.start no está disponible');
        setIsListening(false);
        return;
      }
      // Intentar con varios locales de español por compatibilidad
      const locales = ['es-ES', 'es-MX', 'es-AR', 'es-419'];
      const startOptions: any = {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_MAX_RESULTS: 3,
        EXTRA_PREFER_OFFLINE: false,
        // Algunos dispositivos aceptan definir el engine como 'google'
        RECOGNIZER_ENGINE: 'google',
      };
      let started = false;
      let lastError: any = null;
      for (const locale of locales) {
        try {
          await resetVoiceSession();
          setIsListening(true);
          console.log(`🎤 Intentando iniciar reconocimiento con locale ${locale}...`);
          // pequeña espera para asegurar estado del audio tras permisos/reset
          await new Promise(res => setTimeout(res, 150));
          await Voice.start(locale, startOptions);
          console.log(`🎤 Reconocimiento iniciado con ${locale}`);
          started = true;
          break;
        } catch (err) {
          console.warn(`Fallo iniciando con ${locale}:`, err);
          lastError = err;
          setIsListening(false);
          // Reintentar rápidamente con el siguiente locale
        }
      }

      if (!started) {
        console.error('No se pudo iniciar el reconocimiento con ninguno de los locales', lastError);
        Alert.alert(
          'No se pudo iniciar',
          'No se pudo iniciar el reconocimiento de voz. Verifica que el micrófono funciona y que el servicio de voz de Google esté instalado/actualizado.'
        );
        return;
      }
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      console.log('⏹️ Deteniendo reconocimiento de voz...');
      if (Voice && typeof Voice.stop === 'function') {
        await Voice.stop();
      }
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  };

  const handlePress = () => {
    // Activar voz directamente como funcionaba originalmente
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const forceVoiceRecognition = async () => {
    console.log('🔥 FORZANDO reconocimiento de voz - ignorando verificaciones');
    setForceVoiceMode(true);
    setVoiceUnavailable(false);
    setIsInitialized(true);
    
    // Configurar eventos forzadamente
    if (Voice) {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechRecognized = onSpeechRecognized;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechResults = onSpeechResults;
    }
    
    // Intentar directamente
    try {
      await startListening();
    } catch (error) {
      console.error('🔥 Modo forzado también falló:', error);
      Alert.alert('Error', 'El reconocimiento de voz no está disponible en este dispositivo.');
      setForceVoiceMode(false);
    }
  };

  const startListeningWithFallback = async () => {
    try {
      await startListening();
    } catch (error) {
      console.warn('Voice recognition failed, offering text alternative:', error);
      Alert.alert(
        'Reconocimiento de voz no disponible',
        'No se pudo iniciar el reconocimiento de voz en este momento. ¿Te gustaría escribir tu observación manualmente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Escribir observación', 
            style: 'default',
            onPress: () => showVoiceSimulation()
          }
        ]
      );
    }
  };

  const handleUnavailablePress = () => {
    Alert.alert(
      'Reconocimiento de voz no disponible',
      'El reconocimiento de voz no está disponible en este dispositivo. Esto puede ocurrir en:\n\n• Emuladores/simuladores\n• Dispositivos sin Google Play Services\n• Dispositivos con permisos restringidos\n\n¿Te gustaría simular la entrada de voz?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Simular voz', 
          style: 'default',
          onPress: () => showVoiceSimulation()
        }
      ]
    );
  };

  const showVoiceSimulation = () => {
    setSimulationText('');
    setShowSimulationModal(true);
  };

  const handleSimulationSubmit = () => {
    if (simulationText.trim()) {
      onTranscription(simulationText.trim());
      setShowSimulationModal(false);
      setSimulationText('');
    }
  };

  const handleSimulationCancel = () => {
    setShowSimulationModal(false);
    setSimulationText('');
  };

  // Si Voice no está disponible, mostrar botón para modal de texto
  if (isEmulator) {
    return (
      <>
        <TouchableOpacity
          style={[styles.voiceButton, styles.development, style]}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={[styles.buttonText, { fontSize: 11 }]}>Test</Text>
          </View>
        </TouchableOpacity>

        {/* Modal de simulación */}
        <Modal
          visible={showSimulationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleSimulationCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>💬 Entrada de texto por voz</Text>
              <Text style={styles.modalSubtitle}>
                Escribe lo que quieres agregar (simula tu observación hablada):
              </Text>
              
              <TextInput
                style={styles.modalInput}
                value={simulationText}
                onChangeText={setSimulationText}
                placeholder="Ej: Todo revisado y conforme, sin observaciones..."
                multiline={true}
                numberOfLines={3}
                autoFocus={true}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleSimulationCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.submitButton,
                    !simulationText.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={handleSimulationSubmit}
                  disabled={!simulationText.trim()}
                >
                  <Text style={[
                    styles.submitButtonText,
                    !simulationText.trim() && { opacity: 0.5 }
                  ]}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Siempre mostrar botón de voz normal
  return (
    <>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isListening && styles.listening,
          disabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          {isListening ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Escuchando...</Text>
            </>
          ) : (
            <>
              <Text style={styles.micIcon}>🎤</Text>
              <Text style={styles.buttonText}>HABLAR</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Modal de observaciones - siempre disponible como alternativa */}
      <Modal
        visible={showSimulationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSimulationCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Agregar observación</Text>
            <Text style={styles.modalSubtitle}>Escribe tu observación:</Text>
            
            <TextInput
              style={styles.modalInput}
              value={simulationText}
              onChangeText={setSimulationText}
              placeholder="Ej: Todo revisado y conforme, sin observaciones..."
              multiline={true}
              numberOfLines={3}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleSimulationCancel}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  !simulationText.trim() && styles.submitButtonDisabled
                ]}
                onPress={handleSimulationSubmit}
                disabled={!simulationText.trim()}
              >
                <Text style={[
                  styles.submitButtonText,
                  !simulationText.trim() && { opacity: 0.5 }
                ]}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  voiceButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listening: {
    backgroundColor: '#f44336',
  },
  disabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  textMode: {
    backgroundColor: '#FF9800', // Color naranja para modo texto
  },
  unavailable: {
    backgroundColor: '#ff9800',
    borderWidth: 1,
    borderColor: '#f57c00',
  },
  development: {
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default VoiceButton;
