// ========================================
// SCANNER DETECTOR - Détection du rôle scanner
// ========================================

import { authService } from './src/services/auth.service.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Surveiller l'état de connexion et vérifier le rôle
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        // Vérifier si l'utilisateur a le rôle scanner
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (userData && userData.isScanner === true) {
            // Afficher le bouton scanner s'il existe
            const scannerBtn = document.getElementById('scanner-btn');
            if (scannerBtn) {
                scannerBtn.style.display = 'inline-block';
            }

            // Afficher le lien dans le menu si disponible
            const scannerNavLink = document.getElementById('scanner-nav-link');
            if (scannerNavLink) {
                scannerNavLink.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.error('Erreur détection scanner:', error);
    }
});

console.log('✅ Scanner Detector loaded');
