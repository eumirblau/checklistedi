import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  console.log('App iniciando...');
  const [contador, setContador] = useState(0);
  
  const mostrarAlerta = () => {
    Alert.alert('¡Funciona!', `Has presionado ${contador + 1} veces`);
    setContador(contador + 1);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ChecklistApp - Edhinor</Text>
      <Text style={styles.subtitle}>Diagnóstico de Crash 🔍</Text>
      <Text style={styles.version}>Sin navegación</Text>
      
      <TouchableOpacity style={styles.button} onPress={mostrarAlerta}>
        <Text style={styles.buttonText}>Probar Funcionalidad</Text>
      </TouchableOpacity>
      
      <Text style={styles.counter}>Contador: {contador}</Text>
    </View>
  );
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
  },
});
