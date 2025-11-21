// ========================================
// MES SOIRÉES - Gestion des soirées par l'utilisateur
// ARCHITECTURE SÉCURISÉE V2
// ========================================

// Import des services sécurisés
import { authService } from './src/services/auth.service.js';
import { eventsService } from './src/services/events.service.js';
import { toast } from './src/components/Toast.js';
import { showSuccess, showError, showConfirm } from './modal-utils.js';

// Firebase direct imports (pour l'auth state observer)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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
        // Utiliser eventsService (architecture sécurisée)
        const result = await eventsService.getMyEvents(userId);

        // Masquer le loader
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

        if (!result.success) {
            showError(result.error || 'Erreur lors du chargement de vos soirées');
            if (eventsList) {
                eventsList.innerHTML = `
                    <div class="empty-state">
                        <p style="color: #ff4d4f;">❌ Erreur lors du chargement de vos soirées.</p>
                    </div>
                `;
            }
            return;
        }

        const events = result.events;

        if (!events || events.length === 0) {
            if (eventsList) {
                eventsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🎉</div>
                        <p>Vous n'avez pas encore proposé de soirée.</p>
                        <p>Allez sur la page d'accueil pour proposer votre première soirée !</p>
                    </div>
                `;
            }
            return;
        }

        // Vider la liste
        if (eventsList) eventsList.innerHTML = '';

        // Afficher chaque soirée
        events.forEach((event) => {
            const eventItem = createEventItem(event.id, event);
            if (eventsList) eventsList.appendChild(eventItem);
        });

    } catch (error) {
        console.error('Erreur chargement événements:', error);

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

        if (eventsList) {
            eventsList.innerHTML = `
                <div class="empty-state">
                    <p style="color: #ff4d4f;">❌ Erreur lors du chargement de vos soirées.</p>
                </div>
            `;
        }
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
        <div class="event-thumbnail">
            <img src="${event.imageURL}" alt="${event.name}">
        </div>
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
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette soirée ?');
    if (!confirmed) {
        return;
    }

    try {
        // Utiliser eventsService (architecture sécurisée)
        // Le service gère automatiquement la suppression de l'image dans Storage
        const result = await eventsService.deleteEvent(eventId);

        if (result.success) {
            toast.success('Soirée supprimée avec succès!');

            // Rafraîchir la page après un court délai
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showError(result.error || 'Erreur lors de la suppression.');
        }

    } catch (error) {
        console.error('Erreur suppression:', error);
        showError('Erreur lors de la suppression.');
    }
};

// ========================================
// LOGS DE DÉMARRAGE
// ========================================

console.log('✅ Mes Soirées page loaded - Architecture sécurisée V2');
console.log('🔐 Services initialisés: authService, eventsService');
