import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDREB_RGYvMCeNHL7t3CWfLo7402dsOOiE",
  authDomain: "checklistedhinor.firebaseapp.com",
  projectId: "checklistedhinor",
  storageBucket: "checklistedhinor.firebasestorage.app",
  messagingSenderId: "972633539581",
  appId: "1:972633539581:android:1971e7f9cd4930c807cf94",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// NOTA: El warning sobre AsyncStorage en Expo Go es normal y no afecta funcionalidad
// En builds nativos (EAS), la persistencia funciona automáticamente con React Native Firebase
console.log('🔥 Firebase Auth inicializado para Expo Go');

export type UsuarioAuth = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
};

export type ErrorAutenticacion = {
  code: string;
  message: string;
};

class AuthService {
  /**
   * Verifica que Firebase esté inicializado
   */
  private ensureFirebaseInitialized() {
    // Firebase Web SDK no necesita verificación de apps
    if (!auth) {
      throw new Error('Firebase no está inicializado. Verifica la configuración');
    }
  }

  /**
   * Obtiene la instancia de auth
   */
  private getAuthInstance() {
    return auth;
  }

  /**
   * Obtiene el usuario actualmente autenticado
   */
  getCurrentUser(): User | null {
    try {
      this.ensureFirebaseInitialized();
      return this.getAuthInstance().currentUser;
    } catch (error: any) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }

  /**
   * Registra un nuevo usuario con email y contraseña
   */
  async registrarUsuario(email: string, password: string): Promise<UsuarioAuth> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      
      // Usar la API modular v22
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async iniciarSesion(email: string, password: string): Promise<UsuarioAuth> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      
      // Usar la API modular v22
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Cierra la sesión del usuario actual
   */
  async cerrarSesion(): Promise<void> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      
      // Usar la API modular v22
      await signOut(authInstance);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Envía un email de restablecimiento de contraseña
   */
  async enviarResetPassword(email: string): Promise<void> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      
      // Usar la API modular v22
      await sendPasswordResetEmail(authInstance, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Envía email de verificación al usuario actual
   */
  async enviarVerificacionEmail(): Promise<void> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      const user = authInstance.currentUser;
      
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Escucha cambios en el estado de autenticación
   */
  onAuthStateChanged(callback: (user: UsuarioAuth | null) => void): () => void {
    this.ensureFirebaseInitialized();
    const authInstance = this.getAuthInstance();
    
    return onAuthStateChanged(authInstance, (user) => {
      if (user) {
        const usuario: UsuarioAuth = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
        };
        callback(usuario);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Actualiza el perfil del usuario (nombre, foto)
   */
  async actualizarPerfil(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      this.ensureFirebaseInitialized();
      const authInstance = this.getAuthInstance();
      const user = authInstance.currentUser;
      if (user) {
        await updateProfile(user, updates);
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Maneja y formatea errores de Firebase Auth
   */
  private handleAuthError(error: any): ErrorAutenticacion {
    let message = 'Error de autenticación';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este email ya está registrado';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/operation-not-allowed':
        message = 'Operación no permitida';
        break;
      case 'auth/weak-password':
        message = 'La contraseña es muy débil';
        break;
      case 'auth/user-disabled':
        message = 'Esta cuenta ha sido deshabilitada';
        break;
      case 'auth/user-not-found':
        message = 'Usuario no encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-credential':
        message = 'Credenciales inválidas';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Intenta más tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Error de red. Verifica tu conexión';
        break;
      default:
        message = error.message || 'Error desconocido';
    }

    return {
      code: error.code || 'unknown',
      message,
    };
  }

  /**
   * Valida si el email tiene formato correcto
   */
  static validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida si la contraseña cumple con los requisitos mínimos
   */
  static validarPassword(password: string): { valido: boolean; mensaje?: string } {
    if (password.length < 6) {
      return { valido: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' };
    }
    return { valido: true };
  }
}

export default AuthService;
