// ========================================
// IMPORTS - ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { eventsService } from './src/services/events.service.js';
import { storageService } from './src/services/storage.service.js';
import { toast } from './src/components/Toast.js';
import { showSuccess, showError, showWarning } from './modal-utils.js';

// Firebase direct imports (pour certaines fonctionnalités spécifiques)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAY6S4OsO6iqrgY1EH1Z-cYLe_OWTnPxRg",
    authDomain: "soirees-mons-6ce3e.firebaseapp.com",
    projectId: "soirees-mons-6ce3e",
    storageBucket: "soirees-mons-6ce3e.firebasestorage.app",
    messagingSenderId: "3405335068",
    appId: "1:3405335068:web:394c536d95a33069d66dd9",
    measurementId: "G-526CPT4LQ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');

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

// Modification d'email (ancien dashboard)
const updateEmailForm = document.getElementById('update-email-form');
const newEmailInput = document.getElementById('new-email');
const emailPasswordInput = document.getElementById('email-password');
const updateEmailBtn = document.getElementById('update-email-btn');

// Modification de mot de passe (ancien dashboard)
const updatePasswordForm = document.getElementById('update-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const updatePasswordBtn = document.getElementById('update-password-btn');

// Modification de photo (ancien dashboard)
const updatePhotoForm = document.getElementById('update-photo-form');
const photoUrlInput = document.getElementById('photo-url');
const displayNameInput = document.getElementById('display-name');
const updatePhotoBtn = document.getElementById('update-photo-btn');

// Bouton de vérification d'email (ancien dashboard)
const verifyEmailBtn = document.getElementById('verify-email-btn');

// Nouveaux éléments pour le redesign
const userPseudo = document.getElementById('user-pseudo');
const profilePhoto = document.getElementById('profile-photo');
const photoContainer = document.getElementById('photo-container');
const photoInput = document.getElementById('photo-input');
const adminBtn = document.getElementById('admin-btn');

// Modals
const editPseudoModal = document.getElementById('edit-pseudo-modal');
const editPasswordModal = document.getElementById('edit-password-modal');
const editPseudoBtn = document.getElementById('edit-pseudo');
const editPasswordBtn = document.getElementById('edit-password');

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

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

// ========================================
// DÉCONNEXION
// ========================================

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            // Utiliser authService pour la déconnexion (architecture sécurisée)
            const result = await authService.signOut();

            if (result.success) {
                toast.success('Déconnexion réussie');
                window.location.href = 'login.html';
            } else {
                showError('Erreur lors de la déconnexion: ' + result.error);
            }
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            showError('Erreur lors de la déconnexion');
        }
    });
}

// ========================================
// VÉRIFICATION D'EMAIL
// ========================================

if (verifyEmailBtn) {
    verifyEmailBtn.addEventListener('click', async () => {
        try {
            // Utiliser authService (architecture sécurisée)
            await authService.sendEmailVerification();
            showSuccess('Email de vérification envoyé! Vérifiez votre boîte de réception.');
        } catch (error) {
            showError('Erreur lors de l\'envoi de l\'email.');
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

        try {
            // Utiliser authService (architecture sécurisée)
            const result = await authService.updateEmail(newEmail, password);

            if (result.success) {
                showSuccess('Email modifié avec succès! Veuillez vous reconnecter.');

                // Déconnexion et redirection
                await authService.signOut();
                window.location.href = 'login.html';
            } else {
                showError(result.error);
                setButtonLoading(updateEmailBtn, false);
            }

        } catch (error) {
            console.error('Erreur modification email:', error);
            showError('Erreur lors de la modification de l\'email.');
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

        try {
            // Utiliser authService (architecture sécurisée)
            const result = await authService.updatePassword(currentPassword, newPassword);

            if (result.success) {
                showSuccess('Mot de passe modifié avec succès!');
                updatePasswordForm.reset();
                setButtonLoading(updatePasswordBtn, false);
            } else {
                showError(result.error);
                setButtonLoading(updatePasswordBtn, false);
            }

        } catch (error) {
            console.error('Erreur modification mot de passe:', error);
            showError('Erreur lors de la modification du mot de passe.');
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
            // Utiliser authService (architecture sécurisée)
            const updates = {};
            if (displayName) updates.displayName = displayName;
            if (photoURL) updates.photoURL = photoURL;

            const result = await authService.updateProfile(updates);

            if (result.success) {
                showSuccess('Profil modifié avec succès!');

                // Mettre à jour l'affichage de la photo
                if (photoURL && profilePhoto) {
                    profilePhoto.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;
                }

                setButtonLoading(updatePhotoBtn, false);
            } else {
                showError(result.error);
                setButtonLoading(updatePhotoBtn, false);
            }

        } catch (error) {
            console.error('Erreur modification profil:', error);
            showError('Erreur lors de la modification du profil.');
            setButtonLoading(updatePhotoBtn, false);
        }
    });
}

// ========================================
// GESTION DU NOUVEAU DASHBOARD
// ========================================

// Observer l'état d'authentification
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (loading) loading.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';

    // Afficher les infos
    if (userUid) userUid.textContent = user.uid;
    if (userEmail) userEmail.textContent = user.email;
    if (userPseudo) {
        userPseudo.textContent = user.displayName || 'Aucun pseudo';
    }

    // Photo de profil
    if (user.photoURL && profilePhoto) {
        profilePhoto.innerHTML = `<img src="${user.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    // Vérifier si admin
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
            if (adminBtn) adminBtn.style.display = 'inline-block';
            if (adminPanelBtn) adminPanelBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Erreur vérification admin:', error);
    }

    // Initialiser la section Stripe après un court délai
    setTimeout(() => {
        initStripeSection(user.uid);
    }, 500);
});

// ========================================
// UPLOAD PHOTO DE PROFIL
// ========================================

if (photoContainer && photoInput) {
    photoContainer.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
            showError('Veuillez sélectionner une image (JPG, PNG, WebP)');
            return;
        }

        try {
            // Utiliser storageService pour l'upload (architecture sécurisée)
            // Le service gère automatiquement la compression et l'upload
            const result = await storageService.uploadProfilePhoto(file);

            if (result.success) {
                // Mettre à jour le profil avec la nouvelle photo
                const photoURL = result.url;

                // Mettre à jour Firebase Auth
                await authService.updateProfile({ photoURL });

                // Mettre à jour l'affichage
                if (profilePhoto) {
                    profilePhoto.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;
                }

                // Afficher le modal de succès
                const successModal = document.getElementById('photo-success-modal');
                if (successModal) {
                    successModal.classList.add('show');
                }

                // Mettre à jour Firestore
                try {
                    const userDocRef = doc(db, 'users', authService.currentUser.uid);
                    await updateDoc(userDocRef, { photoURL });
                } catch (firestoreError) {
                    console.error('Erreur mise à jour Firestore:', firestoreError);
                }

                // Mettre à jour les likes en arrière-plan
                try {
                    const likesQuery = query(
                        collection(db, 'likes'),
                        where('userId', '==', authService.currentUser.uid)
                    );
                    const likesSnapshot = await getDocs(likesQuery);

                    const updatePromises = [];
                    likesSnapshot.forEach((likeDoc) => {
                        updatePromises.push(
                            updateDoc(doc(db, 'likes', likeDoc.id), {
                                userPhotoURL: photoURL
                            })
                        );
                    });

                    await Promise.all(updatePromises);
                } catch (likesError) {
                    console.error('Erreur mise à jour likes:', likesError);
                }

            } else {
                showError(result.error || 'Impossible de télécharger la photo.');
            }

        } catch (error) {
            console.error('Erreur upload photo:', error);
            showError('Impossible de télécharger la photo. Vérifiez votre connexion et réessayez.');
        }
    });
}

// ========================================
// MODAL ÉDITION PSEUDO
// ========================================

if (editPseudoBtn && editPseudoModal) {
    editPseudoBtn.addEventListener('click', () => {
        editPseudoModal.classList.add('show');
        const newPseudoInput = document.getElementById('new-pseudo');
        if (newPseudoInput) {
            newPseudoInput.value = authService.currentUser?.displayName || '';
        }
    });
}

const editPseudoForm = document.getElementById('edit-pseudo-form');
if (editPseudoForm) {
    editPseudoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPseudo = document.getElementById('new-pseudo').value.trim();

        try {
            // Utiliser authService (architecture sécurisée)
            const result = await authService.updateProfile({ displayName: newPseudo });

            if (result.success) {
                if (userPseudo) userPseudo.textContent = newPseudo;
                if (editPseudoModal) editPseudoModal.classList.remove('show');
                showSuccess('Pseudo mis à jour !');
            } else {
                showError(result.error);
            }
        } catch (error) {
            console.error('Erreur mise à jour pseudo:', error);
            showError('Erreur lors de la mise à jour');
        }
    });
}

// ========================================
// MODAL ÉDITION MOT DE PASSE
// ========================================

if (editPasswordBtn && editPasswordModal) {
    editPasswordBtn.addEventListener('click', () => {
        editPasswordModal.classList.add('show');
    });
}

const editPasswordFormModal = document.getElementById('edit-password-form');
if (editPasswordFormModal) {
    editPasswordFormModal.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password')?.value;
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;

        if (newPassword !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            // Utiliser authService (architecture sécurisée)
            const result = await authService.updatePassword(currentPassword, newPassword);

            if (result.success) {
                if (editPasswordModal) editPasswordModal.classList.remove('show');
                showSuccess('Mot de passe mis à jour !');
                editPasswordFormModal.reset();
            } else {
                showError(result.error);
            }
        } catch (error) {
            console.error('Erreur mise à jour mot de passe:', error);
            showError('Mot de passe actuel incorrect ou erreur');
        }
    });
}

// ========================================
// STRIPE CONNECT SECTION
// ========================================

const stripeConnectSection = document.getElementById('stripe-connect-section');
const stripeStatus = document.getElementById('stripe-status');
const setupStripeBtn = document.getElementById('setup-stripe-btn');
const scannerBtn = document.getElementById('scanner-btn');

/**
 * Vérifier si l'utilisateur a des événements avec préventes
 */
async function checkUserHasPresalesEvents(userId) {
    try {
        // Utiliser eventsService (architecture sécurisée)
        const result = await eventsService.getMyEvents(userId);

        if (result.success) {
            // Vérifier si au moins un événement a des préventes
            return result.events.some(event => event.presales === true);
        }

        return false;
    } catch (error) {
        console.error('Erreur vérification événements:', error);
        return false;
    }
}

/**
 * Vérifier le statut du compte Stripe
 */
async function checkStripeStatus() {
    try {
        const checkStripeAccountStatus = httpsCallable(functions, 'checkStripeAccountStatus');
        const result = await checkStripeAccountStatus();
        return result.data;
    } catch (error) {
        console.error('Erreur vérification statut Stripe:', error);
        return { status: 'error', canReceivePayments: false };
    }
}

/**
 * Afficher le statut Stripe
 */
function displayStripeStatus(status) {
    if (!stripeStatus || !setupStripeBtn) return;

    if (status.canReceivePayments) {
        stripeStatus.style.background = 'rgba(82, 196, 26, 0.2)';
        stripeStatus.style.color = '#52c41a';
        stripeStatus.innerHTML = '✅ Compte configuré - Vous pouvez recevoir des paiements';
        setupStripeBtn.textContent = '📊 Gérer mon compte Stripe';
    } else if (status.status === 'pending' || status.status === 'active') {
        stripeStatus.style.background = 'rgba(250, 173, 20, 0.2)';
        stripeStatus.style.color = '#faad14';
        stripeStatus.innerHTML = '⏳ Configuration en cours - Terminez la configuration pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Terminer la configuration';
    } else if (status.status === 'not_created') {
        stripeStatus.style.background = 'rgba(255, 77, 79, 0.2)';
        stripeStatus.style.color = '#ff4d4f';
        stripeStatus.innerHTML = '❌ Compte non configuré - Configurez votre compte pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Configurer mon compte';
    } else {
        stripeStatus.style.background = 'rgba(255, 77, 79, 0.2)';
        stripeStatus.style.color = '#ff4d4f';
        stripeStatus.innerHTML = '❌ Compte non configuré - Configurez votre compte pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Configurer mon compte';
    }
}

/**
 * Setup du compte Stripe Connect
 */
if (setupStripeBtn) {
    setupStripeBtn.addEventListener('click', async () => {
        setupStripeBtn.disabled = true;
        setupStripeBtn.textContent = '⏳ Chargement...';

        try {
            const createStripeConnectAccount = httpsCallable(functions, 'createStripeConnectAccount');
            const result = await createStripeConnectAccount({
                baseUrl: window.location.origin
            });

            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
                showError('Erreur lors de la configuration Stripe');
                setupStripeBtn.disabled = false;
                setupStripeBtn.textContent = '⚙️ Configurer mon compte';
            }
        } catch (error) {
            console.error('Erreur setup Stripe:', error);
            showError('Erreur: ' + (error.message || 'Impossible de configurer Stripe'));
            setupStripeBtn.disabled = false;
            setupStripeBtn.textContent = '⚙️ Configurer mon compte';
        }
    });
}

/**
 * Initialiser la section Stripe
 */
async function initStripeSection(userId) {
    // Vérifier si l'utilisateur a des événements avec préventes
    const hasPresalesEvents = await checkUserHasPresalesEvents(userId);

    if (hasPresalesEvents && stripeConnectSection) {
        stripeConnectSection.style.display = 'block';

        // Afficher le bouton scanner
        if (scannerBtn) {
            scannerBtn.style.display = 'inline-block';
        }

        // Vérifier le statut du compte Stripe
        const status = await checkStripeStatus();
        displayStripeStatus(status);
    }

    // Vérifier les paramètres URL pour Stripe Connect callback
    const urlParams = new URLSearchParams(window.location.search);
    const stripeCallback = urlParams.get('stripe');

    if (stripeCallback === 'success') {
        showSuccess('Compte Stripe configuré avec succès !');
        window.history.replaceState({}, document.title, window.location.pathname);

        if (stripeConnectSection) {
            stripeConnectSection.style.display = 'block';
            const status = await checkStripeStatus();
            displayStripeStatus(status);
        }
    } else if (stripeCallback === 'refresh') {
        showWarning('Configuration Stripe non terminée. Veuillez réessayer.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ Dashboard loaded - Architecture sécurisée V2');
console.log('🔐 Services initialisés: authService, eventsService, storageService');
