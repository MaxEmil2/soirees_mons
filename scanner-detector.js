// ========================================
// SCANNER DETECTOR - Détecte si l'utilisateur est scanner
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// Vérifier si l'utilisateur est scanner
async function checkIfUserIsScanner(userId) {
    try {
        // Récupérer tous les événements approuvés
        const eventsQuery = query(
            collection(db, 'events'),
            where('status', '==', 'approved')
        );

        const querySnapshot = await getDocs(eventsQuery);

        // Vérifier si l'UID de l'utilisateur apparaît dans la liste des scanners
        for (const doc of querySnapshot.docs) {
            const event = doc.data();
            if (event.scanners && Array.isArray(event.scanners) && event.scanners.includes(userId)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Erreur lors de la vérification du statut scanner:', error);
        return false;
    }
}

// Afficher/masquer le lien Scanner
onAuthStateChanged(auth, async (user) => {
    const mobileMenuScanner = document.getElementById('mobile-menu-scanner');
    const desktopMenuScanner = document.getElementById('desktop-menu-scanner');

    if (user) {
        const isScanner = await checkIfUserIsScanner(user.uid);

        if (isScanner) {
            // Afficher le lien Scanner
            if (mobileMenuScanner) {
                mobileMenuScanner.style.display = 'flex';
            }
            if (desktopMenuScanner) {
                desktopMenuScanner.style.display = 'inline-block';
            }
            console.log('✅ Utilisateur est scanner - liens affichés');
        } else {
            // Masquer le lien Scanner
            if (mobileMenuScanner) {
                mobileMenuScanner.style.display = 'none';
            }
            if (desktopMenuScanner) {
                desktopMenuScanner.style.display = 'none';
            }
        }
    } else {
        // Utilisateur non connecté - masquer
        if (mobileMenuScanner) {
            mobileMenuScanner.style.display = 'none';
        }
        if (desktopMenuScanner) {
            desktopMenuScanner.style.display = 'none';
        }
    }
});
