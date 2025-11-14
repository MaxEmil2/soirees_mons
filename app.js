// ========================================
// IMPORTS FIREBASE V10 (ES MODULES)
// ========================================

// Import des fonctions Firebase nécessaires depuis le CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// ========================================
// CONFIGURATION FIREBASE
// ========================================

// ⚠️ IMPORTANT: Remplacez ces valeurs par votre configuration Firebase
// Trouvable dans: Console Firebase > Paramètres du projet > Applications web
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "votre-project.firebaseapp.com",
    projectId: "votre-project-id",
    storageBucket: "votre-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firebase Authentication
const auth = getAuth(app);

// ========================================
// PROVIDERS D'AUTHENTIFICATION
// ========================================

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account' // Force l'utilisateur à choisir un compte
});

// Provider Apple
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ========================================
// ÉLÉMENTS DOM
// ========================================

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const appleLoginBtn = document.getElementById('apple-login-btn');
const errorMessageDiv = document.getElementById('error-message');

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Affiche un message d'erreur à l'utilisateur
 * @param {string} message - Le message d'erreur à afficher
 */
function showError(message) {
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
 * Active l'état de chargement sur un bouton
 * @param {HTMLElement} button - Le bouton à modifier
 * @param {boolean} loading - État de chargement
 */
function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text') || button.querySelector('span');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) {
            btnLoader.style.display = 'inline-block';
        } else {
            // Si pas de loader dans le bouton, on change juste le texte
            button.textContent = 'Connexion...';
        }
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
        'auth/user-disabled': 'Ce compte a été désactivé.',
        'auth/user-not-found': 'Aucun compte ne correspond à cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Identifiants invalides.',
        'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard.',
        'auth/network-request-failed': 'Erreur de connexion. Vérifiez votre connexion internet.',
        'auth/popup-closed-by-user': 'Connexion annulée.',
        'auth/popup-blocked': 'Popup bloquée. Autorisez les popups pour ce site.',
        'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet email via une autre méthode de connexion.',
        'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée.',
        'auth/cancelled-popup-request': 'Connexion annulée.'
    };

    return errorMessages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Redirige vers le dashboard après connexion réussie
 * @param {object} user - L'utilisateur connecté
 */
function redirectToDashboard(user) {
    console.log('✅ Utilisateur connecté:', user.email);

    // Redirection vers le dashboard
    window.location.href = 'dashboard.html';
}

// ========================================
// CONNEXION EMAIL/MOT DE PASSE
// ========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation basique
    if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    // Activer le loader
    setButtonLoading(loginBtn, true);

    try {
        // Tentative de connexion avec Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Connexion réussie
        redirectToDashboard(userCredential.user);

    } catch (error) {
        console.error('❌ Erreur de connexion:', error);

        // Afficher l'erreur à l'utilisateur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(loginBtn, false);
    }
});

// ========================================
// CONNEXION GOOGLE
// ========================================

googleLoginBtn.addEventListener('click', async () => {
    hideError();
    setButtonLoading(googleLoginBtn, true);

    try {
        // Ouvrir popup de connexion Google
        const result = await signInWithPopup(auth, googleProvider);

        // Connexion réussie
        console.log('✅ Connexion Google réussie');
        redirectToDashboard(result.user);

    } catch (error) {
        console.error('❌ Erreur connexion Google:', error);

        // Afficher l'erreur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(googleLoginBtn, false);
    }
});

// ========================================
// CONNEXION APPLE
// ========================================

appleLoginBtn.addEventListener('click', async () => {
    hideError();
    setButtonLoading(appleLoginBtn, true);

    try {
        // Ouvrir popup de connexion Apple
        const result = await signInWithPopup(auth, appleProvider);

        // Connexion réussie
        console.log('✅ Connexion Apple réussie');
        redirectToDashboard(result.user);

    } catch (error) {
        console.error('❌ Erreur connexion Apple:', error);

        // Afficher l'erreur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(appleLoginBtn, false);
    }
});

// ========================================
// VÉRIFICATION DE L'ÉTAT D'AUTHENTIFICATION
// ========================================

// Surveiller l'état de connexion
// Si l'utilisateur est déjà connecté, rediriger automatiquement
onAuthStateChanged(auth, (user) => {
    if (user) {
        // L'utilisateur est connecté
        console.log('✅ Utilisateur déjà connecté:', user.email);

        // Rediriger vers le dashboard si on est sur la page de connexion
        if (window.location.pathname.includes('index.html') ||
            window.location.pathname.endsWith('/')) {
            redirectToDashboard(user);
        }
    } else {
        // L'utilisateur n'est pas connecté
        console.log('ℹ️ Aucun utilisateur connecté');
    }
});

// ========================================
// GESTION DU LIEN D'INSCRIPTION (OPTIONNEL)
// ========================================

const signupLink = document.getElementById('signup-link');
if (signupLink) {
    signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Fonctionnalité d\'inscription à implémenter. Utilisez createUserWithEmailAndPassword() de Firebase Auth.');
        // Vous pouvez créer une page signup.html séparée avec createUserWithEmailAndPassword
    });
}

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('🔥 Firebase Authentication initialisé');
console.log('📱 Version Firebase: 10.8.0');
console.log('⚠️  N\'oubliez pas de remplacer firebaseConfig avec vos vraies valeurs!');
