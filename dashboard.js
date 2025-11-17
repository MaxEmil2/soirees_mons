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

const db = getFirestore(app);
const storage = getStorage(app);

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
        if (userEmail) userEmail.textContent = user.email || 'Non disponible';
        if (userUid) userUid.textContent = user.uid;

        // Vérification d'email (ancien dashboard uniquement)
        if (userEmailVerified) {
            userEmailVerified.textContent = user.emailVerified ? '✅ Vérifié' : '❌ Non vérifié';
            userEmailVerified.style.color = user.emailVerified ? '#52c41a' : '#ff4d4f';
        }

        // Afficher/masquer le bouton de vérification d'email
        if (!user.emailVerified && verifyEmailBtn) {
            verifyEmailBtn.style.display = 'inline-block';
        }

        // Déterminer le provider (ancien dashboard uniquement)
        if (userProvider) {
            const providerData = user.providerData[0];
            let provider = 'Email/Password';
            if (providerData) {
                if (providerData.providerId === 'google.com') {
                    provider = 'Google';
                }
            }
            userProvider.textContent = provider;
        }

        // Date de création (ancien dashboard uniquement)
        if (userCreated) {
            const createdDate = new Date(user.metadata.creationTime);
            userCreated.textContent = createdDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

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
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && userDoc.data().isAdmin) {
        if (adminBtn) adminBtn.style.display = 'inline-block';
        if (adminPanelBtn) adminPanelBtn.style.display = 'inline-block';
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

        try {
            // 1. Upload de la photo et mise à jour du profil
            const storageRef = ref(storage, `profile_photos/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            // Mettre à jour le profil Firebase Auth
            await updateProfile(auth.currentUser, { photoURL });
            profilePhoto.innerHTML = `<img src="${photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;

            // Afficher le modal de succès
            document.getElementById('photo-success-modal').style.display = 'flex';

            // 2. Mettre à jour le document Firestore users avec la nouvelle photo
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    photoURL: photoURL
                });
                console.log('✅ Document Firestore users mis à jour avec photoURL');
            } catch (firestoreError) {
                console.warn('⚠️ Impossible de mettre à jour Firestore users:', firestoreError);
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
                console.log(`✅ ${updatePromises.length} likes mis à jour automatiquement`);
            } catch (likesError) {
                // Si la mise à jour des likes échoue, ce n'est pas grave
                console.warn('⚠️ Impossible de mettre à jour tous les likes:', likesError);
            }

        } catch (error) {
            console.error('Erreur upload photo:', error);
            alert('❌ Erreur : Impossible de télécharger la photo. Vérifiez votre connexion et réessayez.');
        }
    });
}

// Modal édition pseudo
if (editPseudoBtn) {
    editPseudoBtn.addEventListener('click', () => {
        editPseudoModal.style.display = 'flex';
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
            editPseudoModal.style.display = 'none';
            alert('✅ Pseudo mis à jour !');
        } catch (error) {
            console.error('Erreur mise à jour pseudo:', error);
            alert('❌ Erreur lors de la mise à jour');
        }
    });
}

// Modal édition mot de passe
if (editPasswordBtn) {
    editPasswordBtn.addEventListener('click', () => {
        editPasswordModal.style.display = 'flex';
    });
}

if (document.getElementById('edit-password-form')) {
    document.getElementById('edit-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('❌ Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(
                auth.currentUser.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            
            editPasswordModal.style.display = 'none';
            alert('✅ Mot de passe mis à jour !');
            document.getElementById('edit-password-form').reset();
        } catch (error) {
            console.error('Erreur mise à jour mot de passe:', error);
            alert('❌ Mot de passe actuel incorrect ou erreur');
        }
    });
}

console.log('✅ Dashboard avec soirées likées initialisé');
