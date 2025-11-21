/**
 * ========================================
 * FIREBASE UTILS - Fonctions utilitaires Firebase
 * ========================================
 */

import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

/**
 * Appelle une Cloud Function de manière sécurisée
 */
export async function callFunction(functions, functionName, data = {}) {
    try {
        console.log(`☁️ Appel Cloud Function: ${functionName}`);
        const callable = httpsCallable(functions, functionName);
        const result = await callable(data);
        console.log(`✅ ${functionName} réussi:`, result.data);
        return result.data;
    } catch (error) {
        console.error(`❌ Erreur ${functionName}:`, error);
        throw error;
    }
}

/**
 * Gère les erreurs Firebase de manière user-friendly
 */
export function handleFirebaseError(error) {
    const errorMessages = {
        // Auth errors
        'auth/invalid-email': 'Adresse email invalide',
        'auth/user-disabled': 'Ce compte a été désactivé',
        'auth/user-not-found': 'Aucun compte ne correspond à cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/weak-password': 'Mot de passe trop faible (min 6 caractères)',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion',

        // Functions errors
        'unauthenticated': 'Vous devez être connecté',
        'permission-denied': 'Permissions insuffisantes',
        'not-found': 'Ressource introuvable',
        'already-exists': 'Cette ressource existe déjà',
        'invalid-argument': 'Données invalides',
        'resource-exhausted': 'Quota dépassé',
        'failed-precondition': 'Opération impossible dans l\'état actuel',

        // Storage errors
        'storage/unauthorized': 'Non autorisé',
        'storage/canceled': 'Upload annulé',
        'storage/unknown': 'Erreur inconnue'
    };

    const errorCode = error.code || error.message;
    return errorMessages[errorCode] || error.message || 'Une erreur est survenue';
}

/**
 * Optimise une requête Firestore avec pagination
 */
export async function paginatedQuery(query, limit = 20, lastDoc = null) {
    try {
        let q = query.limit(limit);
        if (lastDoc) {
            q = q.startAfter(lastDoc);
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            docs,
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            hasMore: snapshot.docs.length === limit
        };
    } catch (error) {
        console.error('❌ Erreur requête paginée:', error);
        throw error;
    }
}

/**
 * Cache intelligent pour les requêtes Firestore
 */
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function cachedQuery(cacheKey, queryFn) {
    const cached = queryCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`📦 Cache hit: ${cacheKey}`);
        return cached.data;
    }

    console.log(`🔄 Cache miss: ${cacheKey}`);
    const data = await queryFn();
    queryCache.set(cacheKey, { data, timestamp: now });

    return data;
}

/**
 * Invalide le cache
 */
export function invalidateCache(cacheKey = null) {
    if (cacheKey) {
        queryCache.delete(cacheKey);
    } else {
        queryCache.clear();
    }
}

/**
 * Compresse une image avant upload
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionner si nécessaire
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir en blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            console.log(`🗜️ Image compressée: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Erreur de compression'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
        };

        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    });
}

/**
 * Formate une date de manière lisible
 */
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    return new Date(date).toLocaleDateString('fr-FR', defaultOptions);
}

/**
 * Debounce une fonction
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Lazy load des images
 */
export function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}
