import { getApp, getApps } from '@react-native-firebase/app';
import auth, { FirebaseAuthTypes, getAuth } from '@react-native-firebase/auth';

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
    const apps = getApps();
    if (apps.length === 0) {
      throw new Error('Firebase no está inicializado. Verifica google-services.json');
    }
  }

  /**
   * Obtiene la instancia de auth
   */
  private getAuthInstance() {
    return getAuth(getApp());
  }

  /**
   * Obtiene el usuario actualmente autenticado
   */
  getCurrentUser(): FirebaseAuthTypes.User | null {
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
      const userCredential = await authInstance.createUserWithEmailAndPassword(email, password);
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
      const userCredential = await authInstance.signInWithEmailAndPassword(email, password);
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
      await auth().signOut();
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Envía un email de restablecimiento de contraseña
   */
  async enviarResetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Envía email de verificación al usuario actual
   */
  async enviarVerificacionEmail(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (user && !user.emailVerified) {
        await user.sendEmailVerification();
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Escucha cambios en el estado de autenticación
   */
  onAuthStateChanged(callback: (user: UsuarioAuth | null) => void): () => void {
    return auth().onAuthStateChanged((user) => {
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
      const user = auth().currentUser;
      if (user) {
        await user.updateProfile(updates);
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
