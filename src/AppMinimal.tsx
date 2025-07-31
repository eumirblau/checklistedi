import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import SimpleCameraTest from './components/SimpleCameraTest';

const AppMinimal = () => {
  const testNativeModule = () => {
    console.log('Testing native module access...');
    Alert.alert('Test', 'Testing native module registration');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ChecklistApp - Test Mínimo</Text>
      <Text style={styles.subtitle}>Prueba de SimpleCameraModule</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={testNativeModule}>
        <Text style={styles.buttonText}>Test Alert</Text>
      </TouchableOpacity>
      
      <SimpleCameraTest />
      
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Si ves este contenido, React Native está funcionando correctamente.
        </Text>
        <Text style={styles.infoText}>
          El botón de arriba debería probar SimpleCameraModule.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
    color: '#555',
  },
});

export default AppMinimal;
