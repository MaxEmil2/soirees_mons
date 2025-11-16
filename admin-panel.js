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
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

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

// ========================================
// VARIABLES GLOBALES
// ========================================

let currentImageFile = null;
let editingEventId = null;
let currentImageURL = null;

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

        // Charger les événements
        loadEvents();

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
        console.log('📥 Chargement des événements...');

        // Récupérer tous les événements, triés par date
        const eventsQuery = query(
            collection(db, 'events'),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(eventsQuery);

        // Vider la liste
        eventsList.innerHTML = '';

        if (querySnapshot.empty) {
            // Aucun événement
            eventsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <p>Aucune soirée publiée pour le moment.</p>
                    <p>Ajoutez votre première soirée ci-dessus!</p>
                </div>
            `;
            return;
        }

        // Afficher chaque événement
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventId = doc.id;

            const eventItem = createEventItem(eventId, event);
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

    eventItem.innerHTML = `
        <img src="${event.imageURL}" alt="${event.name}" class="event-image-thumb">
        <div class="event-details">
            <h3>${event.name}</h3>
            <p>📅 ${formattedDate}</p>
            <p>📍 ${event.location}</p>
            <p>💰 ${event.price}€ • 🔞 ${event.age}+ ans</p>
            <p>🎟️ Préventes: ${event.presales ? '✅ Activées' : '❌ Désactivées'}</p>
        </div>
        <div class="event-actions">
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

console.log('🔥 Admin Panel initialisé');
