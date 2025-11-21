/**
 * AUTHENTICATION SERVICE
 * Gestion sécurisée de l'authentification
 * @module auth.service
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, getFriendlyErrorMessage, logger } from '../config/firebase.config.js';
import { isValidEmail, validatePassword } from '../utils/validators.js';
import cache from '../utils/cache.js';

/**
 * Observateur d'état d'authentification
 * @param {Function} callback - Fonction appelée lors du changement d'état
 * @returns {Function} Fonction de désinscription
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Récupère les données utilisateur depuis Firestore
      const userData = await getUserData(user.uid);
      callback({ ...user, ...userData });
    } else {
      callback(null);
    }
  });
}

/**
 * Connexion avec email et mot de passe
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Utilisateur connecté
 */
export async function loginWithEmail(email, password) {
  try {
    // Validation
    if (!isValidEmail(email)) {
      throw new Error('Adresse email invalide');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0]);
    }

    // Connexion
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mise à jour de la dernière connexion
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp()
    });

    logger.log('✅ Connexion réussie:', user.uid);

    return user;
  } catch (error) {
    logger.error('❌ Erreur de connexion:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Inscription avec email et mot de passe
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<Object>} Utilisateur créé
 */
export async function signupWithEmail(email, password, displayName) {
  try {
    // Validation
    if (!isValidEmail(email)) {
      throw new Error('Adresse email invalide');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    if (!displayName || displayName.trim().length < 2) {
      throw new Error('Nom d\'affichage requis (min 2 caractères)');
    }

    // Création du compte
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mise à jour du profil
    await updateProfile(user, {
      displayName: displayName.trim()
    });

    // Création du document utilisateur dans Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName.trim(),
      photoURL: user.photoURL || null,
      isAdmin: false,
      role: 'user', // user, organisateur, scanner, admin
      stripeAccountId: null,
      stripeAccountStatus: null,
      stripeCanReceivePayments: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    logger.log('✅ Inscription réussie:', user.uid);

    return user;
  } catch (error) {
    logger.error('❌ Erreur d\'inscription:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Connexion avec Google
 * @returns {Promise<Object>} Utilisateur connecté
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Vérifie si l'utilisateur existe déjà
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      // Premier login Google - crée le document utilisateur
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAdmin: false,
        role: 'user',
        stripeAccountId: null,
        stripeAccountStatus: null,
        stripeCanReceivePayments: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      // Mise à jour de la dernière connexion
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp()
      });
    }

    logger.log('✅ Connexion Google réussie:', user.uid);

    return user;
  } catch (error) {
    logger.error('❌ Erreur de connexion Google:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Déconnexion
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await signOut(auth);

    // Vide le cache
    cache.clear();

    logger.log('✅ Déconnexion réussie');
  } catch (error) {
    logger.error('❌ Erreur de déconnexion:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Réinitialisation du mot de passe
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    if (!isValidEmail(email)) {
      throw new Error('Adresse email invalide');
    }

    await sendPasswordResetEmail(auth, email);

    logger.log('✅ Email de réinitialisation envoyé à:', email);
  } catch (error) {
    logger.error('❌ Erreur de réinitialisation:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Récupère les données utilisateur depuis Firestore
 * @param {string} uid - ID de l'utilisateur
 * @returns {Promise<Object|null>}
 */
export async function getUserData(uid) {
  try {
    // Vérifie le cache
    const cacheKey = `user:${uid}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.log('📦 Données utilisateur depuis le cache');
      return cached;
    }

    // Récupère depuis Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    // Met en cache (5 minutes)
    cache.set(cacheKey, userData, 5 * 60 * 1000);

    return userData;
  } catch (error) {
    logger.error('❌ Erreur de récupération des données utilisateur:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Mise à jour du profil utilisateur
 * @param {Object} updates - Mises à jour à appliquer
 * @returns {Promise<void>}
 */
export async function updateUserProfile(updates) {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    // Mise à jour de Firebase Auth si nécessaire
    if (updates.displayName || updates.photoURL) {
      await updateProfile(user, {
        displayName: updates.displayName || user.displayName,
        photoURL: updates.photoURL || user.photoURL
      });
    }

    // Mise à jour de Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Invalide le cache
    cache.delete(`user:${user.uid}`);

    logger.log('✅ Profil mis à jour');
  } catch (error) {
    logger.error('❌ Erreur de mise à jour du profil:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Mise à jour de l'email
 * @param {string} newEmail
 * @returns {Promise<void>}
 */
export async function updateUserEmail(newEmail) {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    if (!isValidEmail(newEmail)) {
      throw new Error('Adresse email invalide');
    }

    // Mise à jour de Firebase Auth
    await updateEmail(user, newEmail);

    // Mise à jour de Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      email: newEmail,
      updatedAt: serverTimestamp()
    });

    // Invalide le cache
    cache.delete(`user:${user.uid}`);

    logger.log('✅ Email mis à jour');
  } catch (error) {
    logger.error('❌ Erreur de mise à jour de l\'email:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Mise à jour du mot de passe
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function updateUserPassword(newPassword) {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    await updatePassword(user, newPassword);

    logger.log('✅ Mot de passe mis à jour');
  } catch (error) {
    logger.error('❌ Erreur de mise à jour du mot de passe:', error);
    throw new Error(getFriendlyErrorMessage(error));
  }
}

/**
 * Vérifie si l'utilisateur est admin
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const userData = await getUserData(user.uid);

    return userData?.isAdmin === true || userData?.role === 'admin';
  } catch (error) {
    logger.error('❌ Erreur de vérification admin:', error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur est organisateur
 * @returns {Promise<boolean>}
 */
export async function isOrganisateur() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const userData = await getUserData(user.uid);

    return userData?.role === 'organisateur' || userData?.role === 'admin';
  } catch (error) {
    logger.error('❌ Erreur de vérification organisateur:', error);
    return false;
  }
}

/**
 * Vérifie le rôle de l'utilisateur
 * @param {string} requiredRole - Rôle requis
 * @returns {Promise<boolean>}
 */
export async function hasRole(requiredRole) {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const userData = await getUserData(user.uid);

    // Admin a tous les accès
    if (userData?.role === 'admin' || userData?.isAdmin === true) {
      return true;
    }

    return userData?.role === requiredRole;
  } catch (error) {
    logger.error('❌ Erreur de vérification du rôle:', error);
    return false;
  }
}

/**
 * Récupère l'utilisateur courant
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Vérifie si un utilisateur est connecté
 * @returns {boolean}
 */
export function isAuthenticated() {
  return auth.currentUser !== null;
}
