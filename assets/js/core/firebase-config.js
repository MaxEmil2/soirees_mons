/*
 * CENTRALIZED FIREBASE CONFIGURATION
 * Single source of truth for Firebase initialization
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAY6S4OsO6iqrgY1EH1Z-cYLe_OWTnPxRg",
    authDomain: "soirees-mons-6ce3e.firebaseapp.com",
    projectId: "soirees-mons-6ce3e",
    storageBucket: "soirees-mons-6ce3e.firebasestorage.app",
    messagingSenderId: "3405335068",
    appId: "1:3405335068:web:394c536d95a33069d66dd9",
    measurementId: "G-526CPT4LQ8"
};

// ==========================================
// INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

// ==========================================
// ENABLE OFFLINE PERSISTENCE
// ==========================================

try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support offline persistence.');
        }
    });
} catch (err) {
    console.warn('Persistence initialization error:', err);
}

// ==========================================
// AUTH PROVIDERS
// ==========================================

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// ==========================================
// FIRESTORE COLLECTIONS
// ==========================================

export const COLLECTIONS = {
    USERS: 'users',
    EVENTS: 'events',
    PRESALES: 'presales',
    LIKES: 'likes',
    NOTIFICATIONS: 'notifications',
    PARTNERS: 'partners',
    SUGGESTIONS: 'suggestions',
    STATS: 'stats'
};

// ==========================================
// USER ROLES
// ==========================================

export const ROLES = {
    USER: 'user',
    ORGANIZER: 'organizer',
    SCANNER: 'scanner',
    ADMIN: 'admin'
};

// ==========================================
// EVENT STATUS
// ==========================================

export const EVENT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// ==========================================
// PRESALE STATUS
// ==========================================

export const PRESALE_STATUS = {
    VALID: 'valid',
    USED: 'used',
    REFUNDED: 'refunded'
};

// ==========================================
// EXPORT APP INSTANCE
// ==========================================

export default app;
