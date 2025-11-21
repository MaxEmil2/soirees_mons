/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                    AUTHENTICATION SERVICE                          ║
 * ║           Service centralisé pour l'authentification               ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

/**
 * Service d'authentification
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.googleProvider = new GoogleAuthProvider();

    // Écoute des changements d'état d'authentification
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = await this.getUserData(user.uid);
      } else {
        this.currentUser = null;
      }

      // Notification des listeners
      this.authListeners.forEach((listener) => listener(this.currentUser));
    });
  }

  /**
   * Connexion avec email et mot de passe
   */
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User signed in:', userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('❌ Error signing in:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Connexion avec Google
   */
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      console.log('✅ User signed in with Google:', result.user.uid);

      // Création du profil utilisateur s'il n'existe pas
      await this.createUserProfile(result.user);

      return { success: true, user: result.user };
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Inscription avec email et mot de passe
   */
  async signUpWithEmail(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ User created:', userCredential.user.uid);

      // Création du profil utilisateur
      await this.createUserProfile(userCredential.user, { displayName });

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('❌ Error signing up:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Déconnexion
   */
  async signOut() {
    try {
      await signOut(auth);
      console.log('✅ User signed out');
      return { success: true };
    } catch (error) {
      console.error('❌ Error signing out:', error);
      return { success: false, error: 'Erreur lors de la déconnexion' };
    }
  }

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending password reset:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Crée ou met à jour le profil utilisateur dans Firestore
   */
  async createUserProfile(user, additionalData = {}) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      // Crée le profil seulement s'il n'existe pas
      if (!userSnap.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: additionalData.displayName || user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          isAdmin: false,
          isOrganizer: false,
          isScanner: false
        };

        await setDoc(userRef, userData);
        console.log('✅ User profile created');
      }
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
    }
  }

  /**
   * Récupère les données utilisateur depuis Firestore
   */
  async getUserData(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return {
          uid,
          ...userSnap.data()
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  isAdmin() {
    return this.currentUser?.isAdmin === true;
  }

  /**
   * Vérifie si l'utilisateur est organisateur
   */
  isOrganizer() {
    return this.currentUser?.isOrganizer === true || this.isAdmin();
  }

  /**
   * Vérifie si l'utilisateur est scanner
   */
  isScanner() {
    return this.currentUser?.isScanner === true || this.isAdmin();
  }

  /**
   * Ajoute un listener pour les changements d'état d'authentification
   */
  onAuthStateChange(callback) {
    this.authListeners.push(callback);

    // Retourne une fonction pour supprimer le listener
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== callback);
    };
  }

  /**
   * Traduit les codes d'erreur Firebase
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/invalid-email': 'Adresse email invalide',
      'auth/user-disabled': 'Ce compte a été désactivé',
      'auth/user-not-found': 'Aucun compte ne correspond à cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/invalid-credential': 'Identifiants invalides',
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
      'auth/network-request-failed': 'Erreur de connexion',
      'auth/popup-closed-by-user': 'Connexion annulée',
      'auth/popup-blocked': 'Popup bloquée par le navigateur'
    };

    return errorMessages[errorCode] || 'Une erreur est survenue';
  }
}

// Export de l'instance unique
export const authService = new AuthService();
