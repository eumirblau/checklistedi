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
  const [voiceNativeUnavailable, setVoiceNativeUnavailable] = useState(false);
  
  // Solo usar modal de texto en emuladores/simuladores o si Voice no está disponible
  const isEmulator = !Voice || voiceNativeUnavailable;

  useEffect(() => {
    // Siempre intentar configurar Voice, tanto en desarrollo como en producción
    if (isEmulator) {
      // Si Voice no está disponible, marcar como inicializado para usar modal
      setIsInitialized(true);
      console.log('🧪 VoiceButton: Voice no disponible - usando modal de texto');
      return;
    }

    // Configurar eventos de Voice (desarrollo Y producción)
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

      // Solicitar permisos en Android
      if (Platform.OS === 'android') {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          console.warn('Microphone permission denied');
          setIsInitialized(false);
          return;
        }
        
        // Test rápido para verificar si Voice nativo está disponible
        try {
          await Voice.stop(); // Test básico
          console.log('🎤 Permisos concedidos - Voice nativo verificado');
          setIsInitialized(true);
        } catch (testError) {
          const errorString = testError?.toString() || '';
          if (errorString.includes('startSpeech') || errorString.includes('stopSpeech') || errorString.includes('null')) {
            console.warn('🚫 Voice nativo no disponible - usando modal de texto');
            setVoiceNativeUnavailable(true);
            setIsInitialized(true); // Para usar modal
          } else {
            console.log('🎤 Permisos concedidos - asumiendo Voice disponible');
            setIsInitialized(true);
          }
        }
        return;
      }

      // Para iOS, intentar verificación normal
      try {
        const isAvailableResult = await Voice.isAvailable();
        const available = !!isAvailableResult;
        setIsInitialized(available);
        console.log('Voice availability check result:', available);
      } catch (error) {
        console.log('Voice verification failed, but trying anyway');
        setIsInitialized(true); // Intentar de todas formas
      }
      
    } catch (error) {
      console.error('Error checking voice availability:', error);
      // En caso de error, intentar de todas formas
      setIsInitialized(true);
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('🎤 Solicitando permisos de micrófono...');
      
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permiso de Micrófono',
          message: 'ChecklistApp necesita acceso al micrófono para transcribir tu voz a texto en las observaciones.',
          buttonNeutral: 'Pregúntame después',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Permitir',
        }
      );
      
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('🎤 Permiso de micrófono:', isGranted ? 'CONCEDIDO' : 'DENEGADO');
      
      if (!isGranted) {
        Alert.alert(
          'Permiso requerido',
          'Para usar la transcripción de voz, necesitas permitir el acceso al micrófono en la configuración de la aplicación.',
          [
            { text: 'Entendido', style: 'default' }
          ]
        );
      }
      
      return isGranted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
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
    if (disabled) {
      console.log('Voice button is disabled');
      return;
    }

    try {
      // Verificar permisos en tiempo real para Android
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (!hasPermission) {
          const granted = await requestMicrophonePermission();
          if (!granted) {
            return;
          }
        }
      }

      // Asegurarse de que el reconocimiento anterior esté detenido
      await Voice.stop();
      await Voice.cancel();
      
      setIsListening(true);
      console.log('🎤 FORZANDO inicio de reconocimiento de voz en español...');
      
      // Intentar múltiples variantes de idioma español
      const spanishVariants = ['es-ES', 'es-MX', 'es-AR', 'es'];
      let started = false;
      
      for (const locale of spanishVariants) {
        try {
          await Voice.start(locale);
          console.log(`🎤 Reconocimiento iniciado con idioma: ${locale}`);
          started = true;
          break;
        } catch (localeError) {
          console.warn(`Idioma ${locale} falló, probando siguiente...`);
        }
      }
      
      if (!started) {
        // Último intento con idioma por defecto
        await Voice.start('es');
        console.log('🎤 Reconocimiento iniciado con idioma por defecto: es');
      }
      
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
      
      // Detectar errores específicos de Voice nativo no disponible
      const errorString = error?.toString() || '';
      if (errorString.includes('startSpeech') || errorString.includes('stopSpeech') || errorString.includes('null')) {
        console.warn('🚫 Voice nativo no disponible - cambiando a modal de texto permanentemente');
        setVoiceNativeUnavailable(true);
        setIsInitialized(true); // Para usar modal
        // Abrir directamente el modal sin mostrar error
        showVoiceSimulation();
        return;
      }
      
      // Para otros errores, mostrar opción
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

  const stopListening = async () => {
    try {
      console.log('Stopping voice recognition...');
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
      
      // Detectar errores de Voice nativo no disponible
      const errorString = error?.toString() || '';
      if (errorString.includes('startSpeech') || errorString.includes('stopSpeech') || errorString.includes('null')) {
        console.warn('🚫 Voice nativo no disponible detectado en stop');
        setVoiceNativeUnavailable(true);
      }
    }
  };

  const handlePress = () => {
    // CAMBIO: Verificar si el reconocimiento de voz está disponible
    if (isEmulator || !isInitialized) {
      // Si Voice no está disponible o no se inicializó, usar modal de simulación
      showVoiceSimulation();
    } else {
      // Si Voice está disponible, usar reconocimiento de voz real
      if (isListening) {
        stopListening();
      } else {
        // Pero ofrecer alternativa si falla
        startListeningWithFallback();
      }
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

  // CAMBIO: Siempre mostrar el botón como disponible con fallback a texto
  // En lugar de verificar desarrollo, verificar si Voice está realmente disponible
  const isVoiceAvailable = isInitialized && !isEmulator;
  const buttonText = isVoiceAvailable ? 'Voz' : 'Obs';
  const buttonIcon = isVoiceAvailable ? '🎤' : '✏️';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isListening && styles.listening,
          disabled && styles.disabled,
          !isVoiceAvailable && styles.textMode,
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
              <Text style={styles.micIcon}>{buttonIcon}</Text>
              <Text style={styles.buttonText}>{buttonText}</Text>
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
            <Text style={styles.modalTitle}>
              {isVoiceAvailable ? '💬 Entrada de texto alternativa' : '✏️ Agregar observación'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isVoiceAvailable ? 
                'Escribe tu observación manualmente como alternativa a la voz:' : 
                'Escribe tu observación:'
              }
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
