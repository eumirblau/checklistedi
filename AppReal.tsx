import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ChecklistScreen from './src/screens/ChecklistScreen';
import GrupoChecklistScreen from './src/screens/GrupoChecklistScreen';
import InstalacionesScreen from './src/screens/InstalacionesScreen';
import JefesScreen from './src/screens/JefesScreen';
import LoginScreen from './src/screens/LoginScreen';
import ObrasScreen from './src/screens/ObrasScreen';

const Stack = createStackNavigator();

export default function AppReal() {
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
          options={{ title: 'Inicio de Sesión' }}
        />
        <Stack.Screen 
          name="Jefes" 
          component={JefesScreen} 
          options={{ title: 'Seleccionar Jefe' }}
        />
        <Stack.Screen 
          name="Obras" 
          component={ObrasScreen} 
          options={{ title: 'Seleccionar Obra' }}
        />
        <Stack.Screen 
          name="Instalaciones" 
          component={InstalacionesScreen} 
          options={{ title: 'Seleccionar Instalación' }}
        />
        <Stack.Screen 
          name="ChecklistScreen" 
          component={ChecklistScreen} 
          options={{ title: 'Checklist' }}
        />
        <Stack.Screen 
          name="GrupoChecklistScreen" 
          component={GrupoChecklistScreen} 
          options={{ title: 'Grupo Checklist' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
