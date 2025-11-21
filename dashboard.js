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
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

import {
    getFunctions,
    httpsCallable
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

import { showSuccess, showError, showWarning } from './modal-utils.js';

const db = getFirestore(app);
const storage = getStorage(app);
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
// ÉLÉMENTS DOM - PROFIL (pour compatibilité ancien dashboard)
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

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

// Les fonctions showSuccess et showError sont importées depuis modal-utils.js

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
// (Géré par le nouveau onAuthStateChanged plus bas)
// ========================================

// ========================================
// DÉCONNEXION
// ========================================

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
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
        } catch (error) {
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

            // Déconnexion et redirection
            await signOut(auth);
            window.location.href = 'login.html';

        } catch (error) {

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

            // Vider les champs
            updatePasswordForm.reset();
            setButtonLoading(updatePasswordBtn, false);

        } catch (error) {

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

            // Mettre à jour l'affichage de la photo
            if (photoURL) {
                userPhoto.src = photoURL;
                userPhoto.style.display = 'block';
            }

            setButtonLoading(updatePhotoBtn, false);

        } catch (error) {
            showError('Erreur lors de la modification du profil.');
            setButtonLoading(updatePhotoBtn, false);
        }
    });
}



// ========================================
// NOUVEAUX ÉLÉMENTS DOM POUR LE NOUVEAU DESIGN
// ========================================

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
// GESTION DU NOUVEAU DASHBOARD
// ========================================

// Remplacer l'ancien onAuthStateChanged par le nouveau
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    loading.style.display = 'none';
    dashboardContent.style.display = 'block';

    // Afficher les infos
    userUid.textContent = user.uid;
    userEmail.textContent = user.email;
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
    }
});

// Upload photo de profil
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
            console.log('📸 Upload photo de profil - Début');
            console.log('Fichier original:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

            let fileToUpload = file;

            // ========================================
            // COMPRESSION DE L'IMAGE (PHOTOS DE PROFIL UNIQUEMENT)
            // ========================================
            if (typeof imageCompression !== 'undefined') {
                try {
                    // Options de compression
                    const options = {
                        maxSizeMB: 0.5,              // Taille max : 500 KB
                        maxWidthOrHeight: 800,        // Dimensions max : 800x800 pixels
                        useWebWorker: true,           // Utiliser un web worker (ne bloque pas l'UI)
                        quality: 0.85,                // Qualité : 85% (excellent compromis)
                        fileType: 'image/jpeg'        // Convertir en JPEG (meilleur compression que PNG)
                    };

                    console.log('🗜️ Compression de l\'image...');
                    fileToUpload = await imageCompression(file, options);
                    console.log('✅ Image compressée:', `${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
                } catch (compressionError) {
                    console.warn('⚠️ Compression échouée, utilisation du fichier original:', compressionError);
                    fileToUpload = file;
                }
            } else {
                console.warn('⚠️ Bibliothèque imageCompression non disponible, upload sans compression');
            }

            // Vérifier la taille finale
            if (fileToUpload.size > 5 * 1024 * 1024) {
                showError('L\'image est trop grande (max 5MB). Veuillez choisir une image plus petite.');
                return;
            }

            // 1. Upload de la photo et mise à jour du profil
            console.log('☁️ Upload vers Firebase Storage...');
            const storageRef = ref(storage, `profile_photos/${auth.currentUser.uid}`);

            const snapshot = await uploadBytes(storageRef, fileToUpload);
            console.log('✅ Upload réussi');

            const photoURL = await getDownloadURL(snapshot.ref);
            console.log('✅ URL obtenue:', photoURL);

            // Mettre à jour le profil Firebase Auth
            await updateProfile(auth.currentUser, { photoURL });
            console.log('✅ Profil Auth mis à jour');

            profilePhoto.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;

            // Afficher le modal de succès
            document.getElementById('photo-success-modal').classList.add('show');

            // 2. Mettre à jour le document Firestore users avec la nouvelle photo
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    photoURL: photoURL
                });
                console.log('✅ Firestore users mis à jour');
            } catch (firestoreError) {
                console.warn('⚠️ Erreur mise à jour Firestore users:', firestoreError);
            }

            // 3. Mettre à jour les likes en arrière-plan (ne pas bloquer l'utilisateur)
            try {
                const likesQuery = query(
                    collection(db, 'likes'),
                    where('userId', '==', auth.currentUser.uid)
                );
                const likesSnapshot = await getDocs(likesQuery);

                // Mettre à jour chaque like avec la nouvelle photo
                const updatePromises = [];
                likesSnapshot.forEach((likeDoc) => {
                    updatePromises.push(
                        updateDoc(doc(db, 'likes', likeDoc.id), {
                            userPhotoURL: photoURL
                        })
                    );
                });

                await Promise.all(updatePromises);
                console.log('✅ Likes mis à jour');
            } catch (likesError) {
                console.warn('⚠️ Erreur mise à jour likes:', likesError);
            }

            console.log('🎉 Photo de profil mise à jour avec succès !');

        } catch (error) {
            console.error('❌ Erreur upload photo:', error);
            console.error('Code erreur:', error.code);
            console.error('Message:', error.message);

            let errorMessage = 'Impossible de télécharger la photo.';

            if (error.code === 'storage/unauthorized') {
                errorMessage = 'Vous n\'êtes pas autorisé à télécharger cette photo. Veuillez vous reconnecter.';
            } else if (error.code === 'storage/canceled') {
                errorMessage = 'Upload annulé.';
            } else if (error.code === 'storage/unknown') {
                errorMessage = 'Erreur inconnue. Vérifiez votre connexion internet et réessayez.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
            }

            showError(errorMessage);
        }
    });
}

// Modal édition pseudo
if (editPseudoBtn) {
    editPseudoBtn.addEventListener('click', () => {
        editPseudoModal.classList.add('show');
        document.getElementById('new-pseudo').value = auth.currentUser.displayName || '';
    });
}

if (document.getElementById('edit-pseudo-form')) {
    document.getElementById('edit-pseudo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPseudo = document.getElementById('new-pseudo').value.trim();

        try {
            await updateProfile(auth.currentUser, { displayName: newPseudo });
            userPseudo.textContent = newPseudo;
            editPseudoModal.classList.remove('show');
            showSuccess('Pseudo mis à jour !');
        } catch (error) {
            showError('Erreur lors de la mise à jour');
        }
    });
}

// Modal édition mot de passe
if (editPasswordBtn) {
    editPasswordBtn.addEventListener('click', () => {
        editPasswordModal.classList.add('show');
    });
}

if (document.getElementById('edit-password-form')) {
    document.getElementById('edit-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(
                auth.currentUser.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);

            editPasswordModal.classList.remove('show');
            showSuccess('Mot de passe mis à jour !');
            document.getElementById('edit-password-form').reset();
        } catch (error) {
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

// Vérifier si l'utilisateur a des événements avec préventes
async function checkUserHasPresalesEvents(userId) {
    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', userId),
            where('presales', '==', true)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        return !eventsSnapshot.empty;
    } catch (error) {
        console.error('Erreur vérification événements:', error);
        return false;
    }
}

// Vérifier le statut du compte Stripe
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

// Afficher le statut Stripe
function displayStripeStatus(status) {
    if (status.canReceivePayments) {
        stripeStatus.style.background = 'rgba(82, 196, 26, 0.2)';
        stripeStatus.style.color = '#52c41a';
        stripeStatus.innerHTML = '✅ Compte configuré - Vous pouvez recevoir des paiements';
        setupStripeBtn.textContent = '📊 Gérer mon compte Stripe';
    } else if (status.status === 'pending' || status.status === 'active') {
        // Active mais pas encore capable de recevoir des paiements = en cours de vérification
        stripeStatus.style.background = 'rgba(250, 173, 20, 0.2)';
        stripeStatus.style.color = '#faad14';
        stripeStatus.innerHTML = '⏳ Configuration en cours - Terminez la configuration pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Terminer la configuration';
    } else if (status.status === 'not_created') {
        stripeStatus.style.background = 'rgba(255, 77, 79, 0.2)';
        stripeStatus.style.color = '#ff4d4f';
        stripeStatus.innerHTML = '❌ Compte non configuré - Configurez votre compte pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Configurer mon compte';
    } else if (status.status === 'error') {
        stripeStatus.style.background = 'rgba(255, 77, 79, 0.2)';
        stripeStatus.style.color = '#ff4d4f';
        stripeStatus.innerHTML = '⚠️ Erreur de vérification - Réessayez ou configurez votre compte';
        setupStripeBtn.textContent = '⚙️ Configurer mon compte';
    } else {
        // Fallback pour les utilisateurs sans compte Stripe
        stripeStatus.style.background = 'rgba(255, 77, 79, 0.2)';
        stripeStatus.style.color = '#ff4d4f';
        stripeStatus.innerHTML = '❌ Compte non configuré - Configurez votre compte pour recevoir des paiements';
        setupStripeBtn.textContent = '⚙️ Configurer mon compte';
    }
}

// Setup du compte Stripe Connect
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

// Initialiser la section Stripe après le chargement de l'utilisateur
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
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Rafraîchir le statut
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

// Observer l'état d'authentification pour initialiser Stripe
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Initialiser la section Stripe après un court délai pour laisser le temps au dashboard de charger
        setTimeout(() => {
            initStripeSection(user.uid);
        }, 500);
    }
});
