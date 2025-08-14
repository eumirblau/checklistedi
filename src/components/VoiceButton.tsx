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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationText, setSimulationText] = useState('');
  
  // Para desarrollo/simuladores: siempre usar el modal de texto
  const isDevelopment = __DEV__ || !Voice;

  useEffect(() => {
    if (isDevelopment) {
      // En desarrollo, marcar como inicializado sin verificar Voice
      setIsInitialized(true);
      console.log('🧪 VoiceButton en modo desarrollo - usando modal de texto');
      return;
    }

    // Solo en producción: configurar eventos de Voice
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;

    // Verificar disponibilidad
    checkVoiceAvailability();

    return () => {
      // Cleanup
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  const checkVoiceAvailability = async () => {
    try {
      // Verificar que Voice esté disponible
      if (!Voice) {
        console.warn('Voice module not available');
        setIsInitialized(false);
        return;
      }

      // Verificar diferentes métodos de disponibilidad
      let available = false;
      
      try {
        const isAvailableResult = await Voice.isAvailable();
        available = !!isAvailableResult; // Convertir número/cualquier valor a boolean
      } catch (e) {
        console.log('isAvailable() failed, trying alternative check');
        // Método alternativo: intentar obtener la lista de idiomas
        try {
          const engines = await Voice.getSpeechRecognitionServices();
          available = engines && engines.length > 0;
        } catch (e2) {
          console.log('getSpeechRecognitionServices() also failed');
          available = false;
        }
      }

      setIsInitialized(available);
      console.log('Voice availability check result:', available);
      
      if (!available) {
        console.warn('Voice recognition not available on this device');
      }
    } catch (error) {
      console.error('Error checking voice availability:', error);
      setIsInitialized(false);
    }
  };

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
    if (disabled || !isInitialized) {
      console.log('Voice not initialized or disabled');
      return;
    }

    try {
      // Asegurarse de que el reconocimiento anterior esté detenido
      await Voice.stop();
      await Voice.cancel();
      
      setIsListening(true);
      console.log('Starting voice recognition in Spanish...');
      await Voice.start('es-ES'); // Español de España
      
      // Timeout de seguridad - detener después de 10 segundos
      setTimeout(() => {
        if (isListening) {
          console.log('Voice timeout - stopping recognition');
          stopListening();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      Alert.alert('Error', 'No se pudo iniciar el reconocimiento de voz');
    }
  };

  const stopListening = async () => {
    try {
      console.log('Stopping voice recognition...');
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  };

  const handlePress = () => {
    if (isDevelopment) {
      // En desarrollo, siempre abrir el modal de simulación
      showVoiceSimulation();
    } else {
      // En producción, usar reconocimiento de voz real
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
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

  // En desarrollo, siempre mostrar botón activo
  if (isDevelopment) {
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

  if (!isInitialized) {
    // Mostrar botón informativo cuando no esté disponible
    return (
      <TouchableOpacity
        style={[styles.voiceButton, styles.unavailable, style]}
        onPress={handleUnavailablePress}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.micIcon}>🎤</Text>
          <Text style={[styles.buttonText, { fontSize: 10 }]}>Alt</Text>
        </View>
      </TouchableOpacity>
    );
  }

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
              <Text style={styles.buttonText}>Hablar</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Modal de simulación de voz */}
      <Modal
        visible={showSimulationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSimulationCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Simular entrada de voz</Text>
            <Text style={styles.modalSubtitle}>
              Escribe el texto que quieres agregar (simula lo que dirías por voz):
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={simulationText}
              onChangeText={setSimulationText}
              placeholder="Ej: Revisado y conforme..."
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
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSimulationSubmit}
                disabled={!simulationText.trim()}
              >
                <Text style={styles.submitButtonText}>Agregar</Text>
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
