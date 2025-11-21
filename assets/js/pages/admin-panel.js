/*
 * ADMIN PANEL - PAGE JAVASCRIPT
 * Professional admin interface with secure backend operations
 */

import { auth, db, storage } from '/assets/js/core/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, getDoc, addDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { isAdmin, requireAdmin } from '/assets/js/core/permissions.js';
import { compressEventImage, previewImage, validateImage } from '/assets/js/components/image-optimizer.js';
import { showAlert, showConfirm, showError, showSuccess, showLoading } from '/assets/js/components/modal.js';

// ==========================================
// STATE
// ==========================================

const state = {
    user: null,
    isAdmin: false,
    events: [],
    pendingEvents: [],
    partners: [],
    suggestions: [],
    editingEventId: null,
    editingPartnerId: null,
    eventImageFile: null,
    partnerImageFile: null
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    loading: document.getElementById('loading'),
    adminContent: document.getElementById('admin-content'),

    // Event form
    eventForm: document.getElementById('event-form'),
    formTitle: document.getElementById('form-title'),
    eventId: document.getElementById('event-id'),
    eventName: document.getElementById('event-name'),
    eventDate: document.getElementById('event-date'),
    eventLocation: document.getElementById('event-location'),
    eventPrice: document.getElementById('event-price'),
    eventAge: document.getElementById('event-age'),
    eventLink: document.getElementById('event-link'),
    eventDescription: document.getElementById('event-description'),
    presalesToggle: document.getElementById('presales-toggle'),
    presalesLabel: document.getElementById('presales-label'),
    eventPresales: document.getElementById('event-presales'),
    presalesEndContainer: document.getElementById('presales-end-container'),
    presalesEndDate: document.getElementById('presales-end-date'),
    imageUploadArea: document.getElementById('image-upload-area'),
    imageInput: document.getElementById('image-input'),
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),
    submitBtn: document.getElementById('submit-btn'),
    cancelBtn: document.getElementById('cancel-btn'),

    // Lists
    eventsList: document.getElementById('events-list'),
    pendingEventsList: document.getElementById('pending-events-list'),

    // Partner form
    partnerForm: document.getElementById('partner-form'),
    partnerFormTitle: document.getElementById('partner-form-title'),
    partnerId: document.getElementById('partner-id'),
    partnerImageUploadArea: document.getElementById('partner-image-upload-area'),
    partnerImageInput: document.getElementById('partner-image-input'),
    partnerImagePreview: document.getElementById('partner-image-preview'),
    partnerPreviewImg: document.getElementById('partner-preview-img'),
    partnerSubmitBtn: document.getElementById('partner-submit-btn'),
    partnerCancelBtn: document.getElementById('partner-cancel-btn'),
    partnersList: document.getElementById('partners-list'),

    // Suggestions
    suggestionsList: document.getElementById('suggestions-list')
};

// ==========================================
// INITIALIZATION
// ==========================================

async function init() {
    try {
        // Check admin permission
        await requireAdmin();

        // Setup auth listener
        onAuthStateChanged(auth, handleAuthChange);

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Erreur lors de l\'initialisation de la page admin.');
        window.location.href = '/index.html';
    }
}

// ==========================================
// AUTH CHANGE HANDLER
// ==========================================

async function handleAuthChange(user) {
    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    state.user = user;
    state.isAdmin = await isAdmin();

    if (!state.isAdmin) {
        showError('Vous n\'avez pas les permissions nécessaires pour accéder à cette page.');
        window.location.href = '/index.html';
        return;
    }

    // Hide loading, show content
    elements.loading.style.display = 'none';
    elements.adminContent.style.display = 'block';

    // Setup event listeners
    setupEventListeners();

    // Load data
    loadEvents();
    loadPendingEvents();
    loadPartners();
    loadSuggestions();
}

// ==========================================
// SETUP EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Event form
    elements.eventForm.addEventListener('submit', handleEventSubmit);
    elements.cancelBtn.addEventListener('click', resetEventForm);
    elements.presalesToggle.addEventListener('click', togglePresales);
    elements.imageUploadArea.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleEventImageSelect);

    // Partner form
    elements.partnerForm.addEventListener('submit', handlePartnerSubmit);
    elements.partnerCancelBtn.addEventListener('click', resetPartnerForm);
    elements.partnerImageUploadArea.addEventListener('click', () => elements.partnerImageInput.click());
    elements.partnerImageInput.addEventListener('change', handlePartnerImageSelect);
}

// ==========================================
// PRESALES TOGGLE
// ==========================================

function togglePresales() {
    const isActive = elements.presalesToggle.classList.toggle('active');
    elements.presalesLabel.textContent = isActive ? 'Activé' : 'Désactivé';
    elements.eventPresales.value = isActive ? 'true' : 'false';
    elements.presalesEndContainer.style.display = isActive ? 'block' : 'none';
}

// ==========================================
// EVENT IMAGE SELECT
// ==========================================

async function handleEventImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    const validation = await validateImage(file, {
        maxSizeMB: 5,
        minWidth: 400,
        minHeight: 400
    });

    if (!validation.valid) {
        showError(validation.error);
        elements.imageInput.value = '';
        return;
    }

    // Preview
    previewImage(file, (result) => {
        if (result.success) {
            elements.previewImg.src = result.dataUrl;
            elements.imagePreview.style.display = 'block';
            elements.imageUploadArea.classList.add('active');
        }
    });

    // Compress
    const compressionResult = await compressEventImage(file);
    if (compressionResult.success) {
        state.eventImageFile = compressionResult.file;
        console.log(`Image compressed: ${compressionResult.reductionPercent}% reduction`);
    } else {
        state.eventImageFile = file;
    }
}

// ==========================================
// PARTNER IMAGE SELECT
// ==========================================

async function handlePartnerImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    const validation = await validateImage(file, {
        maxSizeMB: 2,
        minWidth: 200,
        minHeight: 100
    });

    if (!validation.valid) {
        showError(validation.error);
        elements.partnerImageInput.value = '';
        return;
    }

    // Preview
    previewImage(file, (result) => {
        if (result.success) {
            elements.partnerPreviewImg.src = result.dataUrl;
            elements.partnerImagePreview.style.display = 'block';
            elements.partnerImageUploadArea.classList.add('active');
        }
    });

    state.partnerImageFile = file;
}

// ==========================================
// EVENT FORM SUBMIT
// ==========================================

async function handleEventSubmit(e) {
    e.preventDefault();

    const isEditing = !!state.editingEventId;
    const loadingModal = showLoading(isEditing ? 'Mise à jour de l\'événement...' : 'Création de l\'événement...');

    try {
        // Validate image (required for new events)
        if (!isEditing && !state.eventImageFile) {
            throw new Error('Veuillez sélectionner une image pour l\'événement.');
        }

        // Upload image if new file selected
        let imageUrl = null;
        if (state.eventImageFile) {
            imageUrl = await uploadEventImage(state.eventImageFile);
        }

        // Prepare event data
        const eventData = {
            name: elements.eventName.value.trim(),
            date: new Date(elements.eventDate.value),
            location: elements.eventLocation.value.trim(),
            price: parseFloat(elements.eventPrice.value),
            age: parseInt(elements.eventAge.value),
            link: elements.eventLink.value.trim() || null,
            description: elements.eventDescription.value.trim() || null,
            presales: elements.eventPresales.value === 'true',
            presalesEndDate: elements.eventPresales.value === 'true' && elements.presalesEndDate.value
                ? new Date(elements.presalesEndDate.value)
                : null
        };

        if (imageUrl) {
            eventData.imageUrl = imageUrl;
        }

        // Call Cloud Function
        const functions = getFunctions();
        let result;

        if (isEditing) {
            const updateEvent = httpsCallable(functions, 'updateEvent');
            result = await updateEvent({
                eventId: state.editingEventId,
                updates: eventData
            });
        } else {
            const createEvent = httpsCallable(functions, 'createEvent');
            result = await createEvent(eventData);
        }

        loadingModal.close();

        if (result.data.success) {
            showSuccess(isEditing ? 'Événement mis à jour avec succès!' : 'Événement créé avec succès!');
            resetEventForm();
        } else {
            throw new Error(result.data.error || 'Une erreur est survenue');
        }

    } catch (error) {
        loadingModal.close();
        console.error('Event submit error:', error);
        showError(error.message || 'Erreur lors de la sauvegarde de l\'événement.');
    }
}

// ==========================================
// UPLOAD EVENT IMAGE
// ==========================================

async function uploadEventImage(file) {
    const timestamp = Date.now();
    const fileName = `events/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

// ==========================================
// RESET EVENT FORM
// ==========================================

function resetEventForm() {
    elements.eventForm.reset();
    elements.eventId.value = '';
    elements.presalesToggle.classList.remove('active');
    elements.presalesLabel.textContent = 'Désactivé';
    elements.eventPresales.value = 'false';
    elements.presalesEndContainer.style.display = 'none';
    elements.imagePreview.style.display = 'none';
    elements.imageUploadArea.classList.remove('active');
    elements.imageInput.value = '';
    elements.imageInput.required = true;
    elements.formTitle.innerHTML = '<span>➕</span> Ajouter une nouvelle soirée';
    elements.submitBtn.textContent = 'Publier la soirée';
    elements.cancelBtn.style.display = 'none';
    state.editingEventId = null;
    state.eventImageFile = null;
}

// ==========================================
// LOAD EVENTS
// ==========================================

function loadEvents() {
    const eventsQuery = query(
        collection(db, 'events'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(eventsQuery, (snapshot) => {
        state.events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderEvents();
    }, (error) => {
        console.error('Error loading events:', error);
        showError('Erreur lors du chargement des événements.');
    });
}

// ==========================================
// LOAD PENDING EVENTS
// ==========================================

function loadPendingEvents() {
    const pendingQuery = query(
        collection(db, 'events'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(pendingQuery, (snapshot) => {
        state.pendingEvents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderPendingEvents();
    }, (error) => {
        console.error('Error loading pending events:', error);
    });
}

// ==========================================
// RENDER EVENTS
// ==========================================

function renderEvents() {
    if (state.events.length === 0) {
        elements.eventsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Aucun événement publié</p>
            </div>
        `;
        return;
    }

    elements.eventsList.innerHTML = state.events.map(event => `
        <div class="item-card">
            <img src="${event.imageUrl}" alt="${event.name}" class="item-thumbnail">
            <div class="item-details">
                <h3 class="item-title">${event.name}</h3>
                <div class="item-meta">
                    <span class="item-meta-item">
                        📅 ${formatDate(event.date)}
                    </span>
                    <span class="item-meta-item">
                        📍 ${event.location}
                    </span>
                    <span class="item-meta-item">
                        💰 ${event.price}€
                    </span>
                </div>
                ${event.presales ? '<div class="item-badges"><span class="badge badge-primary">Préventes</span></div>' : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-warning" onclick="editEvent('${event.id}')">
                    Modifier
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}', '${event.imageUrl}')">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// RENDER PENDING EVENTS
// ==========================================

function renderPendingEvents() {
    if (state.pendingEvents.length === 0) {
        elements.pendingEventsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <p>Aucun événement en attente</p>
            </div>
        `;
        return;
    }

    elements.pendingEventsList.innerHTML = state.pendingEvents.map(event => `
        <div class="item-card">
            <img src="${event.imageUrl}" alt="${event.name}" class="item-thumbnail">
            <div class="item-details">
                <h3 class="item-title">${event.name}</h3>
                <div class="item-meta">
                    <span class="item-meta-item">
                        📅 ${formatDate(event.date)}
                    </span>
                    <span class="item-meta-item">
                        📍 ${event.location}
                    </span>
                    <span class="item-meta-item">
                        💰 ${event.price}€
                    </span>
                    <span class="item-meta-item">
                        👤 ${event.createdBy || 'Inconnu'}
                    </span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-success" onclick="approveEvent('${event.id}')">
                    Approuver
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectEvent('${event.id}')">
                    Rejeter
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// EDIT EVENT
// ==========================================

window.editEvent = async function(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    state.editingEventId = eventId;

    // Populate form
    elements.eventName.value = event.name;
    elements.eventDate.value = formatDateForInput(event.date);
    elements.eventLocation.value = event.location;
    elements.eventPrice.value = event.price;
    elements.eventAge.value = event.age;
    elements.eventLink.value = event.link || '';
    elements.eventDescription.value = event.description || '';

    // Presales
    if (event.presales) {
        elements.presalesToggle.classList.add('active');
        elements.presalesLabel.textContent = 'Activé';
        elements.eventPresales.value = 'true';
        elements.presalesEndContainer.style.display = 'block';
        if (event.presalesEndDate) {
            elements.presalesEndDate.value = formatDateForInput(event.presalesEndDate);
        }
    }

    // Show current image
    if (event.imageUrl) {
        elements.previewImg.src = event.imageUrl;
        elements.imagePreview.style.display = 'block';
        elements.imageUploadArea.classList.add('active');
        elements.imageInput.required = false;
    }

    // Update UI
    elements.formTitle.innerHTML = '<span>✏️</span> Modifier la soirée';
    elements.submitBtn.textContent = 'Mettre à jour';
    elements.cancelBtn.style.display = 'inline-block';

    // Scroll to form
    elements.eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ==========================================
// DELETE EVENT
// ==========================================

window.deleteEvent = async function(eventId, imageUrl) {
    const confirmed = await showConfirm(
        'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
        'Confirmer la suppression',
        { confirmText: 'Supprimer', cancelText: 'Annuler' }
    );

    if (!confirmed) return;

    const loadingModal = showLoading('Suppression de l\'événement...');

    try {
        const functions = getFunctions();
        const deleteEvent = httpsCallable(functions, 'deleteEvent');
        const result = await deleteEvent({ eventId });

        loadingModal.close();

        if (result.data.success) {
            showSuccess('Événement supprimé avec succès!');
        } else {
            throw new Error(result.data.error);
        }

    } catch (error) {
        loadingModal.close();
        console.error('Delete event error:', error);
        showError('Erreur lors de la suppression de l\'événement.');
    }
};

// ==========================================
// APPROVE EVENT
// ==========================================

window.approveEvent = async function(eventId) {
    const loadingModal = showLoading('Approbation de l\'événement...');

    try {
        const functions = getFunctions();
        const approveEvent = httpsCallable(functions, 'approveEvent');
        const result = await approveEvent({ eventId, approved: true });

        loadingModal.close();

        if (result.data.success) {
            showSuccess('Événement approuvé avec succès!');
        } else {
            throw new Error(result.data.error);
        }

    } catch (error) {
        loadingModal.close();
        console.error('Approve event error:', error);
        showError('Erreur lors de l\'approbation de l\'événement.');
    }
};

// ==========================================
// REJECT EVENT
// ==========================================

window.rejectEvent = async function(eventId) {
    const confirmed = await showConfirm(
        'Voulez-vous rejeter cet événement ? L\'organisateur sera notifié.',
        'Confirmer le rejet',
        { confirmText: 'Rejeter', cancelText: 'Annuler' }
    );

    if (!confirmed) return;

    const loadingModal = showLoading('Rejet de l\'événement...');

    try {
        const functions = getFunctions();
        const approveEvent = httpsCallable(functions, 'approveEvent');
        const result = await approveEvent({
            eventId,
            approved: false,
            reason: 'Événement rejeté par l\'administrateur'
        });

        loadingModal.close();

        if (result.data.success) {
            showSuccess('Événement rejeté avec succès.');
        } else {
            throw new Error(result.data.error);
        }

    } catch (error) {
        loadingModal.close();
        console.error('Reject event error:', error);
        showError('Erreur lors du rejet de l\'événement.');
    }
};

// ==========================================
// PARTNER FORM SUBMIT
// ==========================================

async function handlePartnerSubmit(e) {
    e.preventDefault();

    const isEditing = !!state.editingPartnerId;
    const loadingModal = showLoading(isEditing ? 'Mise à jour du partenaire...' : 'Ajout du partenaire...');

    try {
        // Validate image (required)
        if (!state.partnerImageFile && !isEditing) {
            throw new Error('Veuillez sélectionner un logo pour le partenaire.');
        }

        // Upload image if new file
        let imageUrl = null;
        if (state.partnerImageFile) {
            imageUrl = await uploadPartnerImage(state.partnerImageFile);
        }

        const partnerData = {
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        };

        if (isEditing) {
            await updateDoc(doc(db, 'partners', state.editingPartnerId), {
                ...partnerData,
                updatedAt: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, 'partners'), partnerData);
        }

        loadingModal.close();
        showSuccess(isEditing ? 'Partenaire mis à jour!' : 'Partenaire ajouté!');
        resetPartnerForm();

    } catch (error) {
        loadingModal.close();
        console.error('Partner submit error:', error);
        showError('Erreur lors de la sauvegarde du partenaire.');
    }
}

// ==========================================
// UPLOAD PARTNER IMAGE
// ==========================================

async function uploadPartnerImage(file) {
    const timestamp = Date.now();
    const fileName = `partners/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

// ==========================================
// RESET PARTNER FORM
// ==========================================

function resetPartnerForm() {
    elements.partnerForm.reset();
    elements.partnerId.value = '';
    elements.partnerImagePreview.style.display = 'none';
    elements.partnerImageUploadArea.classList.remove('active');
    elements.partnerImageInput.value = '';
    elements.partnerImageInput.required = true;
    elements.partnerFormTitle.innerHTML = '<span>🤝</span> Ajouter un partenaire';
    elements.partnerSubmitBtn.textContent = 'Ajouter le partenaire';
    elements.partnerCancelBtn.style.display = 'none';
    state.editingPartnerId = null;
    state.partnerImageFile = null;
}

// ==========================================
// LOAD PARTNERS
// ==========================================

function loadPartners() {
    const partnersQuery = query(
        collection(db, 'partners'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(partnersQuery, (snapshot) => {
        state.partners = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderPartners();
    }, (error) => {
        console.error('Error loading partners:', error);
    });
}

// ==========================================
// RENDER PARTNERS
// ==========================================

function renderPartners() {
    if (state.partners.length === 0) {
        elements.partnersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <p>Aucun partenaire ajouté</p>
            </div>
        `;
        return;
    }

    elements.partnersList.innerHTML = state.partners.map(partner => `
        <div class="item-card">
            <img src="${partner.imageUrl}" alt="Partner" class="item-thumbnail partner-thumbnail">
            <div class="item-details">
                <p class="item-description">Partenaire ajouté le ${formatDate(partner.createdAt)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-danger" onclick="deletePartner('${partner.id}', '${partner.imageUrl}')">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// DELETE PARTNER
// ==========================================

window.deletePartner = async function(partnerId, imageUrl) {
    const confirmed = await showConfirm(
        'Supprimer ce partenaire ?',
        'Confirmer la suppression'
    );

    if (!confirmed) return;

    const loadingModal = showLoading('Suppression...');

    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'partners', partnerId));

        // Delete image from Storage
        if (imageUrl) {
            try {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef);
            } catch (error) {
                console.warn('Failed to delete partner image:', error);
            }
        }

        loadingModal.close();
        showSuccess('Partenaire supprimé!');

    } catch (error) {
        loadingModal.close();
        console.error('Delete partner error:', error);
        showError('Erreur lors de la suppression.');
    }
};

// ==========================================
// LOAD SUGGESTIONS
// ==========================================

function loadSuggestions() {
    const suggestionsQuery = query(
        collection(db, 'suggestions'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(suggestionsQuery, (snapshot) => {
        state.suggestions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderSuggestions();
    }, (error) => {
        console.error('Error loading suggestions:', error);
    });
}

// ==========================================
// RENDER SUGGESTIONS
// ==========================================

function renderSuggestions() {
    if (state.suggestions.length === 0) {
        elements.suggestionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💡</div>
                <p>Aucune suggestion</p>
            </div>
        `;
        return;
    }

    elements.suggestionsList.innerHTML = state.suggestions.map(suggestion => `
        <div class="suggestion-card">
            <div class="suggestion-header">
                <div class="suggestion-user">
                    <img src="${suggestion.userPhoto || '/assets/images/default-avatar.png'}" alt="${suggestion.userName}" class="suggestion-avatar">
                    <div class="suggestion-user-info">
                        <div class="suggestion-user-name">${suggestion.userName || 'Utilisateur'}</div>
                        <div class="suggestion-date">${formatDate(suggestion.createdAt)}</div>
                    </div>
                </div>
            </div>
            <div class="suggestion-content">${suggestion.content}</div>
            <div class="suggestion-actions">
                <button class="btn btn-sm btn-danger" onclick="deleteSuggestion('${suggestion.id}')">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// DELETE SUGGESTION
// ==========================================

window.deleteSuggestion = async function(suggestionId) {
    const confirmed = await showConfirm(
        'Supprimer cette suggestion ?',
        'Confirmer la suppression'
    );

    if (!confirmed) return;

    const loadingModal = showLoading('Suppression...');

    try {
        await deleteDoc(doc(db, 'suggestions', suggestionId));
        loadingModal.close();
        showSuccess('Suggestion supprimée!');

    } catch (error) {
        loadingModal.close();
        console.error('Delete suggestion error:', error);
        showError('Erreur lors de la suppression.');
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';

    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForInput(timestamp) {
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    // Format for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ==========================================
// START APP
// ==========================================

init();
