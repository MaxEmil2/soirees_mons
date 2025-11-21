/*
 * SCANNER - PAGE JAVASCRIPT
 * Professional QR code scanner with instant validation
 */

import { auth, db } from '/assets/js/core/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { isAdmin, isScanner } from '/assets/js/core/permissions.js';
import { showError, showSuccess, showAlert } from '/assets/js/components/modal.js';

// ==========================================
// STATE
// ==========================================

const state = {
    user: null,
    isAdmin: false,
    isScanner: false,
    selectedEventId: null,
    currentPresaleData: null,
    html5QrCode: null,
    isScanning: false,
    presalesUnsubscribe: null
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    loading: document.getElementById('loading'),
    scannerContent: document.getElementById('scanner-content'),
    eventSelect: document.getElementById('event-select'),
    scannerSection: document.getElementById('scanner-section'),
    noEventSection: document.getElementById('no-event-section'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statUsed: document.getElementById('stat-used'),
    statValid: document.getElementById('stat-valid'),

    // Scanner
    reader: document.getElementById('reader'),

    // Result
    resultBox: document.getElementById('result-box'),
    resultIcon: document.getElementById('result-icon'),
    resultStatus: document.getElementById('result-status'),
    resultDetails: document.getElementById('result-details'),
    validateBtn: document.getElementById('validate-btn'),
    scanAgainBtn: document.getElementById('scan-again-btn'),

    // Presales list
    presalesContainer: document.getElementById('presales-container')
};

// ==========================================
// INITIALIZATION
// ==========================================

async function init() {
    try {
        // Setup auth listener
        onAuthStateChanged(auth, handleAuthChange);

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Erreur lors de l\'initialisation du scanner.');
    }
}

// ==========================================
// AUTH CHANGE HANDLER
// ==========================================

async function handleAuthChange(user) {
    if (!user) {
        window.location.href = '/login.html?redirect=scanner';
        return;
    }

    state.user = user;
    state.isAdmin = await isAdmin();
    state.isScanner = await isScanner();

    // Check if user has scanner or admin role
    if (!state.isScanner && !state.isAdmin) {
        showError('Vous n\'avez pas les permissions nécessaires pour accéder au scanner.');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        return;
    }

    // Hide loading, show content
    elements.loading.style.display = 'none';
    elements.scannerContent.style.display = 'block';

    // Load events
    await loadUserEvents();
}

// ==========================================
// SETUP EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Event selection
    elements.eventSelect.addEventListener('change', handleEventChange);

    // Validate button
    elements.validateBtn.addEventListener('click', handleValidateEntry);

    // Scan again button
    elements.scanAgainBtn.addEventListener('click', handleScanAgain);
}

// ==========================================
// LOAD USER EVENTS
// ==========================================

async function loadUserEvents() {
    try {
        let eventsQuery;

        if (state.isAdmin) {
            // Admin sees all approved events with presales
            eventsQuery = query(
                collection(db, 'events'),
                where('status', '==', 'approved'),
                where('presales', '==', true),
                orderBy('date', 'desc')
            );
        } else {
            // Scanner sees only events where they are assigned
            // Get user document to check scannerEvents array
            const userDoc = await getDoc(doc(db, 'users', state.user.uid));
            const userData = userDoc.data();
            const scannerEvents = userData.scannerEvents || [];

            if (scannerEvents.length === 0) {
                elements.eventSelect.innerHTML = '<option value="">Aucun événement assigné</option>';
                return;
            }

            // Load events where user is scanner
            eventsQuery = query(
                collection(db, 'events'),
                where('__name__', 'in', scannerEvents),
                where('presales', '==', true)
            );
        }

        const eventsSnapshot = await getDocs(eventsQuery);

        if (eventsSnapshot.empty) {
            elements.eventSelect.innerHTML = '<option value="">Aucun événement avec préventes</option>';
            return;
        }

        // Populate select
        elements.eventSelect.innerHTML = '<option value="">Sélectionnez un événement</option>';

        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;

            const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            option.textContent = `${event.name} - ${formattedDate}`;
            elements.eventSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading events:', error);
        elements.eventSelect.innerHTML = '<option value="">Erreur de chargement</option>';
        showError('Erreur lors du chargement des événements.');
    }
}

// ==========================================
// EVENT CHANGE HANDLER
// ==========================================

async function handleEventChange(e) {
    state.selectedEventId = e.target.value;

    if (!state.selectedEventId) {
        // No event selected - show empty state
        elements.scannerSection.style.display = 'none';
        elements.noEventSection.style.display = 'block';

        // Stop scanner if running
        if (state.html5QrCode && state.isScanning) {
            await stopScanner();
        }

        // Unsubscribe from presales updates
        if (state.presalesUnsubscribe) {
            state.presalesUnsubscribe();
            state.presalesUnsubscribe = null;
        }

        return;
    }

    // Event selected - show scanner section
    elements.scannerSection.style.display = 'block';
    elements.noEventSection.style.display = 'none';

    // Load data
    await loadPresalesStats();
    listenToPresales();
    await startScanner();
}

// ==========================================
// LOAD PRESALES STATS
// ==========================================

async function loadPresalesStats() {
    try {
        const presalesQuery = query(
            collection(db, 'presales'),
            where('eventId', '==', state.selectedEventId)
        );

        const presalesSnapshot = await getDocs(presalesQuery);

        let total = 0;
        let used = 0;
        let valid = 0;

        presalesSnapshot.forEach(doc => {
            const presale = doc.data();
            total++;

            if (presale.status === 'used') {
                used++;
            } else if (presale.status === 'valid') {
                valid++;
            }
        });

        elements.statTotal.textContent = total;
        elements.statUsed.textContent = used;
        elements.statValid.textContent = valid;

    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Erreur lors du chargement des statistiques.');
    }
}

// ==========================================
// LISTEN TO PRESALES (REAL-TIME)
// ==========================================

function listenToPresales() {
    // Unsubscribe from previous listener
    if (state.presalesUnsubscribe) {
        state.presalesUnsubscribe();
    }

    const presalesQuery = query(
        collection(db, 'presales'),
        where('eventId', '==', state.selectedEventId),
        orderBy('createdAt', 'desc')
    );

    state.presalesUnsubscribe = onSnapshot(presalesQuery, (snapshot) => {
        renderPresalesList(snapshot.docs);
        updateStatsFromSnapshot(snapshot.docs);
    }, (error) => {
        console.error('Error listening to presales:', error);
    });
}

// ==========================================
// UPDATE STATS FROM SNAPSHOT
// ==========================================

function updateStatsFromSnapshot(docs) {
    let total = 0;
    let used = 0;
    let valid = 0;

    docs.forEach(doc => {
        const presale = doc.data();
        total++;

        if (presale.status === 'used') {
            used++;
        } else if (presale.status === 'valid') {
            valid++;
        }
    });

    elements.statTotal.textContent = total;
    elements.statUsed.textContent = used;
    elements.statValid.textContent = valid;
}

// ==========================================
// RENDER PRESALES LIST
// ==========================================

function renderPresalesList(docs) {
    if (docs.length === 0) {
        elements.presalesContainer.innerHTML = `
            <div class="empty-presales">
                <p>Aucune prévente pour cet événement</p>
            </div>
        `;
        return;
    }

    elements.presalesContainer.innerHTML = docs.map(doc => {
        const presale = doc.data();
        const statusText = presale.status === 'valid' ? 'Valide' :
                          presale.status === 'used' ? 'Utilisé' :
                          presale.status;

        return `
            <div class="presale-item">
                <div class="presale-info">
                    <div class="presale-name">${presale.userName || 'Utilisateur'}</div>
                    <div class="presale-email">${presale.userEmail || ''}</div>
                </div>
                <span class="presale-status ${presale.status}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// ==========================================
// START SCANNER
// ==========================================

async function startScanner() {
    // Hide result box
    elements.resultBox.classList.remove('visible');

    // Stop existing scanner if running
    if (state.html5QrCode && state.isScanning) {
        await stopScanner();
    }

    // Initialize scanner
    state.html5QrCode = new Html5Qrcode("reader");

    try {
        await state.html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccess,
            onScanError
        );

        state.isScanning = true;

    } catch (error) {
        console.error('Error starting scanner:', error);

        elements.reader.innerHTML = `
            <div class="scanner-error">
                <div class="scanner-error-icon">📷</div>
                <p>Impossible d'accéder à la caméra</p>
                <p style="font-size: 0.875rem; margin-top: var(--space-2);">
                    Vérifiez les permissions de votre navigateur
                </p>
            </div>
        `;

        showError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
}

// ==========================================
// STOP SCANNER
// ==========================================

async function stopScanner() {
    if (state.html5QrCode && state.isScanning) {
        try {
            await state.html5QrCode.stop();
            state.isScanning = false;
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }
}

// ==========================================
// ON SCAN SUCCESS
// ==========================================

async function onScanSuccess(decodedText, decodedResult) {
    if (!state.selectedEventId) return;

    // Stop scanner temporarily
    await stopScanner();

    // Verify ticket via Cloud Function
    try {
        const functions = getFunctions();
        const verifyTicket = httpsCallable(functions, 'verifyTicket');

        const result = await verifyTicket({
            qrCodeData: decodedText,
            eventId: state.selectedEventId
        });

        displayResult(result.data);

    } catch (error) {
        console.error('Error verifying ticket:', error);

        displayResult({
            valid: false,
            status: 'error',
            message: error.message || 'Erreur lors de la vérification du ticket'
        });
    }
}

// ==========================================
// ON SCAN ERROR
// ==========================================

function onScanError(errorMessage) {
    // Ignore - normal when no QR code in frame
}

// ==========================================
// DISPLAY RESULT
// ==========================================

function displayResult(result) {
    const { resultBox, resultIcon, resultStatus, resultDetails, validateBtn } = elements;

    // Reset classes
    resultBox.classList.remove('valid', 'invalid', 'used', 'validated');
    resultBox.classList.add('visible');

    if (result.valid) {
        // Valid ticket
        resultBox.classList.add('valid');
        resultIcon.textContent = '✓';
        resultStatus.textContent = 'TICKET VALIDE';
        resultDetails.innerHTML = `
            <p><strong>Nom:</strong> ${result.userName}</p>
            <p><strong>Email:</strong> ${result.userEmail}</p>
        `;

        // Store presale data for validation
        state.currentPresaleData = {
            presaleId: result.presaleId
        };

        validateBtn.style.display = 'inline-block';
        validateBtn.disabled = false;

    } else if (result.status === 'already_used') {
        // Already used ticket
        resultBox.classList.add('used');
        resultIcon.textContent = '⚠';
        resultStatus.textContent = 'DÉJÀ UTILISÉ';
        resultDetails.innerHTML = `
            <p><strong>Nom:</strong> ${result.userName || 'N/A'}</p>
            <p>Ce ticket a déjà été utilisé</p>
            ${result.usedAt ? `<p>Le ${formatDateTime(result.usedAt)}</p>` : ''}
        `;

        validateBtn.style.display = 'none';
        state.currentPresaleData = null;

    } else {
        // Invalid ticket
        resultBox.classList.add('invalid');
        resultIcon.textContent = '✗';
        resultStatus.textContent = 'INVALIDE';
        resultDetails.innerHTML = `<p>${result.message || 'Ticket non valide'}</p>`;

        validateBtn.style.display = 'none';
        state.currentPresaleData = null;
    }
}

// ==========================================
// HANDLE VALIDATE ENTRY
// ==========================================

async function handleValidateEntry() {
    if (!state.currentPresaleData || !state.selectedEventId) return;

    elements.validateBtn.disabled = true;
    elements.validateBtn.textContent = 'Validation...';

    try {
        const functions = getFunctions();
        const markTicketUsed = httpsCallable(functions, 'markTicketUsed');

        const result = await markTicketUsed({
            presaleId: state.currentPresaleData.presaleId,
            eventId: state.selectedEventId
        });

        if (result.data.success) {
            // Update UI
            elements.resultBox.classList.remove('valid');
            elements.resultBox.classList.add('used', 'validated');
            elements.resultStatus.textContent = 'ENTRÉE VALIDÉE !';
            elements.validateBtn.style.display = 'none';

            // Show success message
            showSuccess('Entrée validée avec succès!');

            // Stats will auto-update via real-time listener
        } else {
            throw new Error(result.data.error || 'Erreur lors de la validation');
        }

    } catch (error) {
        console.error('Error validating entry:', error);
        showError(error.message || 'Erreur lors de la validation de l\'entrée.');

        elements.validateBtn.disabled = false;
        elements.validateBtn.textContent = 'VALIDER L\'ENTRÉE';
    }
}

// ==========================================
// HANDLE SCAN AGAIN
// ==========================================

async function handleScanAgain() {
    elements.resultBox.classList.remove('visible');
    state.currentPresaleData = null;
    await startScanner();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDateTime(timestamp) {
    let date;

    if (timestamp?.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==========================================
// CLEANUP ON PAGE UNLOAD
// ==========================================

window.addEventListener('beforeunload', async () => {
    await stopScanner();

    if (state.presalesUnsubscribe) {
        state.presalesUnsubscribe();
    }
});

// ==========================================
// START APP
// ==========================================

init();
