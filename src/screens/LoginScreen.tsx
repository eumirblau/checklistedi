import React, { useState } from 'react';
import {
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
import { RolUsuario, Usuario } from '../types';

type LoginScreenNavigationProp = any;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen = ({ navigation }: Props) => {
  const [usuario, setUsuario] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usuario.trim()) {
      Alert.alert('Error', 'Por favor ingrese su nombre de usuario');
      return;
    }

    if (!cargo.trim()) {
      Alert.alert('Error', 'Por favor ingrese su cargo');
      return;
    }

    setLoading(true);

    try {
      const usuarioData: Usuario = {
        id: Date.now().toString(),
        nombre: usuario.trim(),
        cargo: cargo.trim(),
        email: '',
        rol: RolUsuario.TECNICO,
      };      // Navegar a Jefes manteniendo el stack de navegación
      navigation.navigate('Jefes', { usuario: usuarioData });
    } catch (error) {
      Alert.alert('Error', 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

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
              source={require('../../assets/edhinor-logo.jpg')}
              style={styles.companyLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.companyName}>EDHINOR</Text>
          <Text style={styles.title}>CheckedHID</Text>
          <Text style={styles.subtitle}>Sistema de Checklist</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.emojiIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={usuario}
                onChangeText={setUsuario}
                placeholder="Ingrese su nombre"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.emojiIcon}>💼</Text>
              <TextInput
                style={styles.input}
                value={cargo}
                onChangeText={setCargo}
                placeholder="Ingrese su cargo"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <View style={styles.loginButtonGradient}>
              {loading ? (
                <Text style={styles.buttonEmojiIcon}>⏳</Text>
              ) : (
                <Text style={styles.buttonEmojiIcon}>🔐</Text>
              )}
              <Text style={styles.loginButtonText}>
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>CheckedHID v1.0</Text>
          <Text style={styles.footerSubtext}>Sistema de gestión de checklist</Text>
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
    marginBottom: 40,
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
    marginBottom: 40,
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
  },  emojiIcon: {
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
});

export default LoginScreen;
