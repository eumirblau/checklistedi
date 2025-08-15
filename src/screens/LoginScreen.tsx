import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AuthService from '../services/AuthService';
import { RolUsuario, Usuario } from '../types';

const authService = new AuthService();

type Props = {
  navigation: any;
};

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Verificar usuario al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          const usuarioData: Usuario = {
            id: currentUser.uid,
            nombre: currentUser.displayName || 'Usuario Firebase',
            email: currentUser.email || '',
            cargo: 'SUPERVISOR',
            rol: RolUsuario.SUPERVISOR
          };
          // Comentado temporalmente para testing
          // navigation.navigate('Jefes', { usuario: usuarioData });
        }
      } catch (error) {
        console.log('Usuario no autenticado');
      } finally {
        setInitializing(false);
      }
    };

    checkAuth();
  }, [navigation]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa email y contraseña');
      return;
    }

    if (!cargo.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu cargo');
      return;
    }

    // Validaciones
    if (!AuthService.validarEmail(email)) {
      Alert.alert('Error', 'Por favor ingrese un email válido');
      return;
    }

    const passwordValidation = AuthService.validarPassword(password);
    if (!passwordValidation.valido) {
      Alert.alert('Error', passwordValidation.mensaje || 'Contraseña inválida');
      return;
    }

    setLoading(true);
    
    try {
      const user = await authService.iniciarSesion(email.trim(), password.trim());
      
      if (user) {
        // Determinar rol basado en el cargo ingresado
        let rol = RolUsuario.TECNICO; // Por defecto
        const cargoUpper = cargo.trim().toUpperCase();
        if (cargoUpper.includes('ADMIN') || cargoUpper.includes('ADMINISTRADOR')) {
          rol = RolUsuario.ADMIN;
        } else if (cargoUpper.includes('SUPERVISOR') || cargoUpper.includes('JEFE')) {
          rol = RolUsuario.SUPERVISOR;
        }

        const usuarioCompleto: Usuario = {
          id: user.uid,
          nombre: email.trim(),
          email: user.email || email.trim(),
          cargo: cargo.trim(),
          rol: rol
        };

        console.log('🔥 FIREBASE AUTH - Usuario:', usuarioCompleto);
        navigation.navigate('Jefes', { usuario: usuarioCompleto });
      }
    } catch (error: any) {
      console.error('Error con Firebase:', error);
      Alert.alert('Error', error.message || 'No se pudo conectar con Firebase');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Verificando autenticación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      
      <View style={styles.headerBand}>
        <Text style={styles.headerTitle}>Checklist EDHINOR</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/edhinor-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cargo</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu cargo"
              value={cargo}
              onChangeText={setCargo}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4a6cf7',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBand: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  loginButton: {
    backgroundColor: '#4a6cf7',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default LoginScreen;
