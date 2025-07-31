/**
 * AppNavigator - Navegador principal usando React Navigation
 * Conecta todas las pantallas profesionales
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importar pantallas profesionales
import LoginScreen from '../screens/LoginScreen';
import JefesScreen from '../screens/JefesScreen';
import ObrasScreen from '../screens/ObrasScreen';
import InstalacionesScreen from '../screens/InstalacionesScreen';
import ChecklistScreen from '../screens/ChecklistScreen';

// Importar tipos de navegación
import { RootStackParamList } from '../types';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#667eea',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            headerShown: false, // Ocultar header en login
          }}
        />        <Stack.Screen 
          name="Jefes" 
          component={JefesScreen}
          options={{
            headerShown: false, // Usar header personalizado
          }}
        />
        <Stack.Screen 
          name="Obras" 
          component={ObrasScreen}
          options={{
            headerShown: false, // Usar header personalizado
          }}
        />        <Stack.Screen 
          name="Instalaciones" 
          component={InstalacionesScreen}
          options={{
            headerShown: false, // Usar header personalizado
          }}
        />        <Stack.Screen 
          name="Checklist" 
          component={ChecklistScreen}
          options={{
            headerShown: false, // Usar header personalizado
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
