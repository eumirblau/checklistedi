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
import { RolUsuario, Usuario, UsuarioAuth } from '../types';

type LoginScreenNavigationProp = any;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const authService = new AuthService();

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user && !initializing) {
        // Usuario autenticado, usar datos temporales si existen
        const tempData = (global as any).tempUserData;
        const usuarioData: Usuario = tempData || {
          id: user.uid,
          nombre: user.displayName || 'Usuario',
          cargo: 'Técnico', // Valor por defecto si no hay datos temporales
          email: user.email || '',
          rol: RolUsuario.TECNICO,
        };
        
        // Limpiar datos temporales
        delete (global as any).tempUserData;
        
        navigation.replace('Jefes', { usuario: usuarioData });
      }
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [navigation, initializing]);

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingrese su email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingrese su contraseña');
      return;
    }

    // Requerir cargo siempre para mantener la lógica de obtención de datos
    if (!cargo.trim()) {
      Alert.alert('Error', 'Por favor ingrese su cargo');
      return;
    }

    if (isRegisterMode && !nombre.trim()) {
      Alert.alert('Error', 'Por favor ingrese su nombre');
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
      let usuarioAuth: UsuarioAuth;

      if (isRegisterMode) {
        // Registrar nuevo usuario
        usuarioAuth = await authService.registrarUsuario(email, password);
        
        // Actualizar perfil con nombre
        await authService.actualizarPerfil({ displayName: nombre });
        
        Alert.alert(
          'Registro exitoso',
          'Su cuenta ha sido creada. Iniciando sesión...',
          [{ text: 'OK' }]
        );
      } else {
        // Iniciar sesión
        usuarioAuth = await authService.iniciarSesion(email, password);
      }

      // Crear usuario compatible con la app usando el cargo del formulario
      const usuarioData: Usuario = {
        id: usuarioAuth.uid,
        nombre: usuarioAuth.displayName || nombre || 'Usuario',
        cargo: cargo.trim(), // Usar el cargo ingresado en el formulario
        email: usuarioAuth.email || '',
        rol: RolUsuario.TECNICO,
      };

      // Guardar temporalmente el usuario para usarlo en onAuthStateChanged
      (global as any).tempUserData = usuarioData;

      // La navegación será manejada por onAuthStateChanged
      
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      Alert.alert(
        'Error de autenticación', 
        error.message || 'Error al procesar la solicitud'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email requerido', 'Por favor ingrese su email para enviar el enlace de recuperación');
      return;
    }

    if (!AuthService.validarEmail(email)) {
      Alert.alert('Error', 'Por favor ingrese un email válido');
      return;
    }

    try {
      await authService.enviarResetPassword(email);
      Alert.alert(
        'Email enviado',
        'Se ha enviado un enlace de recuperación a su email'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al enviar el email de recuperación');
    }
  };

  // Mostrar loading mientras se inicializa
  if (initializing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Iniciando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.gradientBackground]}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6cf7" />
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { flex: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/edhinor-logo.jpg')}
              style={styles.companyLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.companyName}>EDHINOR</Text>
          <Text style={styles.title}>Checklist App</Text>
          <Text style={styles.subtitle}>
            {isRegisterMode ? 'Crear nueva cuenta' : 'Iniciar sesión'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.emojiIcon}>�</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.emojiIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.emojiIcon}>�</Text>
              <TextInput
                style={styles.input}
                value={cargo}
                onChangeText={setCargo}
                placeholder="Cargo"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {isRegisterMode && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.emojiIcon}>�</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Nombre completo"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <View style={styles.loginButtonGradient}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonEmojiIcon}>
                  {isRegisterMode ? '�' : '�🔐'}
                </Text>
              )}
              <Text style={styles.loginButtonText}>
                {loading 
                  ? (isRegisterMode ? 'Registrando...' : 'Iniciando...') 
                  : (isRegisterMode ? 'Registrarse' : 'Iniciar Sesión')
                }
              </Text>
            </View>
          </TouchableOpacity>

          {!isRegisterMode && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidó su contraseña?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toggleModeButton}
            onPress={() => setIsRegisterMode(!isRegisterMode)}
          >
            <Text style={styles.toggleModeText}>
              {isRegisterMode 
                ? '¿Ya tiene cuenta? Iniciar sesión' 
                : '¿No tiene cuenta? Registrarse'
              }
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Checklist App v2.0 con Firebase Auth</Text>
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
  gradientBackground: {
    backgroundColor: '#4a6cf7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },
  companyLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputIcon: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  loginButton: {
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },  loginButtonText: {
    color: '#4a6cf7',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    opacity: 0.8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.7,
  },
  emojiIcon: {
    fontSize: 20,
    color: '#4a6cf7',
    paddingLeft: 12,
    paddingRight: 8,
  },
  buttonEmojiIcon: {
    fontSize: 20,
    color: '#4a6cf7',
    marginRight: 8,
  },
  // Nuevos estilos para Firebase Auth
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  toggleModeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleModeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
});

export default LoginScreen;
