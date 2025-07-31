/**
 * ChecklistApp - Aplicación principal
 * Sistema de gestión de checklist para instalaciones
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Importar pantallas
import ChecklistScreen from './src/screens/ChecklistScreen';
import InstalacionesScreen from './src/screens/InstalacionesScreen';
import JefesScreen from './src/screens/JefesScreen';
import LoginScreen from './src/screens/LoginScreen';
import ObrasScreen from './src/screens/ObrasScreen';

// Navegador principal
const App = () => {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [navigationParams, setNavigationParams] = useState({});

  // Objeto de navegación simulado
  const navigation = {
    navigate: (screenName: string, params = {}) => {
      console.log(`Navegando a: ${screenName}`, params);
      setCurrentScreen(screenName);
      setNavigationParams(params);
    },
    replace: (screenName: string, params = {}) => {
      console.log(`Reemplazando con: ${screenName}`, params);
      setCurrentScreen(screenName);
      setNavigationParams(params);
    },
    goBack: () => {
      console.log('Volver atrás');
      setCurrentScreen('Login');
      setNavigationParams({});
    }
  };

  const route = {
    params: navigationParams
  };

  // Renderizar pantalla actual
  const renderCurrentScreen = () => {
    try {
      switch (currentScreen) {        case 'Login':
          return <LoginScreen navigation={navigation} />;
        case 'Jefes':
          return <JefesScreen navigation={navigation} route={{params: navigationParams}} />;
        case 'Obras':
          return <ObrasScreen navigation={navigation} route={{params: navigationParams}} />;
        case 'Instalaciones':
          return <InstalacionesScreen navigation={navigation} route={{params: navigationParams}} />;
        case 'Checklist':
          return <ChecklistScreen navigation={navigation} route={{params: navigationParams}} />;
        default:
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Pantalla no encontrada: {currentScreen}</Text>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => setCurrentScreen('Login')}
              >
                <Text style={styles.backButtonText}>Volver al Login</Text>
              </TouchableOpacity>
            </View>
          );
      }
    } catch (error) {
      console.error('Error renderizando pantalla:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error cargando pantalla</Text>
          <Text style={styles.errorDetail}>{error?.toString()}</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setCurrentScreen('Login')}
          >
            <Text style={styles.backButtonText}>Volver al Login</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };
  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
