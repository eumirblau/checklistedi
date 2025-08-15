import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  console.log('App iniciando...');
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [contador, setContador] = useState(0);
  
  const mostrarAlerta = () => {
    Alert.alert('¡Funciona!', `Has presionado ${contador + 1} veces`);
    setContador(contador + 1);
  };

  const screens = [
    { id: 'login', name: 'Login' },
    { id: 'obras', name: 'Obras' },
    { id: 'checklist', name: 'Checklist' },
  ];

  const renderScreen = () => {
    if (currentScreen === 'login') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Login Screen</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>Volver al Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (currentScreen === 'obras') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Obras Screen</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>Volver al Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (currentScreen === 'checklist') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Checklist Screen</Text>
          <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('menu')}>
            <Text style={styles.buttonText}>Volver al Menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Menu principal
    return (
      <View style={styles.container}>
        <Text style={styles.text}>ChecklistApp - Edhinor</Text>
        <Text style={styles.subtitle}>Menú Principal 🏠</Text>
        <Text style={styles.version}>Con navegación básica</Text>
        
        <TouchableOpacity style={styles.button} onPress={mostrarAlerta}>
          <Text style={styles.buttonText}>Probar Funcionalidad</Text>
        </TouchableOpacity>
        
        <Text style={styles.counter}>Contador: {contador}</Text>
        
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Pantallas disponibles:</Text>
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
});
