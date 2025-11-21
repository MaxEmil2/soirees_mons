// ========================================
// FORGOT PASSWORD - ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { toast } from './src/components/Toast.js';

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
    if (successMessageDiv) successMessageDiv.style.display = 'none';
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.add('show');

        // Masquer automatiquement après 5 secondes
        setTimeout(() => {
            hideError();
        }, 5000);
    }
}

/**
 * Masque le message d'erreur
 */
function hideError() {
    if (errorMessageDiv) {
        errorMessageDiv.classList.remove('show');
    }
}

/**
 * Affiche un message de succès
 * @param {string} message - Le message de succès à afficher
 */
function showSuccess(message) {
    hideError();
    if (successMessageDiv) {
        successMessageDiv.textContent = message;
        successMessageDiv.style.display = 'block';
    }
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

// ========================================
// RÉINITIALISATION DU MOT DE PASSE
// ========================================

if (resetForm) {
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
            // Utiliser authService (architecture sécurisée)
            const result = await authService.resetPassword(email);

            if (result.success) {
                // Succès
                console.log('✅ Email de réinitialisation envoyé à:', email);

                // Afficher le message de succès
                showSuccess(`📧 Un email de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception.`);
                toast.success('Email de réinitialisation envoyé !');

                // Vider le champ
                emailInput.value = '';

                // Désactiver le loader
                setButtonLoading(resetBtn, false);

                // Rediriger vers la page de connexion après 5 secondes
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 5000);
            } else {
                // Erreur retournée par le service
                showError(result.error);
                setButtonLoading(resetBtn, false);
            }

        } catch (error) {
            console.error('❌ Erreur réinitialisation:', error);

            // Afficher l'erreur à l'utilisateur
            showError('Une erreur est survenue. Veuillez réessayer.');

            // Désactiver le loader
            setButtonLoading(resetBtn, false);
        }
    });
}

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ Password Reset page loaded - Architecture sécurisée V2');
console.log('🔐 AuthService initialisé');
