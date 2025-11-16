// ========================================
// IMPORTS FIREBASE V10 (ES MODULES)
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    updateEmail,
    updatePassword,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendEmailVerification
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

// Initialiser Auth et Firestore
const auth = getAuth(app);

import {
    getFirestore,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const db = getFirestore(app);

// ========================================
// ÉLÉMENTS DOM - INFORMATIONS
// ========================================

const loading = document.getElementById('loading');
const dashboardContent = document.getElementById('dashboard-content');
const userEmail = document.getElementById('user-email');
const userUid = document.getElementById('user-uid');
const userProvider = document.getElementById('user-provider');
const userCreated = document.getElementById('user-created');
const userEmailVerified = document.getElementById('user-email-verified');
const logoutBtn = document.getElementById('logout-btn');
const adminPanelBtn = document.getElementById('admin-panel-btn');

// ========================================
// ÉLÉMENTS DOM - PROFIL
// ========================================

// Modification d'email
const updateEmailForm = document.getElementById('update-email-form');
const newEmailInput = document.getElementById('new-email');
const emailPasswordInput = document.getElementById('email-password');
const updateEmailBtn = document.getElementById('update-email-btn');

// Modification de mot de passe
const updatePasswordForm = document.getElementById('update-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const updatePasswordBtn = document.getElementById('update-password-btn');

// Modification de photo
const updatePhotoForm = document.getElementById('update-photo-form');
const photoUrlInput = document.getElementById('photo-url');
const displayNameInput = document.getElementById('display-name');
const updatePhotoBtn = document.getElementById('update-photo-btn');
const userPhoto = document.getElementById('user-photo');

// Bouton de vérification d'email
const verifyEmailBtn = document.getElementById('verify-email-btn');

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Affiche un message de succès
 */
function showSuccess(message) {
    alert('✅ ' + message);
}

/**
 * Affiche un message d'erreur
 */
function showError(message) {
    alert('❌ ' + message);
}

/**
 * Active/désactive le loader sur un bouton
 */
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.textContent = 'Chargement...';
    } else {
        button.disabled = false;
        button.style.opacity = '1';
    }
}

/**
 * Ré-authentifie l'utilisateur avant une opération sensible
 * @param {string} password - Le mot de passe actuel
 * @returns {Promise<boolean>} - true si succès
 */
async function reauthenticate(password) {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, password);

    try {
        await reauthenticateWithCredential(user, credential);
        return true;
    } catch (error) {
        console.error('❌ Erreur de ré-authentification:', error);
        if (error.code === 'auth/wrong-password') {
            showError('Mot de passe actuel incorrect.');
        } else if (error.code === 'auth/too-many-requests') {
            showError('Trop de tentatives. Veuillez réessayer plus tard.');
        } else {
            showError('Erreur de vérification. Réessayez.');
        }
        return false;
    }
}

// ========================================
// AFFICHAGE DES INFORMATIONS UTILISATEUR
// ========================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // L'utilisateur est connecté - afficher les infos
        console.log('✅ Utilisateur connecté:', user);

        // Vérifier si l'utilisateur est admin
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            if (userData && userData.isAdmin === true) {
                // L'utilisateur est admin - afficher le bouton Panel Admin
                if (adminPanelBtn) {
                    adminPanelBtn.style.display = 'inline-block';
                }
                console.log('🔑 Utilisateur est ADMIN');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification admin:', error);
        }

        // Remplir les informations
        userEmail.textContent = user.email || 'Non disponible';
        userUid.textContent = user.uid;

        // Vérification d'email
        userEmailVerified.textContent = user.emailVerified ? '✅ Vérifié' : '❌ Non vérifié';
        userEmailVerified.style.color = user.emailVerified ? '#52c41a' : '#ff4d4f';

        // Afficher/masquer le bouton de vérification d'email
        if (!user.emailVerified && verifyEmailBtn) {
            verifyEmailBtn.style.display = 'inline-block';
        }

        // Déterminer le provider
        const providerData = user.providerData[0];
        let provider = 'Email/Password';
        if (providerData) {
            if (providerData.providerId === 'google.com') {
                provider = 'Google';
            }
        }
        userProvider.textContent = provider;

        // Date de création
        const createdDate = new Date(user.metadata.creationTime);
        userCreated.textContent = createdDate.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Photo de profil
        if (user.photoURL) {
            userPhoto.src = user.photoURL;
            userPhoto.style.display = 'block';
        }

        // Pré-remplir les champs de profil
        if (displayNameInput) displayNameInput.value = user.displayName || '';
        if (photoUrlInput) photoUrlInput.value = user.photoURL || '';

        // Afficher le contenu
        loading.style.display = 'none';
        dashboardContent.style.display = 'block';

    } else {
        // L'utilisateur n'est pas connecté - rediriger
        console.log('❌ Aucun utilisateur connecté');
        window.location.href = 'login.html';
    }
});

// ========================================
// DÉCONNEXION
// ========================================

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('✅ Déconnexion réussie');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        showError('Erreur lors de la déconnexion: ' + error.message);
    }
});

// ========================================
// VÉRIFICATION D'EMAIL
// ========================================

if (verifyEmailBtn) {
    verifyEmailBtn.addEventListener('click', async () => {
        const user = auth.currentUser;

        try {
            await sendEmailVerification(user);
            showSuccess('Email de vérification envoyé! Vérifiez votre boîte de réception.');
            console.log('✅ Email de vérification envoyé');
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            if (error.code === 'auth/too-many-requests') {
                showError('Trop de demandes. Veuillez réessayer plus tard.');
            } else {
                showError('Erreur lors de l\'envoi de l\'email.');
            }
        }
    });
}

// ========================================
// MODIFICATION D'EMAIL
// ========================================

if (updateEmailForm) {
    updateEmailForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newEmail = newEmailInput.value.trim();
        const password = emailPasswordInput.value;

        if (!newEmail || !password) {
            showError('Veuillez remplir tous les champs.');
            return;
        }

        setButtonLoading(updateEmailBtn, true);

        // Ré-authentifier l'utilisateur
        const reauth = await reauthenticate(password);

        if (!reauth) {
            setButtonLoading(updateEmailBtn, false);
            return;
        }

        try {
            const user = auth.currentUser;
            await updateEmail(user, newEmail);

            showSuccess('Email modifié avec succès! Veuillez vous reconnecter.');
            console.log('✅ Email modifié:', newEmail);

            // Déconnexion et redirection
            await signOut(auth);
            window.location.href = 'login.html';

        } catch (error) {
            console.error('❌ Erreur modification email:', error);

            if (error.code === 'auth/email-already-in-use') {
                showError('Cet email est déjà utilisé.');
            } else if (error.code === 'auth/invalid-email') {
                showError('Adresse email invalide.');
            } else {
                showError('Erreur lors de la modification de l\'email.');
            }

            setButtonLoading(updateEmailBtn, false);
        }
    });
}

// ========================================
// MODIFICATION DE MOT DE PASSE
// ========================================

if (updatePasswordForm) {
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmNewPasswordInput.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('Veuillez remplir tous les champs.');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('Les nouveaux mots de passe ne correspondent pas.');
            return;
        }

        if (newPassword.length < 6) {
            showError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setButtonLoading(updatePasswordBtn, true);

        // Ré-authentifier l'utilisateur
        const reauth = await reauthenticate(currentPassword);

        if (!reauth) {
            setButtonLoading(updatePasswordBtn, false);
            return;
        }

        try {
            const user = auth.currentUser;
            await updatePassword(user, newPassword);

            showSuccess('Mot de passe modifié avec succès!');
            console.log('✅ Mot de passe modifié');

            // Vider les champs
            updatePasswordForm.reset();
            setButtonLoading(updatePasswordBtn, false);

        } catch (error) {
            console.error('❌ Erreur modification mot de passe:', error);

            if (error.code === 'auth/weak-password') {
                showError('Le mot de passe est trop faible.');
            } else {
                showError('Erreur lors de la modification du mot de passe.');
            }

            setButtonLoading(updatePasswordBtn, false);
        }
    });
}

// ========================================
// MODIFICATION DE PHOTO ET NOM
// ========================================

if (updatePhotoForm) {
    updatePhotoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const photoURL = photoUrlInput.value.trim();
        const displayName = displayNameInput.value.trim();

        if (!photoURL && !displayName) {
            showError('Veuillez remplir au moins un champ.');
            return;
        }

        setButtonLoading(updatePhotoBtn, true);

        try {
            const user = auth.currentUser;
            const updates = {};

            if (displayName) updates.displayName = displayName;
            if (photoURL) updates.photoURL = photoURL;

            await updateProfile(user, updates);

            showSuccess('Profil modifié avec succès!');
            console.log('✅ Profil modifié');

            // Mettre à jour l'affichage de la photo
            if (photoURL) {
                userPhoto.src = photoURL;
                userPhoto.style.display = 'block';
            }

            setButtonLoading(updatePhotoBtn, false);

        } catch (error) {
            console.error('❌ Erreur modification profil:', error);
            showError('Erreur lors de la modification du profil.');
            setButtonLoading(updatePhotoBtn, false);
        }
    });
}

console.log('🔥 Dashboard Firebase initialisé');
