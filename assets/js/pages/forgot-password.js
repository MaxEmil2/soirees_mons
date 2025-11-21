/*
 * FORGOT PASSWORD - PAGE JAVASCRIPT
 * Professional password reset page
 */

import { auth } from '/assets/js/core/firebase-config.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    resetForm: document.getElementById('reset-form'),
    emailInput: document.getElementById('email'),
    resetBtn: document.getElementById('reset-btn'),
    errorMessageDiv: document.getElementById('error-message'),
    successMessageDiv: document.getElementById('success-message')
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showError(message) {
    hideSuccess();
    elements.errorMessageDiv.textContent = message;
    elements.errorMessageDiv.classList.add('show');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    elements.errorMessageDiv.classList.remove('show');
}

function showSuccess(message) {
    hideError();
    elements.successMessageDiv.textContent = message;
    elements.successMessageDiv.classList.add('show');
}

function hideSuccess() {
    elements.successMessageDiv.classList.remove('show');
}

function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text') || button.querySelector('span');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) {
            btnLoader.style.display = 'inline-block';
        } else {
            button.textContent = 'Envoi...';
        }
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
        'auth/network-request-failed': 'Erreur de connexion. Vérifiez votre connexion internet.'
    };

    return errorMessages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
}

// ==========================================
// PASSWORD RESET
// ==========================================

elements.resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    hideSuccess();

    const email = elements.emailInput.value.trim();

    // Validation
    if (!email) {
        showError('Veuillez entrer votre adresse email.');
        return;
    }

    // Set loading state
    setButtonLoading(elements.resetBtn, true);

    try {
        // Send password reset email
        await sendPasswordResetEmail(auth, email);

        // Success
        setButtonLoading(elements.resetBtn, false);
        showSuccess('Un email de réinitialisation a été envoyé à votre adresse email.');

        // Clear input
        elements.emailInput.value = '';

        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);

    } catch (error) {
        console.error('Password reset error:', error);
        showError(getErrorMessage(error.code));
        setButtonLoading(elements.resetBtn, false);
    }
});
