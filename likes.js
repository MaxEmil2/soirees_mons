// ========================================
// SYSTÈME DE LIKES
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    limit,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAY6S4OsO6iqrgY1EH1Z-cYLe_OWTnPxRg",
    authDomain: "soirees-mons-6ce3e.firebaseapp.com",
    projectId: "soirees-mons-6ce3e",
    storageBucket: "soirees-mons-6ce3e.firebasestorage.app",
    messagingSenderId: "3405335068",
    appId: "1:3405335068:web:394c536d95a33069d66dd9",
    measurementId: "G-526CPT4LQ8"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Image par défaut pour les utilisateurs sans photo
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzZjNjNmZiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTUiIHI9IjciIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMjAgMjRjLTYgMC0xMSAzLTExIDhsMjIgMGMwLTUtNS04LTExLTh6IiBmaWxsPSIjZmZmIi8+PC9zdmc+';

let currentUser = null;

// Écouter l'état de connexion
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// ========================================
// CHARGER LES LIKES D'UN ÉVÉNEMENT
// ========================================

export async function loadEventLikes(eventId) {
    try {
        // Récupérer tous les likes de l'événement
        const likesQuery = query(
            collection(db, 'likes'),
            where('eventId', '==', eventId)
        );

        const snapshot = await getDocs(likesQuery);

        const likes = [];
        snapshot.forEach((doc) => {
            likes.push({ id: doc.id, ...doc.data() });
        });

        return likes;

    } catch (error) {
        return [];
    }
}

// ========================================
// VÉRIFIER SI L'UTILISATEUR A LIKÉ
// ========================================

export async function hasUserLiked(eventId, userId) {
    try {
        const likesQuery = query(
            collection(db, 'likes'),
            where('eventId', '==', eventId),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(likesQuery);
        return !snapshot.empty;

    } catch (error) {
        return false;
    }
}

// ========================================
// LIKER UN ÉVÉNEMENT
// ========================================

export async function likeEvent(eventId, isPublic) {
    if (!currentUser) {
        // Rediriger vers la page de connexion
        window.location.href = 'login.html';
        return null;
    }

    try {
        // Vérifier si déjà liké
        const alreadyLiked = await hasUserLiked(eventId, currentUser.uid);

        if (alreadyLiked) {
            // Unlike (retirer le like)
            return await unlikeEvent(eventId);
        }

        // Récupérer les infos utilisateur pour la photo
        let userPhotoURL = currentUser.photoURL || null;

        // Si pas de photo, essayer de la récupérer depuis Firestore
        if (!userPhotoURL) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                userPhotoURL = userDoc.data().photoURL || null;
            }
        }

        // Ajouter le like
        // Vérifier aussi les chaînes vides pour userPhotoURL
        const finalPhotoURL = userPhotoURL && userPhotoURL.trim() ? userPhotoURL : DEFAULT_AVATAR;
        const likeData = {
            eventId: eventId,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userPhotoURL: finalPhotoURL,
            isPublic: isPublic,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'likes'), likeData);

        return { id: docRef.id, ...likeData };

    } catch (error) {
        return null;
    }
}

// ========================================
// RETIRER UN LIKE
// ========================================

export async function unlikeEvent(eventId) {
    if (!currentUser) return null;

    try {
        const likesQuery = query(
            collection(db, 'likes'),
            where('eventId', '==', eventId),
            where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(likesQuery);

        if (!snapshot.empty) {
            // Supprimer le like
            await deleteDoc(doc(db, 'likes', snapshot.docs[0].id));
            return true;
        }

        return false;

    } catch (error) {
        return false;
    }
}

// ========================================
// RÉCUPÉRER LES 3 DERNIERS LIKERS PUBLICS
// ========================================

export async function getRecentPublicLikers(eventId) {
    try {
        const likesQuery = query(
            collection(db, 'likes'),
            where('eventId', '==', eventId),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc'),
            limit(3)
        );

        const snapshot = await getDocs(likesQuery);

        const likers = [];
        snapshot.forEach((doc) => {
            const like = doc.data();
            // Inclure tous les likers publics, avec avatar par défaut si pas de photo
            // Vérifier aussi les chaînes vides
            const photoURL = like.userPhotoURL && like.userPhotoURL.trim() ? like.userPhotoURL : DEFAULT_AVATAR;
            likers.push({
                ...like,
                userPhotoURL: photoURL
            });
        });

        return likers;

    } catch (error) {
        return [];
    }
}

// ========================================
// COMPTER LES LIKES TOTAUX
// ========================================

export async function getTotalLikes(eventId) {
    try {
        const likesQuery = query(
            collection(db, 'likes'),
            where('eventId', '==', eventId)
        );

        const snapshot = await getDocs(likesQuery);
        return snapshot.size;

    } catch (error) {
        return 0;
    }
}

