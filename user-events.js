// ========================================
// USER EVENTS - Gestion des soirées par les utilisateurs
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

import { showSuccess, showError } from './modal-utils.js';

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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Variables globales
let currentUserImageFile = null;
let currentUser = null;

// Éléments DOM
const btnAddEvent = document.getElementById('btn-add-event');
const addEventModal = document.getElementById('add-event-modal');
const userEventForm = document.getElementById('user-event-form');
const userPresalesToggle = document.getElementById('user-presales-toggle');
const userPresalesLabel = document.getElementById('user-presales-label');
const userPresalesInput = document.getElementById('user-event-presales');
const userImageUploadArea = document.getElementById('user-image-upload-area');
const userImageInput = document.getElementById('user-image-input');
const userImagePreview = document.getElementById('user-image-preview');
const userPreviewImg = document.getElementById('user-preview-img');
const confirmationModal = document.getElementById('confirmation-modal');
const infoPresalesModal = document.getElementById('info-presales-modal');
const btnInfoPresales = document.getElementById('btn-info-presales');

// Détecter l'utilisateur connecté
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// ========================================
// BOUTON AJOUTER UNE SOIRÉE
// ========================================

btnAddEvent.addEventListener('click', () => {
    if (!currentUser) {
        // Pas connecté → rediriger vers login
        window.location.href = 'login.html';
        return;
    }

    // Connecté → ouvrir le modal
    openAddEventModal();
});

// ========================================
// GESTION DU MODAL
// ========================================

function openAddEventModal() {
    addEventModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

window.closeAddEventModal = function() {
    addEventModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetUserForm();
};

// Fermer en cliquant en dehors
addEventModal.addEventListener('click', (e) => {
    if (e.target === addEventModal) {
        closeAddEventModal();
    }
});

// ========================================
// TOGGLE PRÉVENTES
// ========================================

userPresalesToggle.addEventListener('click', () => {
    userPresalesToggle.classList.toggle('active');
    const isActive = userPresalesToggle.classList.contains('active');
    userPresalesInput.value = isActive ? 'true' : 'false';
    userPresalesLabel.textContent = isActive ? 'Activé' : 'Désactivé';
});

// ========================================
// UPLOAD D'IMAGE
// ========================================

userImageUploadArea.addEventListener('click', () => {
    userImageInput.click();
});

userImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showError('L\'image ne doit pas dépasser 5MB.');
        userImageInput.value = '';
        return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
        showError('Veuillez sélectionner une image valide.');
        userImageInput.value = '';
        return;
    }

    currentUserImageFile = file;

    // Afficher l'aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
        userPreviewImg.src = e.target.result;
        userImagePreview.style.display = 'block';
        userImageUploadArea.classList.add('active');
    };
    reader.readAsDataURL(file);
});

// ========================================
// BOUTON PLUS D'INFORMATIONS PRÉVENTES
// ========================================

btnInfoPresales.addEventListener('click', () => {
    openInfoPresalesModal();
});

function openInfoPresalesModal() {
    infoPresalesModal.style.display = 'flex';
}

window.closeInfoPresalesModal = function() {
    infoPresalesModal.style.display = 'none';
};

// ========================================
// ENVOI DU FORMULAIRE
// ========================================

userEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showError('Vous devez être connecté pour ajouter une soirée.');
        window.location.href = 'login.html';
        return;
    }

    // Récupérer les valeurs
    const eventData = {
        name: document.getElementById('user-event-name').value.trim(),
        date: document.getElementById('user-event-date').value,
        location: document.getElementById('user-event-location').value.trim(),
        price: parseFloat(document.getElementById('user-event-price').value),
        age: parseInt(document.getElementById('user-event-age').value),
        link: document.getElementById('user-event-link').value.trim(),
        description: document.getElementById('user-event-description').value.trim(),
        presales: userPresalesInput.value === 'true'
    };

    // Validation
    if (!eventData.name || !eventData.date || !eventData.location) {
        showError('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    if (!currentUserImageFile) {
        showError('Veuillez sélectionner une image.');
        return;
    }

    // Désactiver le bouton pendant l'envoi
    const submitBtn = document.getElementById('user-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    try {
        // 1. Upload de l'image
        const timestamp = Date.now();
        const sanitizedName = eventData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `user_events/${sanitizedName}_${timestamp}.${currentUserImageFile.name.split('.').pop()}`;
        const storageRef = ref(storage, fileName);

        const snapshot = await uploadBytes(storageRef, currentUserImageFile);
        const downloadURL = await getDownloadURL(snapshot.ref);


        // 2. Ajouter les métadonnées
        eventData.imageURL = downloadURL;
        eventData.imagePath = fileName;
        eventData.createdBy = currentUser.uid;
        eventData.createdByEmail = currentUser.email;
        eventData.status = 'pending'; // En attente de validation
        eventData.createdAt = serverTimestamp();

        // 3. Enregistrer dans Firestore
        const docRef = await addDoc(collection(db, 'events'), eventData);

        // 4. Créer une notification pour l'utilisateur
        await addDoc(collection(db, 'notifications'), {
            userId: currentUser.uid,
            type: 'event_submitted',
            eventId: docRef.id,
            eventName: eventData.name,
            message: `Vous venez d'envoyer une soirée, elle est en attente de validation.`,
            read: false,
            createdAt: serverTimestamp()
        });

        // 5. Fermer le modal et afficher la confirmation
        closeAddEventModal();
        openConfirmationModal();

    } catch (error) {
        showError('Erreur: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer pour validation';
    }
});

// ========================================
// MODAL CONFIRMATION
// ========================================

function openConfirmationModal() {
    confirmationModal.style.display = 'flex';
}

window.closeConfirmationModal = function() {
    confirmationModal.style.display = 'none';
    // Recharger la page pour voir les nouvelles données
    window.location.reload();
};

// ========================================
// RÉINITIALISER LE FORMULAIRE
// ========================================

function resetUserForm() {
    userEventForm.reset();
    currentUserImageFile = null;
    userImagePreview.style.display = 'none';
    userImageUploadArea.classList.remove('active');
    userPresalesToggle.classList.remove('active');
    userPresalesInput.value = 'false';
    userPresalesLabel.textContent = 'Désactivé';
}

