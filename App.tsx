import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import JefesScreen from './src/screens/JefesScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  console.log('App iniciando...');
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [contador, setContador] = useState(0);
  const [userData, setUserData] = useState(null);
  
  const mostrarAlerta = () => {
    Alert.alert('¡Funciona!', `Has presionado ${contador + 1} veces`);
    setContador(contador + 1);
  };

  const screens = [
    { id: 'login', name: '1. Login', next: 'jefes' },
    { id: 'jefes', name: '2. Jefes', next: 'obras' },
    { id: 'obras', name: '3. Obras', next: 'instalaciones' },
    { id: 'instalaciones', name: '4. Instalaciones', next: 'checklist' },
    { id: 'checklist', name: '5. Checklist', next: 'grupo' },
    { id: 'grupo', name: '6. Grupo Checklist', next: 'menu' },
  ];

  const renderScreen = () => {
    const currentScreenData = screens.find(s => s.id === currentScreen);
    
    if (currentScreen === 'login') {
      // Crear un mock de navigation para LoginScreen
      const mockNavigation = {
        navigate: (screen: string, params?: any) => {
          if (screen === 'Jefes') {
            setUserData(params?.usuario);
            setCurrentScreen('jefes');
          }
        }
      };
      
      return <LoginScreen navigation={mockNavigation} />;
    }
    
    if (currentScreen === 'jefes') {
      // Mock navigation y route para JefesScreen
      const mockNavigation = {
        navigate: (screen: string, params?: any) => {
          if (screen === 'Obras') {
            setCurrentScreen('obras');
          }
        }
      };
      
      const mockRoute = {
        params: {
          usuario: userData || {
            id: '1',
            nombre: 'Usuario de prueba',
            cargo: 'Técnico',
            email: '',
            rol: 'TECNICO'
          }
        }
      };
      
      return <JefesScreen navigation={mockNavigation} route={mockRoute} />;
    }
    
    if (currentScreen === 'obras') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>🏗️ Obras Screen</Text>
          <Text style={styles.subtitle}>Selección de proyecto</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('instalaciones')}>
            <Text style={styles.buttonText}>Continuar → Instalaciones</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>🏠 Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (currentScreen === 'instalaciones') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>⚡ Instalaciones Screen</Text>
          <Text style={styles.subtitle}>Selección de instalación</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('checklist')}>
            <Text style={styles.buttonText}>Continuar → Checklist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>🏠 Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (currentScreen === 'checklist') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>✅ Checklist Screen</Text>
          <Text style={styles.subtitle}>Lista de verificación</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('grupo')}>
            <Text style={styles.buttonText}>Continuar → Grupo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>🏠 Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (currentScreen === 'grupo') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>📊 Grupo Checklist</Text>
          <Text style={styles.subtitle}>Resumen y agrupación</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>✅ Finalizar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>🏠 Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Menu principal
    return (
      <View style={styles.container}>
        <Text style={styles.text}>ChecklistApp - Edhinor</Text>
        <Text style={styles.subtitle}>Menú Principal 🏠</Text>
        <Text style={styles.version}>Flujo completo de navegación</Text>
        
        <TouchableOpacity style={styles.button} onPress={mostrarAlerta}>
          <Text style={styles.buttonText}>Probar Funcionalidad</Text>
        </TouchableOpacity>
        
        <Text style={styles.counter}>Contador: {contador}</Text>
        
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Flujo de pantallas:</Text>
          {screens.map(screen => (
            <TouchableOpacity
              key={screen.id}
              style={styles.menuButton}
              onPress={() => setCurrentScreen(screen.id)}
            >
              <Text style={styles.menuButtonText}>{screen.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  return renderScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#b8c5ff',
    textAlign: 'center',
    marginBottom: 5,
  },
  version: {
    fontSize: 14,
    color: '#d4e2ff',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  counter: {
    fontSize: 16,
    color: '#e8f2ff',
    textAlign: 'center',
    marginBottom: 30,
  },
  menuContainer: {
    width: '100%',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#5a67d8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '80%',
  },
  menuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 15,
  },
});
