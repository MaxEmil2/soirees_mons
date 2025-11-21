// ========================================
// USER EVENTS - Gestion des soirées par les utilisateurs
// ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { eventsService } from './src/services/events.service.js';
import { storageService } from './src/services/storage.service.js';
import { toast } from './src/components/Toast.js';
import { showSuccess, showError } from './modal-utils.js';

// Firebase pour onAuthStateChanged
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuration Firebase (pour onAuthStateChanged uniquement)
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
const userPresalesInfo = document.getElementById('user-presales-info');
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

if (btnAddEvent) {
    btnAddEvent.addEventListener('click', () => {
        if (!currentUser) {
            // Pas connecté → rediriger vers login
            window.location.href = 'login.html';
            return;
        }

        // Connecté → ouvrir le modal
        openAddEventModal();
    });
}

// ========================================
// GESTION DU MODAL
// ========================================

function openAddEventModal() {
    if (addEventModal) {
        addEventModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

window.closeAddEventModal = function() {
    if (addEventModal) {
        addEventModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetUserForm();
    }
};

// Fermer en cliquant en dehors
if (addEventModal) {
    addEventModal.addEventListener('click', (e) => {
        if (e.target === addEventModal) {
            closeAddEventModal();
        }
    });
}

// ========================================
// TOGGLE PRÉVENTES
// ========================================

if (userPresalesToggle) {
    userPresalesToggle.addEventListener('click', () => {
        userPresalesToggle.classList.toggle('active');
        const isActive = userPresalesToggle.classList.contains('active');
        if (userPresalesInput) userPresalesInput.value = isActive ? 'true' : 'false';
        if (userPresalesLabel) userPresalesLabel.textContent = isActive ? 'Activé' : 'Désactivé';
        // Afficher/masquer les champs de préventes
        if (userPresalesEndContainer) {
            userPresalesEndContainer.style.display = isActive ? 'block' : 'none';
        }
        if (userPresalesInfo) {
            userPresalesInfo.style.display = isActive ? 'block' : 'none';
        }
    });
}

// ========================================
// UPLOAD D'IMAGE
// ========================================

if (userImageUploadArea && userImageInput) {
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
            if (userPreviewImg) userPreviewImg.src = e.target.result;
            if (userImagePreview) userImagePreview.style.display = 'block';
            userImageUploadArea.classList.add('active');
        };
        reader.readAsDataURL(file);
    });
}

// ========================================
// BOUTON PLUS D'INFORMATIONS PRÉVENTES
// ========================================

if (btnInfoPresales) {
    btnInfoPresales.addEventListener('click', () => {
        openInfoPresalesModal();
    });
}

function openInfoPresalesModal() {
    if (infoPresalesModal) {
        infoPresalesModal.style.display = 'flex';
    }
}

window.closeInfoPresalesModal = function() {
    if (infoPresalesModal) {
        infoPresalesModal.style.display = 'none';
    }
};

// ========================================
// ENVOI DU FORMULAIRE
// ========================================

if (userEventForm) {
    userEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showError('Vous devez être connecté pour ajouter une soirée.');
            window.location.href = 'login.html';
            return;
        }

        // Récupérer les valeurs
        const eventData = {
            name: document.getElementById('user-event-name')?.value.trim() || '',
            date: document.getElementById('user-event-date')?.value || '',
            location: document.getElementById('user-event-location')?.value.trim() || '',
            price: parseFloat(document.getElementById('user-event-price')?.value || 0),
            age: parseInt(document.getElementById('user-event-age')?.value || 18),
            link: document.getElementById('user-event-link')?.value.trim() || '',
            description: document.getElementById('user-event-description')?.value.trim() || '',
            presales: userPresalesInput?.value === 'true',
            presalesEndDate: userPresalesEndDateInput?.value || null
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

        // Désactiver le bouton pendant l'envoi
        const submitBtn = document.getElementById('user-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';
        }

        try {
            // 1. Upload de l'image via storageService (architecture sécurisée)
            // Le service gère automatiquement la compression et la validation
            toast.info('Upload de l\'image...');

            const uploadResult = await storageService.uploadEventImage(currentUserImageFile, 'temp_' + Date.now());

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Erreur lors de l\'upload de l\'image');
            }

            // 2. Ajouter les métadonnées d'image
            eventData.imageURL = uploadResult.url;
            eventData.imagePath = uploadResult.path;

            // 3. Créer l'événement via eventsService (architecture sécurisée)
            // Le service gère automatiquement:
            // - Validation serveur des données
            // - Sanitization anti-XSS
            // - Ajout des métadonnées (createdBy, status, etc.)
            // - Création de notifications
            toast.info('Création de l\'événement...');

            const createResult = await eventsService.createEvent(eventData);

            if (!createResult.success) {
                // Si échec, supprimer l'image uploadée
                await storageService.deleteImage(uploadResult.path);
                throw new Error(createResult.error || 'Erreur lors de la création de l\'événement');
            }

            // 4. Créer une notification pour l'utilisateur
            // (Cette partie peut être déplacée vers la Cloud Function pour plus de sécurité)
            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: currentUser.uid,
                    type: 'event_submitted',
                    eventId: createResult.eventId,
                    eventName: eventData.name,
                    message: `Vous venez d'envoyer une soirée, elle est en attente de validation.`,
                    read: false,
                    createdAt: serverTimestamp()
                });
            } catch (notifError) {
                // Ne pas bloquer si la notification échoue
                console.error('Erreur notification:', notifError);
            }

            // 5. Succès !
            toast.success('Soirée envoyée pour validation !');

            // Fermer le modal et afficher la confirmation
            closeAddEventModal();
            openConfirmationModal();

        } catch (error) {
            console.error('Erreur création événement:', error);
            showError('Erreur: ' + error.message);
            toast.error('Erreur lors de la création de la soirée');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer pour validation';
            }
        }
    });
}

// ========================================
// MODAL CONFIRMATION
// ========================================

function openConfirmationModal() {
    if (confirmationModal) {
        confirmationModal.style.display = 'flex';
    }
}

window.closeConfirmationModal = function() {
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
        // Recharger la page pour voir les nouvelles données
        window.location.reload();
    }
};

// ========================================
// RÉINITIALISER LE FORMULAIRE
// ========================================

function resetUserForm() {
    if (userEventForm) userEventForm.reset();
    currentUserImageFile = null;
    if (userImagePreview) userImagePreview.style.display = 'none';
    if (userImageUploadArea) userImageUploadArea.classList.remove('active');
    if (userPresalesToggle) userPresalesToggle.classList.remove('active');
    if (userPresalesInput) userPresalesInput.value = 'false';
    if (userPresalesLabel) userPresalesLabel.textContent = 'Désactivé';
    if (userPresalesEndContainer) userPresalesEndContainer.style.display = 'none';
    if (userPresalesEndDateInput) userPresalesEndDateInput.value = '';
    if (userPresalesInfo) userPresalesInfo.style.display = 'none';
}

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ User Events loaded - Architecture sécurisée V2');
console.log('🔐 Services initialisés: authService, eventsService, storageService');
