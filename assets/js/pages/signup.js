/*
 * SIGNUP - PAGE JAVASCRIPT
 * Professional signup page with email/password and Google OAuth
 */

import { auth } from '/assets/js/core/firebase-config.js';
import { signUpWithEmail, signInWithGoogle } from '/assets/js/core/auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    signupForm: document.getElementById('signup-form'),
    nameInput: document.getElementById('name'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    confirmPasswordInput: document.getElementById('confirm-password'),
    signupBtn: document.getElementById('signup-btn'),
    googleSignupBtn: document.getElementById('google-signup-btn'),
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
            button.textContent = 'Création...';
        }
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function redirectAfterSignup() {
    window.location.href = '/index.html';
}

function validatePassword(password) {
    if (password.length < 6) {
        return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    return null;
}

// ==========================================
// EMAIL/PASSWORD SIGNUP
// ==========================================

elements.signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = elements.nameInput.value.trim();
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    const confirmPassword = elements.confirmPasswordInput.value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showError('Veuillez remplir tous les champs.');
        return;
    }

    if (name.length < 2) {
        showError('Le nom doit contenir au moins 2 caractères.');
        return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
        showError(passwordError);
        return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas.');
        return;
    }

    // Set loading state
    setButtonLoading(elements.signupBtn, true);

    try {
        // Sign up with centralized auth service
        const result = await signUpWithEmail(email, password, name);

        if (result.success) {
            // Success - redirect
            redirectAfterSignup();
        } else {
            // Show error
            showError(result.error);
            setButtonLoading(elements.signupBtn, false);
        }

    } catch (error) {
        console.error('Signup error:', error);
        showError('Une erreur est survenue. Veuillez réessayer.');
        setButtonLoading(elements.signupBtn, false);
    }
});

// ==========================================
// GOOGLE SIGNUP
// ==========================================

elements.googleSignupBtn.addEventListener('click', async () => {
    hideError();
    setButtonLoading(elements.googleSignupBtn, true);

    try {
        // Sign in with Google via centralized auth service
        const result = await signInWithGoogle();

        if (result.success) {
            // Success - redirect
            redirectAfterSignup();
        } else {
            // Show error
            showError(result.error);
            setButtonLoading(elements.googleSignupBtn, false);
        }

    } catch (error) {
        console.error('Google signup error:', error);
        showError('Une erreur est survenue lors de l\'inscription Google.');
        setButtonLoading(elements.googleSignupBtn, false);
    }
});

// ==========================================
// AUTH STATE LISTENER
// ==========================================

// If user is already logged in, redirect automatically
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is already logged in - redirect
        if (window.location.pathname.includes('signup')) {
            redirectAfterSignup();
        }
    }
});
