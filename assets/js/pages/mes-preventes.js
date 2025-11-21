/*
 * MES PREVENTES - PAGE JAVASCRIPT
 * Display user's presales with QR codes
 */

import { auth, db } from '/assets/js/core/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// QRCode library (from CDN)
// Loaded via script tag in HTML

// ==========================================
// STATE
// ==========================================

const state = {
    user: null,
    presales: []
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    loading: document.getElementById('loading'),
    content: document.getElementById('content'),
    presalesContainer: document.getElementById('presales-container')
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
        window.location.href = '/login.html?redirect=mes-preventes';
        return;
    }

    state.user = user;

    // Hide loading, show content
    elements.loading.style.display = 'none';
    elements.content.style.display = 'block';

    // Load presales
    await loadPresales();
}

// ==========================================
// LOAD PRESALES
// ==========================================

async function loadPresales() {
    try {
        // Query presales for current user
        const presalesQuery = query(
            collection(db, 'presales'),
            where('userId', '==', state.user.uid),
            orderBy('createdAt', 'desc')
        );

        const presalesSnapshot = await getDocs(presalesQuery);

        if (presalesSnapshot.empty) {
            renderEmptyState();
            return;
        }

        // Load event details for each presale
        const presalesWithEvents = await Promise.all(
            presalesSnapshot.docs.map(async (presaleDoc) => {
                const presale = { id: presaleDoc.id, ...presaleDoc.data() };

                // Get event details
                try {
                    const eventDoc = await getDoc(doc(db, 'events', presale.eventId));
                    if (eventDoc.exists()) {
                        presale.event = eventDoc.data();
                    }
                } catch (error) {
                    console.error('Error loading event:', error);
                }

                return presale;
            })
        );

        state.presales = presalesWithEvents;
        renderPresales();

    } catch (error) {
        console.error('Error loading presales:', error);
        renderError();
    }
}

// ==========================================
// RENDER PRESALES
// ==========================================

function renderPresales() {
    elements.presalesContainer.innerHTML = state.presales.map(presale => {
        const statusText = presale.status === 'valid' ? 'Valide' :
                          presale.status === 'used' ? 'Utilisé' :
                          presale.status === 'refunded' ? 'Remboursé' :
                          presale.status;

        const eventName = presale.event?.name || 'Événement inconnu';
        const eventDate = presale.event?.date ? formatDate(presale.event.date) : 'Date inconnue';
        const price = presale.price ? (presale.price / 100).toFixed(2) : '0.00';

        return `
            <div class="prevente-card">
                <div class="prevente-header">
                    <div class="prevente-info-left">
                        <div class="prevente-event-name">${eventName}</div>
                        <div class="prevente-date">📅 ${eventDate}</div>
                    </div>
                    <span class="prevente-status ${presale.status}">${statusText}</span>
                </div>

                <div class="prevente-qr-section">
                    <div class="prevente-qr" id="qr-${presale.id}"></div>
                    <div class="prevente-info">
                        <div class="prevente-info-row">
                            <span class="prevente-info-label">Prix:</span>
                            <span class="prevente-info-value">${price}€</span>
                        </div>
                        <div class="prevente-info-row">
                            <span class="prevente-info-label">Acheté le:</span>
                            <span class="prevente-info-value">${formatDate(presale.createdAt)}</span>
                        </div>
                        ${presale.status === 'used' && presale.usedAt ? `
                            <div class="prevente-info-row">
                                <span class="prevente-info-label">Utilisé le:</span>
                                <span class="prevente-info-value">${formatDate(presale.usedAt)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="prevente-id">ID: ${presale.id}</div>
            </div>
        `;
    }).join('');

    // Generate QR codes
    state.presales.forEach(presale => {
        const qrElement = document.getElementById(`qr-${presale.id}`);
        if (qrElement && typeof QRCode !== 'undefined') {
            new QRCode(qrElement, {
                text: presale.qrCode || presale.id,
                width: 100,
                height: 100,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    });
}

// ==========================================
// RENDER EMPTY STATE
// ==========================================

function renderEmptyState() {
    elements.presalesContainer.innerHTML = `
        <div class="no-content">
            <div class="no-content-icon">🎫</div>
            <div class="no-content-title">Aucune prévente</div>
            <div class="no-content-text">
                Vous n'avez pas encore acheté de préventes.
            </div>
            <a href="/index.html" class="btn btn-primary" style="margin-top: var(--space-4);">
                Découvrir les événements
            </a>
        </div>
    `;
}

// ==========================================
// RENDER ERROR
// ==========================================

function renderError() {
    elements.presalesContainer.innerHTML = `
        <div class="no-content">
            <div class="no-content-icon">⚠️</div>
            <div class="no-content-title">Erreur de chargement</div>
            <div class="no-content-text">
                Impossible de charger vos préventes.
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
