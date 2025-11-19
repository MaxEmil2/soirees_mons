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
    getDoc,
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

import { showSuccess, showError, showConfirm } from './modal-utils.js';

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


    } catch (error) {
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
        // Bouton stop préventes si préventes activées
        let stopPresalesBtn = '';
        if (event.presales && status === 'approved') {
            const isSoldOut = event.presalesStopped || (event.maxPresales && event.presalesSold >= event.maxPresales);
            if (!isSoldOut) {
                stopPresalesBtn = `
                    <button class="btn btn-warning" onclick="stopPresales('${eventId}')" style="background: linear-gradient(90deg, #faad14, #ffc53d); margin-bottom: 8px;">
                        🛑 Stop préventes
                    </button>
                `;
            } else {
                stopPresalesBtn = `
                    <span style="color: #ff4d4f; font-weight: bold; display: block; margin-bottom: 8px;">🔥 SOLD OUT</span>
                `;
            }
        }

        // Bouton gérer les scanners
        let scannersBtn = '';
        if (status === 'approved' && event.presales) {
            const scannerCount = event.scanners ? event.scanners.length : 0;
            scannersBtn = `
                <button class="btn btn-secondary" onclick="manageScanners('${eventId}')" style="margin-bottom: 8px;">
                    👥 Scanners (${scannerCount}/7)
                </button>
            `;
        }

        actionButtons = `
            ${stopPresalesBtn}
            ${scannersBtn}
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

        // Supprimer l'image du Storage
        if (imagePath) {
            try {
                const imageRef = ref(storage, imagePath);
                await deleteObject(imageRef);
            } catch (error) {
            }
        }

        // Supprimer le document Firestore
        await deleteDoc(doc(db, 'events', eventId));

        showSuccess('Soirée supprimée avec succès!', () => {
            window.location.reload();
        });

    } catch (error) {
        showError('Erreur lors de la suppression.');
    }
};

// ========================================
// STOP PRÉVENTES (marquer comme sold out)
// ========================================

window.stopPresales = async function(eventId) {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir arrêter les préventes ? Cela marquera l\'événement comme SOLD OUT.');
    if (!confirmed) {
        return;
    }

    try {
        // Récupérer l'événement pour obtenir maxPresales
        const eventRef = doc(db, 'events', eventId);

        // Mettre presalesSold = maxPresales pour marquer comme sold out
        // Ou si pas de maxPresales, ajouter un flag
        await updateDoc(eventRef, {
            presalesStopped: true
        });

        showSuccess('Préventes arrêtées ! L\'événement est maintenant SOLD OUT.', () => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Erreur stop préventes:', error);
        showError('Erreur lors de l\'arrêt des préventes.');
    }
};

// ========================================
// GÉRER LES SCANNERS
// ========================================

window.manageScanners = async function(eventId) {
    // Créer un modal pour gérer les scanners
    const modalHtml = `
        <div id="scanners-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: #1a1a2e; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="color: #6c63ff; margin-bottom: 20px;">👥 Gérer les Scanners</h3>
                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 20px;">
                    Les scanners peuvent vérifier les tickets à l'entrée mais ne peuvent pas modifier ou supprimer l'événement.
                </p>

                <div id="scanners-list" style="margin-bottom: 20px;">
                    <p style="color: rgba(255,255,255,0.5);">Chargement...</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <input type="text" id="scanner-uid-input" placeholder="UID du scanner à ajouter"
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(108, 99, 255, 0.3); background: rgba(255,255,255,0.05); color: white; margin-bottom: 10px;">
                    <button onclick="addScanner('${eventId}')" style="width: 100%; padding: 12px; background: linear-gradient(90deg, #6c63ff, #00d4ff); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: bold;">
                        ➕ Ajouter un scanner
                    </button>
                </div>

                <button onclick="closeScannerModal()" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Charger les scanners actuels
    await loadScanners(eventId);
};

async function loadScanners(eventId) {
    const scannersList = document.getElementById('scanners-list');

    try {
        const eventDocRef = doc(db, 'events', eventId);
        const eventDocSnap = await getDoc(eventDocRef);

        if (!eventDocSnap.exists()) {
            scannersList.innerHTML = '<p style="color: #ff4d4f;">Événement non trouvé</p>';
            return;
        }

        const event = eventDocSnap.data();
        const scanners = event.scanners || [];

        if (scanners.length === 0) {
            scannersList.innerHTML = '<p style="color: rgba(255,255,255,0.5);">Aucun scanner ajouté</p>';
        } else {
            scannersList.innerHTML = scanners.map((uid, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                    <span style="font-family: monospace; font-size: 12px; color: white;">${uid}</span>
                    <button onclick="removeScanner('${eventId}', '${uid}')" style="background: #ff4d4f; border: none; padding: 5px 10px; border-radius: 5px; color: white; cursor: pointer; font-size: 12px;">
                        ❌
                    </button>
                </div>
            `).join('');
        }

        scannersList.innerHTML += `<p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 10px;">${scanners.length}/7 scanners</p>`;

    } catch (error) {
        console.error('Erreur chargement scanners:', error);
        scannersList.innerHTML = '<p style="color: #ff4d4f;">Erreur lors du chargement</p>';
    }
}

window.addScanner = async function(eventId) {
    const input = document.getElementById('scanner-uid-input');
    const uid = input.value.trim();

    if (!uid) {
        showError('Veuillez entrer un UID');
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDocSnap = await getDoc(eventRef);

        if (!eventDocSnap.exists()) {
            showError('Événement non trouvé');
            return;
        }

        const event = eventDocSnap.data();
        const scanners = event.scanners || [];

        if (scanners.length >= 7) {
            showError('Maximum 7 scanners autorisés');
            return;
        }

        if (scanners.includes(uid)) {
            showError('Ce scanner est déjà ajouté');
            return;
        }

        scanners.push(uid);
        await updateDoc(eventRef, { scanners });

        input.value = '';
        await loadScanners(eventId);
        showSuccess('Scanner ajouté !');

    } catch (error) {
        console.error('Erreur ajout scanner:', error);
        showError('Erreur lors de l\'ajout du scanner');
    }
};

window.removeScanner = async function(eventId, uid) {
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDocSnap = await getDoc(eventRef);

        if (!eventDocSnap.exists()) {
            showError('Événement non trouvé');
            return;
        }

        const event = eventDocSnap.data();
        const scanners = (event.scanners || []).filter(s => s !== uid);

        await updateDoc(eventRef, { scanners });
        await loadScanners(eventId);
        showSuccess('Scanner supprimé !');

    } catch (error) {
        console.error('Erreur suppression scanner:', error);
        showError('Erreur lors de la suppression du scanner');
    }
};

window.closeScannerModal = function() {
    const modal = document.getElementById('scanners-modal');
    if (modal) {
        modal.remove();
    }
};

