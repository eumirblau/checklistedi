import Voice, {
    SpeechErrorEvent,
    SpeechRecognizedEvent,
    SpeechResultsEvent,
} from '@react-native-voice/voice';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    console.error('❌ Error de reconocimiento de voz:', e.error);
    setIsListening(false);
    
    let errorMessage = 'Error en el reconocimiento de voz';
    switch (e.error?.code) {
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
        errorMessage = `Error: ${e.error?.message || 'Desconocido'}`;
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

  const startListening = async () => {
    if (disabled) {
      console.log('Voice button is disabled');
      return;
    }

    try {
      // Android: verificar/solicitar permiso de micrófono antes de iniciar
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (!hasPermission) {
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
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Permiso de micrófono no concedido');
            return;
          }
        }
      }
      setIsListening(true);
      console.log('🎤 Iniciando reconocimiento de voz...');
      
      // Verificar si Voice y sus métodos están disponibles
      console.log('Voice object:', Voice);
      console.log('Voice.start:', Voice?.start);
      console.log('Voice methods available:', Object.keys(Voice || {}));
      
      // Intentar diferentes métodos de inicio
      if (Voice && typeof Voice.start === 'function') {
        await Voice.start('es-ES');
        console.log('🎤 Reconocimiento iniciado con Voice.start');
      } else {
        console.error('Voice.start no está disponible');
        setIsListening(false);
      }
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      console.log('⏹️ Deteniendo reconocimiento de voz...');
      await Voice.stop();
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
