// ========================================
// IMPORTS FIREBASE V10 (ES MODULES)
// ========================================

// Import des fonctions Firebase nécessaires depuis le CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// ========================================
// CONFIGURATION FIREBASE
// ========================================

// Configuration Firebase - Soirées Mons
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

// Initialiser Firebase Authentication
const auth = getAuth(app);

// ========================================
// ÉLÉMENTS DOM
// ========================================

const resetForm = document.getElementById('reset-form');
const emailInput = document.getElementById('email');
const resetBtn = document.getElementById('reset-btn');
const errorMessageDiv = document.getElementById('error-message');
const successMessageDiv = document.getElementById('success-message');

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Affiche un message d'erreur à l'utilisateur
 * @param {string} message - Le message d'erreur à afficher
 */
function showError(message) {
    successMessageDiv.style.display = 'none';
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.add('show');

    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        hideError();
    }, 5000);
}

/**
 * Masque le message d'erreur
 */
function hideError() {
    errorMessageDiv.classList.remove('show');
}

/**
 * Affiche un message de succès
 * @param {string} message - Le message de succès à afficher
 */
function showSuccess(message) {
    hideError();
    successMessageDiv.textContent = message;
    successMessageDiv.style.display = 'block';
}

/**
 * Active l'état de chargement sur un bouton
 * @param {HTMLElement} button - Le bouton à modifier
 * @param {boolean} loading - État de chargement
 */
function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-block';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

/**
 * Traduit les codes d'erreur Firebase en messages français
 * @param {string} errorCode - Code d'erreur Firebase
 * @returns {string} Message d'erreur en français
 */
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/user-not-found': 'Aucun compte ne correspond à cet email.',
        'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard.',
        'auth/network-request-failed': 'Erreur de connexion. Vérifiez votre connexion internet.'
    };

    return errorMessages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
}

// ========================================
// RÉINITIALISATION DU MOT DE PASSE
// ========================================

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();

    // Validation basique
    if (!email) {
        showError('Veuillez entrer votre adresse email.');
        return;
    }

    // Activer le loader
    setButtonLoading(resetBtn, true);

    try {
        // Envoyer l'email de réinitialisation
        await sendPasswordResetEmail(auth, email);

        // Succès
        console.log('✅ Email de réinitialisation envoyé à:', email);

        // Afficher le message de succès
        showSuccess(`📧 Un email de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception.`);

        // Vider le champ
        emailInput.value = '';

        // Désactiver le loader
        setButtonLoading(resetBtn, false);

        // Rediriger vers la page de connexion après 5 secondes
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 5000);

    } catch (error) {
        console.error('❌ Erreur réinitialisation:', error);
        console.error('📌 Code d\'erreur:', error.code);
        console.error('📌 Message:', error.message);

        // Afficher l'erreur à l'utilisateur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(resetBtn, false);
    }
});

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('🔥 Firebase Password Reset initialisé');
console.log('📱 Version Firebase: 10.8.0');
