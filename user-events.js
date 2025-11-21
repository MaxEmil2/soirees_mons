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
const userPresalesEndContainer = document.getElementById('user-presales-end-container');
const userPresalesEndDateInput = document.getElementById('user-presales-end-date');
const userMaxPresalesContainer = document.getElementById('user-max-presales-container');
const userMaxPresalesInput = document.getElementById('user-max-presales');
const priceCommissionInfo = document.getElementById('price-commission-info');
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
    // Afficher/masquer les champs de préventes
    if (userPresalesEndContainer) {
        userPresalesEndContainer.style.display = isActive ? 'block' : 'none';
    }
    if (userMaxPresalesContainer) {
        userMaxPresalesContainer.style.display = isActive ? 'block' : 'none';
        // Rendre le champ requis uniquement quand visible
        if (userMaxPresalesInput) {
            userMaxPresalesInput.required = isActive;
        }
    }
    // Afficher l'info commission sous le prix
    if (priceCommissionInfo) {
        priceCommissionInfo.style.display = isActive ? 'block' : 'none';
    }
});

// ========================================
// UPLOAD D'IMAGE
// ========================================

userImageUploadArea.addEventListener('click', () => {
    userImageInput.click();
});

// Fonction pour compresser l'image
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionner si nécessaire
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir en blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            }));
                        } else {
                            reject(new Error('Erreur de compression'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
        };
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    });
}

userImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
        showError('Veuillez sélectionner une image valide.');
        userImageInput.value = '';
        return;
    }

    try {
        // Compresser l'image si elle est trop grande (> 1MB)
        let processedFile = file;
        if (file.size > 1 * 1024 * 1024) {
            console.log(`Compression de l'image (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
            processedFile = await compressImage(file);
            console.log(`Image compressée: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Vérifier la taille finale (max 5MB)
        if (processedFile.size > 5 * 1024 * 1024) {
            showError('L\'image ne doit pas dépasser 5MB. Veuillez choisir une image plus petite.');
            userImageInput.value = '';
            return;
        }

        currentUserImageFile = processedFile;

        // Afficher l'aperçu
        const reader = new FileReader();
        reader.onload = (e) => {
            userPreviewImg.src = e.target.result;
            userImagePreview.style.display = 'block';
            userImageUploadArea.classList.add('active');
        };
        reader.readAsDataURL(processedFile);
    } catch (error) {
        console.error('Erreur de traitement de l\'image:', error);
        showError('Erreur lors du traitement de l\'image. Veuillez réessayer avec une autre image.');
        userImageInput.value = '';
    }
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
        presales: userPresalesInput.value === 'true',
        presalesEndDate: userPresalesEndDateInput && userPresalesEndDateInput.value ? userPresalesEndDateInput.value : null,
        maxPresales: userMaxPresalesInput && userMaxPresalesInput.value ? parseInt(userMaxPresalesInput.value) : null,
        presalesSold: 0 // Compteur de préventes vendues
    };

    // Le prix du ticket pour les préventes = le prix de l'événement (en centimes)
    if (eventData.presales && eventData.price) {
        eventData.ticketPrice = Math.round(eventData.price * 100);
    }

    // Validation
    if (!eventData.name || !eventData.date || !eventData.location) {
        showError('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    if (!currentUserImageFile) {
        showError('Veuillez sélectionner une image.');
        return;
    }

    // Validation du prix si préventes activées
    if (eventData.presales && (!eventData.price || eventData.price < 1)) {
        showError('Veuillez entrer un prix valide (minimum 1€) pour activer les préventes.');
        return;
    }

    // Validation du nombre max de préventes
    if (eventData.presales && (!eventData.maxPresales || eventData.maxPresales < 1)) {
        showError('Veuillez entrer le nombre maximum de préventes.');
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
    if (userPresalesEndContainer) userPresalesEndContainer.style.display = 'none';
    if (userPresalesEndDateInput) userPresalesEndDateInput.value = '';
    if (userMaxPresalesContainer) userMaxPresalesContainer.style.display = 'none';
    if (userMaxPresalesInput) {
        userMaxPresalesInput.value = '';
        userMaxPresalesInput.required = false;
    }
    if (priceCommissionInfo) priceCommissionInfo.style.display = 'none';
}

