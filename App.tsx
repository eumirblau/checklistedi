import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  console.log('App iniciando...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ChecklistApp - Edhinor</Text>
      <Text style={styles.subtitle}>Diagnóstico de Crash 🔍</Text>
      <Text style={styles.version}>Sin navegación</Text>
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
  },
});
