/*
 * MES SOIREES - PAGE JAVASCRIPT
 * Display organizer's events with stats
 */

import { auth, db } from '/assets/js/core/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { isOrganizer, isAdmin } from '/assets/js/core/permissions.js';

// ==========================================
// STATE
// ==========================================

const state = {
    user: null,
    isOrganizer: false,
    isAdmin: false,
    events: []
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    loading: document.getElementById('loading'),
    content: document.getElementById('content'),
    eventsContainer: document.getElementById('events-container')
};

// ==========================================
// INITIALIZATION
// ==========================================

async function init() {
    try {
        // Setup auth listener
        onAuthStateChanged(auth, handleAuthChange);

    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// ==========================================
// AUTH CHANGE HANDLER
// ==========================================

async function handleAuthChange(user) {
    if (!user) {
        window.location.href = '/login.html?redirect=mes-soirees';
        return;
    }

    state.user = user;
    state.isOrganizer = await isOrganizer();
    state.isAdmin = await isAdmin();

    // Check if user has organizer or admin role
    if (!state.isOrganizer && !state.isAdmin) {
        window.location.href = '/index.html';
        return;
    }

    // Hide loading, show content
    elements.loading.style.display = 'none';
    elements.content.style.display = 'block';

    // Load events
    await loadEvents();
}

// ==========================================
// LOAD EVENTS
// ==========================================

async function loadEvents() {
    try {
        let eventsQuery;

        if (state.isAdmin) {
            // Admin sees all events
            eventsQuery = query(
                collection(db, 'events'),
                orderBy('createdAt', 'desc')
            );
        } else {
            // Organizer sees only their events
            eventsQuery = query(
                collection(db, 'events'),
                where('createdBy', '==', state.user.uid),
                orderBy('createdAt', 'desc')
            );
        }

        const eventsSnapshot = await getDocs(eventsQuery);

        if (eventsSnapshot.empty) {
            renderEmptyState();
            return;
        }

        // Load stats for each event (presales count, likes count)
        const eventsWithStats = await Promise.all(
            eventsSnapshot.docs.map(async (eventDoc) => {
                const event = { id: eventDoc.id, ...eventDoc.data() };

                // Get presales count
                try {
                    const presalesQuery = query(
                        collection(db, 'presales'),
                        where('eventId', '==', event.id)
                    );
                    const presalesSnapshot = await getDocs(presalesQuery);
                    event.presalesCount = presalesSnapshot.size;

                    // Count used presales
                    event.presalesUsed = presalesSnapshot.docs.filter(
                        doc => doc.data().status === 'used'
                    ).length;
                } catch (error) {
                    console.error('Error loading presales:', error);
                    event.presalesCount = 0;
                    event.presalesUsed = 0;
                }

                // Get likes count
                try {
                    const likesQuery = query(
                        collection(db, 'likes'),
                        where('eventId', '==', event.id)
                    );
                    const likesSnapshot = await getDocs(likesQuery);
                    event.likesCount = likesSnapshot.size;
                } catch (error) {
                    console.error('Error loading likes:', error);
                    event.likesCount = 0;
                }

                return event;
            })
        );

        state.events = eventsWithStats;
        renderEvents();

    } catch (error) {
        console.error('Error loading events:', error);
        renderError();
    }
}

// ==========================================
// RENDER EVENTS
// ==========================================

function renderEvents() {
    elements.eventsContainer.innerHTML = state.events.map(event => {
        const statusText = event.status === 'approved' ? 'Approuvé' :
                          event.status === 'pending' ? 'En attente' :
                          event.status === 'rejected' ? 'Rejeté' :
                          event.status;

        const statusClass = event.status === 'approved' ? 'valid' :
                           event.status === 'pending' ? 'used' :
                           'refunded';

        const eventDate = formatDate(event.date);
        const price = event.price || 0;
        const revenue = event.presalesCount ? (event.presalesCount * (event.ticketPrice || 0) / 100).toFixed(2) : '0.00';

        return `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-info-left">
                        <div class="event-name">${event.name}</div>
                        <div class="event-date">📅 ${eventDate}</div>
                        <div class="event-location">📍 ${event.location}</div>
                    </div>
                    <span class="prevente-status ${statusClass}">${statusText}</span>
                </div>

                <div class="event-meta">
                    <div class="event-meta-item">
                        <span class="event-meta-label">Prix:</span>
                        <span class="event-meta-value">${price}€</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-label">Préventes:</span>
                        <span class="event-meta-value">${event.presalesCount || 0}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-label">Utilisées:</span>
                        <span class="event-meta-value">${event.presalesUsed || 0}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-label">Likes:</span>
                        <span class="event-meta-value">${event.likesCount || 0}</span>
                    </div>
                    ${event.presales ? `
                        <div class="event-meta-item">
                            <span class="event-meta-label">Revenus:</span>
                            <span class="event-meta-value">${revenue}€</span>
                        </div>
                    ` : ''}
                </div>

                <div class="event-actions">
                    <a href="/index.html#event-${event.id}" class="btn btn-sm btn-secondary">
                        Voir l'événement
                    </a>
                    ${event.presales ? `
                        <a href="/scanner.html" class="btn btn-sm btn-primary">
                            Scanner les tickets
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// RENDER EMPTY STATE
// ==========================================

function renderEmptyState() {
    elements.eventsContainer.innerHTML = `
        <div class="no-content">
            <div class="no-content-icon">🎉</div>
            <div class="no-content-title">Aucun événement</div>
            <div class="no-content-text">
                Vous n'avez pas encore créé d'événements.
            </div>
            ${state.isAdmin ? `
                <a href="/admin-panel.html" class="btn btn-primary" style="margin-top: var(--space-4);">
                    Créer un événement
                </a>
            ` : ''}
        </div>
    `;
}

// ==========================================
// RENDER ERROR
// ==========================================

function renderError() {
    elements.eventsContainer.innerHTML = `
        <div class="no-content">
            <div class="no-content-icon">⚠️</div>
            <div class="no-content-title">Erreur de chargement</div>
            <div class="no-content-text">
                Impossible de charger vos événements.
            </div>
            <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: var(--space-4);">
                Réessayer
            </button>
        </div>
    `;
}

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

// ==========================================
// START APP
// ==========================================

init();
