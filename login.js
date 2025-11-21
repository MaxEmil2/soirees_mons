// ========================================
// IMPORTS - ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { toast } from './src/components/Toast.js';

// ========================================
// ÉLÉMENTS DOM
// ========================================

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
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
 * Redirige vers la page d'accueil après connexion réussie
 * @param {object} user - L'utilisateur connecté
 */
function redirectToHome(user) {
    window.location.href = 'index.html';
}

// ========================================
// CONNEXION EMAIL/MOT DE PASSE
// ========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation: champs vides
    if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    // Activer le loader
    setButtonLoading(loginBtn, true);

    try {
        // Connexion avec authService (architecture sécurisée)
        const result = await authService.signInWithEmail(email, password);

        if (result.success) {
            // Connexion réussie
            toast.success('Connexion réussie ! Bienvenue ' + result.user.displayName || result.user.email);

            // Redirection après un court délai pour montrer le toast
            setTimeout(() => {
                redirectToHome(result.user);
            }, 500);
        } else {
            // Erreur retournée par le service
            showError(result.error);
            setButtonLoading(loginBtn, false);
        }

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);

        // Afficher l'erreur à l'utilisateur
        showError('Une erreur inattendue est survenue. Veuillez réessayer.');

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
        // Connexion Google avec authService (architecture sécurisée)
        const result = await authService.signInWithGoogle();

        if (result.success) {
            // Connexion réussie
            toast.success('Connexion Google réussie ! Bienvenue ' + result.user.displayName);

            // Redirection après un court délai
            setTimeout(() => {
                redirectToHome(result.user);
            }, 500);
        } else {
            // Erreur retournée par le service
            showError(result.error);
            setButtonLoading(googleLoginBtn, false);
        }

    } catch (error) {
        console.error('Erreur lors de la connexion Google:', error);

        // Afficher l'erreur
        showError('Erreur de connexion Google. Veuillez réessayer.');

        // Désactiver le loader
        setButtonLoading(googleLoginBtn, false);
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

        // Rediriger vers l'accueil si on est sur la page de connexion
        if (window.location.pathname.includes('login.html')) {
            redirectToHome(user);
        }
    }
});

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ Login page loaded - Architecture sécurisée V2');
console.log('🔐 AuthService initialisé');
