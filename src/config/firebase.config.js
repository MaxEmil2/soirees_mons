/**
 * FIREBASE CONFIGURATION
 * Configuration sécurisée avec variables d'environnement
 * @module firebase.config
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

/**
 * Configuration Firebase depuis variables d'environnement
 * Les clés sont préfixées par VITE_ pour être accessibles côté client
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Vérification que les variables d'environnement sont définies
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    '❌ Configuration Firebase manquante. Vérifiez votre fichier .env'
  );
}

/**
 * Initialisation de l'application Firebase
 */
const app = initializeApp(firebaseConfig);

/**
 * Services Firebase
 */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // Région européenne

/**
 * Configuration des émulateurs en mode développement
 * Décommentez pour utiliser les émulateurs Firebase locaux
 */
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  console.log('🔧 Utilisation des émulateurs Firebase');
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

/**
 * Export de l'application Firebase
 */
export default app;

/**
 * Helper pour logger les erreurs Firebase de manière user-friendly
 * @param {Error} error - Erreur Firebase
 * @returns {string} Message d'erreur traduit
 */
export function getFriendlyErrorMessage(error) {
  const errorMessages = {
    // Erreurs d'authentification
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Aucun compte trouvé avec cette adresse email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion',
    'auth/popup-closed-by-user': 'Connexion annulée',

    // Erreurs Firestore
    'permission-denied': 'Vous n\'avez pas les permissions nécessaires',
    'unavailable': 'Service temporairement indisponible',
    'not-found': 'Ressource introuvable',
    'already-exists': 'Cette ressource existe déjà',
    'resource-exhausted': 'Quota dépassé',
    'failed-precondition': 'Conditions non remplies',
    'aborted': 'Opération annulée',
    'out-of-range': 'Valeur hors limites',
    'unauthenticated': 'Authentification requise',
    'deadline-exceeded': 'Temps d\'attente dépassé',

    // Erreurs Storage
    'storage/unauthorized': 'Vous n\'êtes pas autorisé à accéder à ce fichier',
    'storage/canceled': 'Upload annulé',
    'storage/unknown': 'Erreur inconnue lors de l\'upload',
    'storage/object-not-found': 'Fichier introuvable',
    'storage/bucket-not-found': 'Bucket introuvable',
    'storage/project-not-found': 'Projet introuvable',
    'storage/quota-exceeded': 'Quota de stockage dépassé',
    'storage/unauthenticated': 'Authentification requise',
    'storage/retry-limit-exceeded': 'Trop de tentatives. Réessayez plus tard',
    'storage/invalid-checksum': 'Fichier corrompu',
    'storage/canceled': 'Upload annulé',
    'storage/invalid-event-name': 'Événement invalide',
    'storage/invalid-url': 'URL invalide',
    'storage/invalid-argument': 'Argument invalide',
    'storage/no-default-bucket': 'Aucun bucket par défaut configuré',
    'storage/cannot-slice-blob': 'Impossible de découper le fichier',
    'storage/server-file-wrong-size': 'Taille de fichier incorrecte',

    // Erreurs Cloud Functions
    'functions/cancelled': 'Opération annulée',
    'functions/unknown': 'Erreur inconnue',
    'functions/invalid-argument': 'Arguments invalides',
    'functions/deadline-exceeded': 'Temps d\'attente dépassé',
    'functions/not-found': 'Fonction introuvable',
    'functions/already-exists': 'Ressource déjà existante',
    'functions/permission-denied': 'Permission refusée',
    'functions/resource-exhausted': 'Ressources épuisées',
    'functions/failed-precondition': 'Conditions non remplies',
    'functions/aborted': 'Opération interrompue',
    'functions/out-of-range': 'Valeur hors limites',
    'functions/unimplemented': 'Fonctionnalité non implémentée',
    'functions/internal': 'Erreur interne du serveur',
    'functions/unavailable': 'Service temporairement indisponible',
    'functions/data-loss': 'Perte de données',
    'functions/unauthenticated': 'Authentification requise'
  };

  // Récupère le code d'erreur
  const errorCode = error.code || 'unknown';

  // Retourne le message traduit ou le message original
  return errorMessages[errorCode] || error.message || 'Une erreur est survenue';
}

/**
 * Logger conditionnel (seulement en développement)
 * @param {string} type - Type de log (log, error, warn, info)
 * @param  {...any} args - Arguments à logger
 */
export const logger = {
  log: (...args) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (import.meta.env.DEV) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (import.meta.env.DEV) {
      console.info(...args);
    }
  }
};
