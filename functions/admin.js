/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║              FIREBASE ADMIN INITIALIZATION                         ║
 * ║          Fichier partagé pour éviter les imports circulaires      ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialisation de Firebase Admin (une seule fois)
const app = initializeApp();

// Export des services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Configuration globale
db.settings({ ignoreUndefinedProperties: true });
