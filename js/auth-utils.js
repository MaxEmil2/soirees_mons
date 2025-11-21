/**
 * ========================================
 * AUTH UTILS - Gestion des utilisateurs et rôles
 * ========================================
 */

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Cache pour éviter les requêtes répétées
let userDataCache = null;
let userRoleCache = null;

/**
 * Récupère les données utilisateur depuis Firestore
 */
export async function getUserData(uid, db) {
    if (userDataCache && userDataCache.uid === uid) {
        return userDataCache;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            userDataCache = { uid, ...userDoc.data() };
            return userDataCache;
        }
        return null;
    } catch (error) {
        console.error('❌ Erreur récupération données utilisateur:', error);
        return null;
    }
}

/**
 * Récupère le rôle de l'utilisateur
 */
export async function getUserRole(uid, db) {
    if (userRoleCache && userRoleCache.uid === uid) {
        return userRoleCache.role;
    }

    const userData = await getUserData(uid, db);
    if (userData && userData.role) {
        userRoleCache = { uid, role: userData.role };
        return userData.role;
    }

    return 'user'; // Rôle par défaut
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export async function hasRole(uid, db, requiredRole) {
    const role = await getUserRole(uid, db);
    return role === requiredRole;
}

/**
 * Vérifie si l'utilisateur a l'un des rôles autorisés
 */
export async function hasAnyRole(uid, db, allowedRoles) {
    const role = await getUserRole(uid, db);
    return allowedRoles.includes(role);
}

/**
 * Vérifie si l'utilisateur est admin
 */
export async function isAdmin(uid, db) {
    return await hasRole(uid, db, 'admin');
}

/**
 * Vérifie si l'utilisateur est organisateur
 */
export async function isOrganizer(uid, db) {
    return await hasAnyRole(uid, db, ['organizer', 'admin']);
}

/**
 * Vérifie si l'utilisateur est scanner
 */
export async function isScanner(uid, db) {
    return await hasAnyRole(uid, db, ['scanner', 'admin']);
}

/**
 * Crée ou met à jour le document utilisateur lors de l'inscription
 */
export async function initializeUserDocument(user, db) {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Créer le document utilisateur
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: 'user', // Rôle par défaut
            createdAt: new Date(),
            lastLoginAt: new Date()
        });
        console.log('✅ Document utilisateur créé');
    } else {
        // Mettre à jour lastLoginAt
        await setDoc(userRef, {
            lastLoginAt: new Date()
        }, { merge: true });
    }
}

/**
 * Invalide le cache (à appeler après mise à jour du profil)
 */
export function clearUserCache() {
    userDataCache = null;
    userRoleCache = null;
}

/**
 * Redirige selon le rôle de l'utilisateur
 */
export async function redirectByRole(uid, db) {
    const role = await getUserRole(uid, db);

    switch (role) {
        case 'admin':
            window.location.href = '/admin-panel.html';
            break;
        case 'organizer':
            window.location.href = '/mes-soirees.html';
            break;
        case 'scanner':
            window.location.href = '/scanner.html';
            break;
        default:
            window.location.href = '/dashboard.html';
    }
}

/**
 * Protège une page selon le rôle requis
 */
export async function protectPage(auth, db, allowedRoles = []) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Non connecté - rediriger vers login
                window.location.href = '/login.html';
                reject('Non authentifié');
                return;
            }

            if (allowedRoles.length === 0) {
                // Aucun rôle requis - juste connecté
                resolve(user);
                return;
            }

            // Vérifier le rôle
            const hasPermission = await hasAnyRole(user.uid, db, allowedRoles);
            if (!hasPermission) {
                window.location.href = '/dashboard.html';
                reject('Permissions insuffisantes');
                return;
            }

            resolve(user);
        });
    });
}
