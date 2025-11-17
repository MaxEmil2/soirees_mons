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
        console.error('Erreur chargement likes:', error);
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
        console.error('Erreur vérification like:', error);
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
        const likeData = {
            eventId: eventId,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userPhotoURL: userPhotoURL,
            isPublic: isPublic,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'likes'), likeData);

        console.log('✅ Like ajouté:', docRef.id);
        return { id: docRef.id, ...likeData };

    } catch (error) {
        console.error('❌ Erreur like:', error);
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
            console.log('✅ Like retiré');
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Erreur unlike:', error);
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
            if (like.userPhotoURL) {
                likers.push(like);
            }
        });

        return likers;

    } catch (error) {
        console.error('Erreur récupération likers:', error);
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
        console.error('Erreur comptage likes:', error);
        return 0;
    }
}

console.log('❤️ Système de likes initialisé');
