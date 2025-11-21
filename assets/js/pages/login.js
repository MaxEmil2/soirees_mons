/*
 * LOGIN - PAGE JAVASCRIPT
 * Professional login page with email/password and Google OAuth
 */

import { auth } from '/assets/js/core/firebase-config.js';
import { signInWithEmail, signInWithGoogle } from '/assets/js/core/auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// ==========================================
// STATE
// ==========================================

const state = {
    isLoading: false
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    loginForm: document.getElementById('login-form'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    errorMessageDiv: document.getElementById('error-message')
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showError(message) {
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

function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text') || button.querySelector('span');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) {
            btnLoader.style.display = 'inline-block';
        } else {
            button.textContent = 'Connexion...';
        }
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function redirectAfterLogin() {
    // Check if there's a redirect parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');

    if (redirect) {
        window.location.href = `/${redirect}.html`;
    } else {
        window.location.href = '/index.html';
    }
}

// ==========================================
// EMAIL/PASSWORD LOGIN
// ==========================================

elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    // Validation
    if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    // Set loading state
    setButtonLoading(elements.loginBtn, true);

    try {
        // Sign in with centralized auth service
        const result = await signInWithEmail(email, password);

        if (result.success) {
            // Success - redirect
            redirectAfterLogin();
        } else {
            // Show error
            showError(result.error);
            setButtonLoading(elements.loginBtn, false);
        }

    } catch (error) {
        console.error('Login error:', error);
        showError('Une erreur est survenue. Veuillez réessayer.');
        setButtonLoading(elements.loginBtn, false);
    }
});

// ==========================================
// GOOGLE LOGIN
// ==========================================

elements.googleLoginBtn.addEventListener('click', async () => {
    hideError();
    setButtonLoading(elements.googleLoginBtn, true);

    try {
        // Sign in with Google via centralized auth service
        const result = await signInWithGoogle();

        if (result.success) {
            // Success - redirect
            redirectAfterLogin();
        } else {
            // Show error
            showError(result.error);
            setButtonLoading(elements.googleLoginBtn, false);
        }

    } catch (error) {
        console.error('Google login error:', error);
        showError('Une erreur est survenue lors de la connexion Google.');
        setButtonLoading(elements.googleLoginBtn, false);
    }
});

// ==========================================
// AUTH STATE LISTENER
// ==========================================

// If user is already logged in, redirect automatically
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is already logged in - redirect
        if (window.location.pathname.includes('login')) {
            redirectAfterLogin();
        }
    }
});
