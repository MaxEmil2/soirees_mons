// ========================================
// IMPORTS FIREBASE V10 (ES MODULES)
// ========================================

// Import des fonctions Firebase nécessaires depuis le CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// Initialiser Firestore
const db = getFirestore(app);

// ========================================
// PROVIDERS D'AUTHENTIFICATION
// ========================================

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account' // Force l'utilisateur à choisir un compte
});

// ========================================
// ÉLÉMENTS DOM
// ========================================

const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const signupBtn = document.getElementById('signup-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');
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
            button.textContent = 'Inscription...';
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
        'auth/email-already-in-use': 'Cet email est déjà utilisé. Veuillez vous connecter.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/operation-not-allowed': 'Opération non autorisée.',
        'auth/weak-password': 'Le mot de passe est trop faible. Utilisez au moins 6 caractères.',
        'auth/network-request-failed': 'Erreur de connexion. Vérifiez votre connexion internet.',
        'auth/popup-closed-by-user': 'Inscription annulée.',
        'auth/popup-blocked': 'Popup bloquée. Autorisez les popups pour ce site.',
        'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet email via une autre méthode.',
        'auth/cancelled-popup-request': 'Inscription annulée.'
    };

    return errorMessages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Enregistre les données de l'utilisateur dans Firestore
 * @param {object} user - L'utilisateur Firebase
 * @param {string} provider - Le provider utilisé ('email' ou 'google')
 */
async function saveUserToFirestore(user, provider) {
    try {
        // Référence au document utilisateur dans Firestore
        const userRef = doc(db, 'users', user.uid);

        // Données à enregistrer
        const userData = {
            uid: user.uid,
            email: user.email,
            dateCreation: serverTimestamp(),
            provider: provider
        };

        // Enregistrer dans Firestore
        await setDoc(userRef, userData);

        console.log('✅ Utilisateur enregistré dans Firestore:', user.uid);
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement dans Firestore:', error);
        // On ne bloque pas l'utilisateur même si Firestore échoue
    }
}

/**
 * Envoie un email de vérification à l'utilisateur
 * @param {object} user - L'utilisateur Firebase
 */
async function sendVerificationEmail(user) {
    try {
        await sendEmailVerification(user);
        console.log('✅ Email de vérification envoyé à:', user.email);
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi email de vérification:', error);
        return false;
    }
}

/**
 * Redirige vers le dashboard après inscription réussie
 * @param {object} user - L'utilisateur connecté
 * @param {boolean} emailSent - Si l'email de vérification a été envoyé
 */
function redirectToDashboard(user, emailSent = false) {
    console.log('✅ Inscription réussie:', user.email);

    // Afficher message si email envoyé
    if (emailSent) {
        alert('✅ Inscription réussie ! Un email de vérification vous a été envoyé. Vérifiez votre boîte de réception.');
    }

    // Redirection vers l'accueil
    window.location.href = 'index.html';
}

// ========================================
// INSCRIPTION EMAIL/MOT DE PASSE
// ========================================

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validation: champs vides
    if (!email || !password || !confirmPassword) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    // Validation: mots de passe correspondent
    if (password !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas.');
        return;
    }

    // Validation: longueur du mot de passe
    if (password.length < 6) {
        showError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
    }

    // Activer le loader
    setButtonLoading(signupBtn, true);

    try {
        // Créer le compte utilisateur avec Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Envoyer l'email de vérification
        const emailSent = await sendVerificationEmail(userCredential.user);

        // Enregistrer l'utilisateur dans Firestore
        await saveUserToFirestore(userCredential.user, 'email');

        // Inscription réussie - redirection
        redirectToDashboard(userCredential.user, emailSent);

    } catch (error) {
        console.error('❌ Erreur d\'inscription:', error);
        console.error('📌 Code d\'erreur:', error.code);
        console.error('📌 Message:', error.message);

        // Afficher l'erreur à l'utilisateur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(signupBtn, false);
    }
});

// ========================================
// INSCRIPTION GOOGLE
// ========================================

googleSignupBtn.addEventListener('click', async () => {
    hideError();
    setButtonLoading(googleSignupBtn, true);

    try {
        // Ouvrir popup d'inscription Google
        const result = await signInWithPopup(auth, googleProvider);

        // Enregistrer l'utilisateur dans Firestore
        await saveUserToFirestore(result.user, 'google');

        // Inscription réussie
        console.log('✅ Inscription Google réussie');
        redirectToDashboard(result.user);

    } catch (error) {
        console.error('❌ Erreur inscription Google:', error);
        console.error('📌 Code d\'erreur:', error.code);
        console.error('📌 Message:', error.message);

        // Afficher l'erreur
        showError(getErrorMessage(error.code));

        // Désactiver le loader
        setButtonLoading(googleSignupBtn, false);
    }
});

// ========================================
// VÉRIFICATION DE L'ÉTAT D'AUTHENTIFICATION
// ========================================

// Surveiller l'état de connexion
// Si l'utilisateur est déjà connecté, rediriger automatiquement
onAuthStateChanged(auth, (user) => {
    if (user) {
        // L'utilisateur est déjà connecté
        console.log('✅ Utilisateur déjà connecté:', user.email);

        // Rediriger vers le dashboard si on est sur la page d'inscription
        if (window.location.pathname.includes('signup.html')) {
            redirectToDashboard(user);
        }
    } else {
        // L'utilisateur n'est pas connecté
        console.log('ℹ️ Aucun utilisateur connecté');
    }
});

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('🔥 Firebase Authentication & Firestore initialisés');
console.log('📱 Version Firebase: 10.8.0');
console.log('🗄️ Base de données: Firestore activée');
