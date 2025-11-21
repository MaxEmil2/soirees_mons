// ========================================
// IMPORTS - ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { toast } from './src/components/Toast.js';
import { showSuccess } from './modal-utils.js';

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
 * Redirige vers le dashboard après inscription réussie
 * @param {object} user - L'utilisateur connecté
 * @param {boolean} emailSent - Si l'email de vérification a été envoyé
 */
function redirectToDashboard(user, emailSent = false) {
    // Afficher message si email envoyé
    if (emailSent) {
        showSuccess('Inscription réussie ! Un email de vérification vous a été envoyé. Vérifiez votre boîte de réception.', () => {
            window.location.href = 'index.html';
        });
    } else {
        // Redirection vers l'accueil
        window.location.href = 'index.html';
    }
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
        // Créer le compte avec authService (architecture sécurisée)
        // AuthService gère automatiquement:
        // - La création du compte Firebase
        // - L'enregistrement dans Firestore
        // - L'envoi de l'email de vérification
        // - La gestion des rôles
        const result = await authService.signUpWithEmail(email, password, email.split('@')[0]);

        if (result.success) {
            // Inscription réussie
            toast.success('Inscription réussie ! Bienvenue sur Soirées Mons.');

            // Redirection avec message de vérification email
            setTimeout(() => {
                redirectToDashboard(result.user, true);
            }, 500);
        } else {
            // Erreur retournée par le service
            showError(result.error);
            setButtonLoading(signupBtn, false);
        }

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);

        // Afficher l'erreur à l'utilisateur
        showError('Une erreur inattendue est survenue. Veuillez réessayer.');

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
        // Inscription Google avec authService (architecture sécurisée)
        // AuthService gère automatiquement:
        // - La popup Google
        // - L'enregistrement dans Firestore
        // - La gestion des rôles
        const result = await authService.signInWithGoogle();

        if (result.success) {
            // Inscription/Connexion Google réussie
            toast.success('Connexion Google réussie ! Bienvenue ' + result.user.displayName);

            // Redirection après un court délai
            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 500);
        } else {
            // Erreur retournée par le service
            showError(result.error);
            setButtonLoading(googleSignupBtn, false);
        }

    } catch (error) {
        console.error('Erreur lors de l\'inscription Google:', error);

        // Afficher l'erreur
        showError('Erreur d\'inscription Google. Veuillez réessayer.');

        // Désactiver le loader
        setButtonLoading(googleSignupBtn, false);
    }
});

// ========================================
// VÉRIFICATION DE L'ÉTAT D'AUTHENTIFICATION
// ========================================

// Surveiller l'état de connexion au chargement de la page
// Si l'utilisateur est déjà connecté, rediriger automatiquement
window.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'utilisateur est déjà authentifié
    if (authService.isAuthenticated()) {
        const user = authService.currentUser;

        // L'utilisateur est déjà connecté
        console.log('Utilisateur déjà connecté:', user.email);

        // Rediriger vers le dashboard si on est sur la page d'inscription
        if (window.location.pathname.includes('signup.html')) {
            redirectToDashboard(user);
        }
    }
});

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ Signup page loaded - Architecture sécurisée V2');
console.log('🔐 AuthService initialisé');
