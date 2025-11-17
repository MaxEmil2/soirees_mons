// ========================================
// IMPORTS FIREBASE V10 (ES MODULES)
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// ✅ VERIFICATION: Ce fichier a bien l'import 'where' - Version 2.0
console.log('✅ admin-panel.js VERSION 2.0 CHARGÉ - where est importé:', typeof where);

// ========================================
// CONFIGURATION FIREBASE
// ========================================

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

// ========================================
// ÉLÉMENTS DOM
// ========================================

const loading = document.getElementById('loading');
const adminContent = document.getElementById('admin-content');
const eventForm = document.getElementById('event-form');
const formTitle = document.getElementById('form-title');
const eventIdInput = document.getElementById('event-id');
const eventNameInput = document.getElementById('event-name');
const eventDateInput = document.getElementById('event-date');
const eventLocationInput = document.getElementById('event-location');
const eventPriceInput = document.getElementById('event-price');
const eventAgeInput = document.getElementById('event-age');
const eventLinkInput = document.getElementById('event-link');
const eventDescriptionInput = document.getElementById('event-description');
const presalesToggle = document.getElementById('presales-toggle');
const presalesLabel = document.getElementById('presales-label');
const presalesInput = document.getElementById('event-presales');
const imageInput = document.getElementById('image-input');
const imageUploadArea = document.getElementById('image-upload-area');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const eventsList = document.getElementById('events-list');
const pendingEventsList = document.getElementById('pending-events-list');

// Éléments DOM - Partenaires
const partnerForm = document.getElementById('partner-form');
const partnerFormTitle = document.getElementById('partner-form-title');
const partnerIdInput = document.getElementById('partner-id');
const partnerImageInput = document.getElementById('partner-image-input');
const partnerImageUploadArea = document.getElementById('partner-image-upload-area');
const partnerImagePreview = document.getElementById('partner-image-preview');
const partnerPreviewImg = document.getElementById('partner-preview-img');
const partnerSubmitBtn = document.getElementById('partner-submit-btn');
const partnerCancelBtn = document.getElementById('partner-cancel-btn');
const partnersList = document.getElementById('partners-list');

// ========================================
// VARIABLES GLOBALES
// ========================================

let currentImageFile = null;
let editingEventId = null;
let currentImageURL = null;

// Variables pour partenaires
let currentPartnerImageFile = null;
let editingPartnerId = null;
let currentPartnerImageURL = null;

// ========================================
// VÉRIFICATION ADMIN
// ========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Pas connecté - rediriger
        console.log('❌ Non connecté - redirection...');
        window.location.href = 'login.html';
        return;
    }

    try {
        // Vérifier si admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData || userData.isAdmin !== true) {
            // Pas admin - rediriger
            console.log('❌ Pas admin - redirection...');
            alert('Accès refusé. Vous devez être administrateur.');
            window.location.href = 'dashboard.html';
            return;
        }

        // Admin confirmé - afficher le contenu
        console.log('✅ Admin confirmé:', user.email);
        loading.style.display = 'none';
        adminContent.style.display = 'block';

        // Charger les événements, soirées en attente et partenaires
        loadEvents();
        loadPendingEvents();
        loadPartners();

    } catch (error) {
        console.error('❌ Erreur vérification admin:', error);
        alert('Erreur lors de la vérification des droits.');
        window.location.href = 'dashboard.html';
    }
});

// ========================================
// GESTION DU TOGGLE PRÉVENTES
// ========================================

presalesToggle.addEventListener('click', () => {
    presalesToggle.classList.toggle('active');
    const isActive = presalesToggle.classList.contains('active');
    presalesInput.value = isActive ? 'true' : 'false';
    presalesLabel.textContent = isActive ? 'Activé' : 'Désactivé';
});

// ========================================
// GESTION DE L'UPLOAD D'IMAGE
// ========================================

imageUploadArea.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ L\'image ne doit pas dépasser 5MB.');
        imageInput.value = '';
        return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner une image valide.');
        imageInput.value = '';
        return;
    }

    currentImageFile = file;

    // Afficher l'aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
        imageUploadArea.classList.add('active');
    };
    reader.readAsDataURL(file);
});

// ========================================
// UPLOAD IMAGE VERS FIREBASE STORAGE
// ========================================

async function uploadImage(file, eventName) {
    try {
        // Créer un nom de fichier unique
        const timestamp = Date.now();
        const sanitizedName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `events/${sanitizedName}_${timestamp}.${file.name.split('.').pop()}`;

        // Créer une référence dans Storage
        const storageRef = ref(storage, fileName);

        // Upload le fichier
        console.log('📤 Upload de l\'image...');
        const snapshot = await uploadBytes(storageRef, file);

        // Obtenir l'URL de téléchargement
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ Image uploadée:', downloadURL);

        return {
            url: downloadURL,
            path: fileName
        };

    } catch (error) {
        console.error('❌ Erreur upload image:', error);
        throw new Error('Erreur lors de l\'upload de l\'image.');
    }
}

// ========================================
// AJOUTER/MODIFIER UN ÉVÉNEMENT
// ========================================

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Récupérer les valeurs
    const eventData = {
        name: eventNameInput.value.trim(),
        date: eventDateInput.value,
        location: eventLocationInput.value.trim(),
        price: parseFloat(eventPriceInput.value),
        age: parseInt(eventAgeInput.value),
        link: eventLinkInput.value.trim(),
        description: eventDescriptionInput.value.trim(),
        presales: presalesInput.value === 'true'
    };

    // Validation
    if (!eventData.name || !eventData.date || !eventData.location) {
        alert('❌ Veuillez remplir tous les champs obligatoires.');
        return;
    }

    // Pour l'ajout, l'image est obligatoire
    if (!editingEventId && !currentImageFile) {
        alert('❌ Veuillez sélectionner une image.');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        let imageData = null;

        // Upload nouvelle image si sélectionnée
        if (currentImageFile) {
            imageData = await uploadImage(currentImageFile, eventData.name);
            eventData.imageURL = imageData.url;
            eventData.imagePath = imageData.path;
        } else if (editingEventId && currentImageURL) {
            // Garder l'image existante en mode édition
            eventData.imageURL = currentImageURL;
        }

        if (editingEventId) {
            // MODIFIER un événement existant
            await updateDoc(doc(db, 'events', editingEventId), {
                ...eventData,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Événement modifié:', editingEventId);
            alert('✅ Événement modifié avec succès!');

        } else {
            // AJOUTER un nouvel événement
            eventData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'events'), eventData);

            console.log('✅ Événement ajouté:', docRef.id);
            alert('✅ Événement publié avec succès!');
        }

        // Réinitialiser le formulaire
        resetForm();

        // Recharger la liste
        loadEvents();

    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('❌ Erreur: ' + error.message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
});

// ========================================
// CHARGER LES ÉVÉNEMENTS
// ========================================

async function loadEvents() {
    try {
        console.log('📥 Chargement des événements approuvés...');

        // Récupérer tous les événements approuvés (ou sans status pour compatibilité)
        const querySnapshot = await getDocs(collection(db, 'events'));

        // Vider la liste
        eventsList.innerHTML = '';

        // Filtrer pour n'afficher que les événements approuvés
        const approvedEvents = [];
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            // Afficher si approuvé ou sans status (pour compatibilité avec anciennes soirées)
            if (event.status === 'approved' || !event.status) {
                approvedEvents.push({ id: doc.id, ...event });
            }
        });

        if (approvedEvents.length === 0) {
            // Aucun événement approuvé
            eventsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <p>Aucune soirée publiée pour le moment.</p>
                    <p>Ajoutez votre première soirée ci-dessus!</p>
                </div>
            `;
            return;
        }

        // Afficher chaque événement approuvé
        approvedEvents.forEach((eventData) => {
            const eventItem = createEventItem(eventData.id, eventData);
            eventsList.appendChild(eventItem);
        });

        console.log(`✅ ${querySnapshot.size} événement(s) chargé(s)`);

    } catch (error) {
        console.error('❌ Erreur chargement événements:', error);
        eventsList.innerHTML = `
            <div class="empty-state">
                <p style="color: #ff4d4f;">❌ Erreur lors du chargement des événements.</p>
            </div>
        `;
    }
}

// ========================================
// CRÉER UN ÉLÉMENT ÉVÉNEMENT
// ========================================

function createEventItem(eventId, event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';

    // Formater la date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const isPriority = event.isPriority || false;
    const priorityButtonText = isPriority ? '📌 Rendre normale' : '⭐ Rendre prioritaire';
    const priorityButtonClass = isPriority ? 'btn-warning' : 'btn-primary';

    eventItem.innerHTML = `
        <img src="${event.imageURL}" alt="${event.name}" class="event-image-thumb">
        <div class="event-details">
            <h3>${event.name} ${isPriority ? '<span style="color: #ffd700;">⭐</span>' : ''}</h3>
            <p>📅 ${formattedDate}</p>
            <p>📍 ${event.location}</p>
            <p>💰 ${event.price}€ • 🔞 ${event.age}+ ans</p>
            <p>🎟️ Préventes: ${event.presales ? '✅ Activées' : '❌ Désactivées'}</p>
            <p>⭐ Prioritaire: ${isPriority ? '✅ Oui' : '❌ Non'}</p>
        </div>
        <div class="event-actions">
            <button class="btn ${priorityButtonClass}" onclick="togglePriority('${eventId}', ${!isPriority})">${priorityButtonText}</button>
            <button class="btn btn-secondary" onclick="editEvent('${eventId}')">✏️ Modifier</button>
            <button class="btn btn-danger" onclick="deleteEvent('${eventId}', '${event.imagePath || ''}')">🗑️ Supprimer</button>
        </div>
    `;

    return eventItem;
}

// ========================================
// MODIFIER UN ÉVÉNEMENT
// ========================================

window.editEvent = async function(eventId) {
    try {
        console.log('✏️ Modification événement:', eventId);

        // Récupérer les données de l'événement
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
            alert('❌ Événement introuvable.');
            return;
        }

        const event = eventDoc.data();

        // Pré-remplir le formulaire
        editingEventId = eventId;
        currentImageURL = event.imageURL;
        eventIdInput.value = eventId;
        eventNameInput.value = event.name;
        eventDateInput.value = event.date;
        eventLocationInput.value = event.location;
        eventPriceInput.value = event.price;
        eventAgeInput.value = event.age;
        eventLinkInput.value = event.link || '';
        eventDescriptionInput.value = event.description || '';

        // Toggle préventes
        if (event.presales) {
            presalesToggle.classList.add('active');
            presalesInput.value = 'true';
            presalesLabel.textContent = 'Activé';
        } else {
            presalesToggle.classList.remove('active');
            presalesInput.value = 'false';
            presalesLabel.textContent = 'Désactivé';
        }

        // Afficher l'image actuelle
        previewImg.src = event.imageURL;
        imagePreview.style.display = 'block';
        imageUploadArea.classList.add('active');

        // Changer le titre et les boutons
        formTitle.textContent = '✏️ Modifier la soirée';
        submitBtn.textContent = 'Enregistrer les modifications';
        cancelBtn.style.display = 'inline-block';
        imageInput.removeAttribute('required');

        // Scroll vers le formulaire
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('❌ Erreur modification:', error);
        alert('❌ Erreur lors de la modification.');
    }
};

// ========================================
// BASCULER PRIORITÉ D'UN ÉVÉNEMENT
// ========================================

window.togglePriority = async function(eventId, newPriorityStatus) {
    try {
        console.log('⭐ Changement priorité événement:', eventId, '→', newPriorityStatus);

        // Mettre à jour le statut prioritaire dans Firestore
        await updateDoc(doc(db, 'events', eventId), {
            isPriority: newPriorityStatus
        });

        console.log('✅ Statut prioritaire mis à jour');
        alert(newPriorityStatus ? '⭐ Soirée marquée comme prioritaire !' : '📌 Soirée revenue à normale !');

        // Recharger la liste des événements
        loadEvents();

    } catch (error) {
        console.error('❌ Erreur changement priorité:', error);
        alert('❌ Erreur lors du changement de priorité');
    }
};

// ========================================
// SUPPRIMER UN ÉVÉNEMENT
// ========================================

window.deleteEvent = async function(eventId, imagePath) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette soirée ?')) {
        return;
    }

    try {
        console.log('🗑️ Suppression événement:', eventId);

        // Supprimer l'image du Storage
        if (imagePath) {
            try {
                const imageRef = ref(storage, imagePath);
                await deleteObject(imageRef);
                console.log('✅ Image supprimée du Storage');
            } catch (error) {
                console.error('⚠️ Erreur suppression image:', error);
            }
        }

        // Supprimer le document Firestore
        await deleteDoc(doc(db, 'events', eventId));

        console.log('✅ Événement supprimé');
        alert('✅ Événement supprimé avec succès!');

        // Recharger la liste
        loadEvents();

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression.');
    }
};

// ========================================
// ANNULER L'ÉDITION
// ========================================

cancelBtn.addEventListener('click', () => {
    resetForm();
});

// ========================================
// RÉINITIALISER LE FORMULAIRE
// ========================================

function resetForm() {
    eventForm.reset();
    editingEventId = null;
    currentImageFile = null;
    currentImageURL = null;
    eventIdInput.value = '';
    imagePreview.style.display = 'none';
    imageUploadArea.classList.remove('active');
    presalesToggle.classList.remove('active');
    presalesInput.value = 'false';
    presalesLabel.textContent = 'Désactivé';
    formTitle.textContent = '➕ Ajouter une nouvelle soirée';
    submitBtn.textContent = 'Publier la soirée';
    cancelBtn.style.display = 'none';
    imageInput.setAttribute('required', 'required');
}

// ========================================
// FONCTION LOADER BOUTON
// ========================================

function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.dataset.originalText = button.textContent;
        button.textContent = 'Chargement...';
    } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// ========================================
// CHARGER LES SOIRÉES EN ATTENTE
// ========================================

async function loadPendingEvents() {
    try {
        console.log('📥 Chargement des soirées en attente...');

        // Récupérer les événements avec status = 'pending'
        const eventsQuery = query(
            collection(db, 'events'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(eventsQuery);

        // Vider la liste
        pendingEventsList.innerHTML = '';

        if (querySnapshot.empty) {
            pendingEventsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>Aucune soirée en attente de validation.</p>
                </div>
            `;
            return;
        }

        // Afficher chaque événement en attente
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventId = doc.id;

            const eventItem = createPendingEventItem(eventId, event);
            pendingEventsList.appendChild(eventItem);
        });

        console.log(`✅ ${querySnapshot.size} soirée(s) en attente chargée(s)`);

    } catch (error) {
        console.error('❌ Erreur chargement soirées en attente:', error);
        pendingEventsList.innerHTML = `
            <div class="empty-state">
                <p style="color: #ff4d4f;">❌ Erreur lors du chargement des soirées en attente.</p>
            </div>
        `;
    }
}

// ========================================
// CRÉER UN ÉLÉMENT SOIRÉE EN ATTENTE
// ========================================

function createPendingEventItem(eventId, event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';

    // Formater la date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    eventItem.innerHTML = `
        <img src="${event.imageURL}" alt="${event.name}" class="event-image-thumb">
        <div class="event-details">
            <h3>${event.name}</h3>
            <p>📅 ${formattedDate}</p>
            <p>📍 ${event.location}</p>
            <p>💰 ${event.price}€ • 🔞 ${event.age}+ ans</p>
            <p>👤 Proposé par: ${event.createdByEmail}</p>
            <p>🎟️ Préventes: ${event.presales ? '✅ Activées' : '❌ Désactivées'}</p>
            ${event.link ? `<p>🔗 <a href="${event.link}" target="_blank" style="color: #6c63ff;">Lien de la soirée</a></p>` : ''}
            ${event.description ? `<p style="margin-top: 8px; color: #b8b8d1;">📝 ${event.description}</p>` : ''}
        </div>
        <div class="event-actions" style="flex-direction: column;">
            <button class="btn" style="background: #4caf50;" onclick="approveEvent('${eventId}', '${event.createdBy}', '${event.name}')">✅ Accepter</button>
            <button class="btn btn-danger" onclick="rejectEvent('${eventId}', '${event.createdBy}', '${event.name}')">❌ Refuser</button>
        </div>
    `;

    return eventItem;
}

// ========================================
// ACCEPTER UNE SOIRÉE
// ========================================

window.approveEvent = async function(eventId, createdBy, eventName) {
    if (!confirm(`✅ Accepter la soirée "${eventName}" ?`)) {
        return;
    }

    try {
        console.log('✅ Acceptation de la soirée:', eventId);

        // Mettre à jour le statut
        await updateDoc(doc(db, 'events', eventId), {
            status: 'approved',
            approvedAt: serverTimestamp()
        });

        // Créer une notification pour l'utilisateur
        await addDoc(collection(db, 'notifications'), {
            userId: createdBy,
            type: 'event_approved',
            eventId: eventId,
            eventName: eventName,
            message: `Votre soirée "${eventName}" a été approuvée par l'administrateur ! Elle est maintenant visible publiquement.`,
            read: false,
            createdAt: serverTimestamp()
        });

        console.log('✅ Soirée approuvée et notification envoyée');
        alert('✅ Soirée approuvée avec succès!');

        // Recharger les listes
        loadEvents();
        loadPendingEvents();

    } catch (error) {
        console.error('❌ Erreur approbation:', error);
        alert('❌ Erreur lors de l\'approbation.');
    }
};

// ========================================
// REFUSER UNE SOIRÉE
// ========================================

window.rejectEvent = async function(eventId, createdBy, eventName) {
    const reason = prompt(`❌ Refuser la soirée "${eventName}"\n\nVeuillez indiquer la raison du refus (optionnel):`);

    if (reason === null) {
        return; // L'utilisateur a annulé
    }

    try {
        console.log('❌ Refus de la soirée:', eventId);

        // Mettre à jour le statut
        await updateDoc(doc(db, 'events', eventId), {
            status: 'rejected',
            rejectedAt: serverTimestamp(),
            rejectionReason: reason || 'Aucune raison fournie'
        });

        // Créer une notification pour l'utilisateur
        const message = reason
            ? `Votre soirée "${eventName}" a été refusée par l'administrateur. Raison: ${reason}`
            : `Votre soirée "${eventName}" a été refusée par l'administrateur.`;

        await addDoc(collection(db, 'notifications'), {
            userId: createdBy,
            type: 'event_rejected',
            eventId: eventId,
            eventName: eventName,
            message: message,
            read: false,
            createdAt: serverTimestamp()
        });

        console.log('✅ Soirée refusée et notification envoyée');
        alert('✅ Soirée refusée.');

        // Recharger la liste
        loadPendingEvents();

    } catch (error) {
        console.error('❌ Erreur refus:', error);
        alert('❌ Erreur lors du refus.');
    }
};

// ========================================
// GESTION DES PARTENAIRES
// ========================================

// Gestion de l'upload d'image partenaire
partnerImageUploadArea.addEventListener('click', () => {
    partnerImageInput.click();
});

partnerImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('❌ Le logo ne doit pas dépasser 2MB.');
        partnerImageInput.value = '';
        return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner une image valide.');
        partnerImageInput.value = '';
        return;
    }

    currentPartnerImageFile = file;

    // Afficher l'aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
        partnerPreviewImg.src = e.target.result;
        partnerImagePreview.style.display = 'block';
        partnerImageUploadArea.classList.add('active');
    };
    reader.readAsDataURL(file);
});

// Ajouter/Modifier un partenaire
partnerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Vérifier qu'une image est sélectionnée
    if (!editingPartnerId && !currentPartnerImageFile) {
        alert('❌ Veuillez sélectionner un logo.');
        return;
    }

    setButtonLoading(partnerSubmitBtn, true);

    try {
        let imageData = null;

        // Upload nouvelle image si sélectionnée
        if (currentPartnerImageFile) {
            const timestamp = Date.now();
            const fileName = `partners/partner_${timestamp}.${currentPartnerImageFile.name.split('.').pop()}`;
            const storageRef = ref(storage, fileName);

            console.log('📤 Upload du logo partenaire...');
            const snapshot = await uploadBytes(storageRef, currentPartnerImageFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            imageData = {
                url: downloadURL,
                path: fileName
            };
        }

        if (editingPartnerId) {
            // MODIFIER (si jamais on veut implémenter l'édition)
            const updateData = {};
            if (imageData) {
                updateData.logoURL = imageData.url;
                updateData.logoPath = imageData.path;
            }
            updateData.updatedAt = serverTimestamp();

            await updateDoc(doc(db, 'partners', editingPartnerId), updateData);
            console.log('✅ Partenaire modifié');
            alert('✅ Partenaire modifié avec succès!');

        } else {
            // AJOUTER un nouveau partenaire
            const partnerData = {
                logoURL: imageData.url,
                logoPath: imageData.path,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'partners'), partnerData);
            console.log('✅ Partenaire ajouté:', docRef.id);
            alert('✅ Partenaire ajouté avec succès!');
        }

        // Réinitialiser le formulaire
        resetPartnerForm();

        // Recharger la liste
        loadPartners();

    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('❌ Erreur: ' + error.message);
    } finally {
        setButtonLoading(partnerSubmitBtn, false);
    }
});

// Charger les partenaires
async function loadPartners() {
    try {
        console.log('📥 Chargement des partenaires...');

        const querySnapshot = await getDocs(collection(db, 'partners'));

        // Vider la liste
        partnersList.innerHTML = '';

        if (querySnapshot.empty) {
            partnersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🤝</div>
                    <p>Aucun partenaire ajouté pour le moment.</p>
                </div>
            `;
            return;
        }

        // Afficher chaque partenaire
        querySnapshot.forEach((doc) => {
            const partner = doc.data();
            const partnerId = doc.id;

            const partnerItem = createPartnerItem(partnerId, partner);
            partnersList.appendChild(partnerItem);
        });

        console.log(`✅ ${querySnapshot.size} partenaire(s) chargé(s)`);

    } catch (error) {
        console.error('❌ Erreur chargement partenaires:', error);
        partnersList.innerHTML = `
            <div class="empty-state">
                <p style="color: #ff4d4f;">❌ Erreur lors du chargement des partenaires.</p>
            </div>
        `;
    }
}

// Créer un élément partenaire
function createPartnerItem(partnerId, partner) {
    const partnerItem = document.createElement('div');
    partnerItem.className = 'partner-item';

    partnerItem.innerHTML = `
        <img src="${partner.logoURL}" alt="Logo partenaire" class="partner-logo-thumb">
        <div class="partner-actions">
            <button class="btn btn-danger" onclick="deletePartner('${partnerId}', '${partner.logoPath || ''}')">🗑️ Supprimer</button>
        </div>
    `;

    return partnerItem;
}

// Supprimer un partenaire
window.deletePartner = async function(partnerId, logoPath) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce partenaire ?')) {
        return;
    }

    try {
        console.log('🗑️ Suppression partenaire:', partnerId);

        // Supprimer le logo du Storage
        if (logoPath) {
            try {
                const logoRef = ref(storage, logoPath);
                await deleteObject(logoRef);
                console.log('✅ Logo supprimé du Storage');
            } catch (error) {
                console.error('⚠️ Erreur suppression logo:', error);
            }
        }

        // Supprimer le document Firestore
        await deleteDoc(doc(db, 'partners', partnerId));

        console.log('✅ Partenaire supprimé');
        alert('✅ Partenaire supprimé avec succès!');

        // Recharger la liste
        loadPartners();

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression.');
    }
};

// Annuler l'édition partenaire
partnerCancelBtn.addEventListener('click', () => {
    resetPartnerForm();
});

// Réinitialiser le formulaire partenaire
function resetPartnerForm() {
    partnerForm.reset();
    editingPartnerId = null;
    currentPartnerImageFile = null;
    currentPartnerImageURL = null;
    partnerIdInput.value = '';
    partnerImagePreview.style.display = 'none';
    partnerImageUploadArea.classList.remove('active');
    partnerFormTitle.textContent = '🤝 Ajouter un partenaire';
    partnerSubmitBtn.textContent = 'Ajouter le partenaire';
    partnerCancelBtn.style.display = 'none';
    partnerImageInput.setAttribute('required', 'required');
}

console.log('🔥 Admin Panel initialisé');
