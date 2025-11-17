// ========================================
// MES SOIRÉES - Gestion des soirées par l'utilisateur
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    getStorage,
    ref,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

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

// Éléments DOM
const loading = document.getElementById('loading');
const content = document.getElementById('content');
const eventsList = document.getElementById('events-list');

// ========================================
// VÉRIFICATION UTILISATEUR CONNECTÉ
// ========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Pas connecté - rediriger
        window.location.href = 'login.html';
        return;
    }

    // Charger les soirées de l'utilisateur
    await loadUserEvents(user.uid);
});

// ========================================
// CHARGER LES SOIRÉES DE L'UTILISATEUR
// ========================================

async function loadUserEvents(userId) {
    try {
        console.log('📥 Chargement des soirées de l\'utilisateur...');

        // Récupérer les soirées créées par l'utilisateur
        const eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', userId)
        );

        const querySnapshot = await getDocs(eventsQuery);

        // Masquer le loader
        loading.style.display = 'none';
        content.style.display = 'block';

        if (querySnapshot.empty) {
            eventsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <p>Vous n'avez pas encore proposé de soirée.</p>
                    <p>Allez sur la page d'accueil pour proposer votre première soirée !</p>
                </div>
            `;
            return;
        }

        // Vider la liste
        eventsList.innerHTML = '';

        // Afficher chaque soirée
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const eventId = doc.id;

            const eventItem = createEventItem(eventId, event);
            eventsList.appendChild(eventItem);
        });

        console.log(`✅ ${querySnapshot.size} soirée(s) chargée(s)`);

    } catch (error) {
        console.error('❌ Erreur chargement soirées:', error);
        loading.style.display = 'none';
        content.style.display = 'block';
        eventsList.innerHTML = `
            <div class="empty-state">
                <p style="color: #ff4d4f;">❌ Erreur lors du chargement de vos soirées.</p>
            </div>
        `;
    }
}

// ========================================
// CRÉER UN ÉLÉMENT SOIRÉE
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

    // Déterminer le statut
    const status = event.status || 'approved';
    let statusBadge = '';
    let statusClass = '';
    let statusText = '';

    if (status === 'pending') {
        statusClass = 'status-pending';
        statusText = '⏳ En attente de validation';
    } else if (status === 'approved') {
        statusClass = 'status-approved';
        statusText = '✅ Approuvée';
    } else if (status === 'rejected') {
        statusClass = 'status-rejected';
        statusText = '❌ Refusée';
    }

    statusBadge = `<span class="event-status ${statusClass}">${statusText}</span>`;

    // Raison du refus si rejetée
    let rejectionReason = '';
    if (status === 'rejected' && event.rejectionReason) {
        rejectionReason = `<p style="color: #ff4d4f; margin-top: 8px;"><strong>Raison:</strong> ${event.rejectionReason}</p>`;
    }

    // Boutons d'action selon le statut
    let actionButtons = '';
    if (status === 'pending' || status === 'approved') {
        actionButtons = `
            <button class="btn btn-danger" onclick="deleteEvent('${eventId}', '${event.imagePath || ''}')">🗑️ Supprimer</button>
        `;
    }

    eventItem.innerHTML = `
        <img src="${event.imageURL}" alt="${event.name}" class="event-image-thumb">
        <div class="event-details">
            <h3>${event.name}</h3>
            <p>📅 ${formattedDate}</p>
            <p>📍 ${event.location}</p>
            <p>💰 ${event.price}€ • 🔞 ${event.age}+ ans</p>
            ${statusBadge}
            ${rejectionReason}
        </div>
        <div class="event-actions">
            ${actionButtons}
        </div>
    `;

    return eventItem;
}

// ========================================
// SUPPRIMER UNE SOIRÉE
// ========================================

window.deleteEvent = async function(eventId, imagePath) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette soirée ?')) {
        return;
    }

    try {
        console.log('🗑️ Suppression soirée:', eventId);

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

        console.log('✅ Soirée supprimée');
        alert('✅ Soirée supprimée avec succès!');

        // Recharger la page
        window.location.reload();

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression.');
    }
};

console.log('📋 Mes Soirées initialisé');
