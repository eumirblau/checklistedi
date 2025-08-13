/**
 * AppNavigator - Navegador principal usando React Navigation
 * Conecta todas las pantallas profesionales
 */

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

// Importar pantallas profesionales
import ChecklistScreen from '../screens/ChecklistScreen';
import GrupoChecklistScreen from '../screens/GrupoChecklistScreen';
import InstalacionesScreen from '../screens/InstalacionesScreen';
import JefesScreen from '../screens/JefesScreen';
import LoginScreen from '../screens/LoginScreen';
import ObrasScreen from '../screens/ObrasScreen';

// Importar tipos de navegación

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
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
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Jefes" 
          component={JefesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Obras" 
          component={ObrasScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Instalaciones" 
          component={InstalacionesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Checklist" 
          component={ChecklistScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GrupoChecklistScreen"
          component={GrupoChecklistScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
