// ========================================
// SYSTÈME DE NOTIFICATIONS
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
    orderBy,
    getDocs,
    updateDoc,
    doc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// Éléments DOM - avec vérification d'existence
const notificationBell = document.getElementById('notification-bell');
const notificationBadge = document.getElementById('notification-badge');
const notificationDropdown = document.getElementById('notification-dropdown');
const notificationList = document.getElementById('notification-list');
const markAllReadBtn = document.getElementById('mark-all-read');

let currentUser = null;
let unsubscribeNotifications = null;

// Vérifier si tous les éléments DOM nécessaires existent
const hasNotificationElements = notificationBell && notificationBadge && notificationDropdown && notificationList;

if (!hasNotificationElements) {
    console.log('⚠️ Système de notifications désactivé : éléments DOM manquants sur cette page');
}

// ========================================
// ÉCOUTER LES NOTIFICATIONS EN TEMPS RÉEL
// ========================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Seulement si les éléments DOM existent
        if (hasNotificationElements) {
            listenToNotifications(user.uid);
        }
    } else {
        currentUser = null;
        if (unsubscribeNotifications) {
            unsubscribeNotifications();
        }
    }
});

function listenToNotifications(userId) {
    if (!hasNotificationElements) return;

    try {
        // Créer une requête pour les notifications de l'utilisateur
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        // Écouter les changements en temps réel
        unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
            const notifications = [];
            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = { id: doc.id, ...doc.data() };
                notifications.push(notif);
                if (!notif.read) {
                    unreadCount++;
                }
            });

            // Mettre à jour le badge (avec vérification)
            if (notificationBadge) {
                if (unreadCount > 0) {
                    notificationBadge.textContent = unreadCount;
                    notificationBadge.style.display = 'flex';
                } else {
                    notificationBadge.style.display = 'none';
                }
            }

            // Afficher les notifications
            displayNotifications(notifications);
        }, (error) => {
            console.error('Erreur écoute notifications:', error);
        });
    } catch (error) {
        console.error('Erreur initialisation notifications:', error);
    }
}

// ========================================
// AFFICHER LES NOTIFICATIONS
// ========================================

function displayNotifications(notifications) {
    if (!notificationList) return;

    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-empty">Aucune notification</div>';
        return;
    }

    notificationList.innerHTML = '';

    notifications.forEach((notif) => {
        const notifItem = document.createElement('div');
        notifItem.className = 'notification-item';
        if (!notif.read) {
            notifItem.classList.add('unread');
        }

        const time = notif.createdAt ? formatTime(notif.createdAt.toDate()) : 'À l\'instant';

        notifItem.innerHTML = `
            <div class="notification-message">${notif.message}</div>
            <div class="notification-time">${time}</div>
        `;

        // Marquer comme lu au clic
        notifItem.addEventListener('click', () => {
            if (!notif.read) {
                markAsRead(notif.id);
            }
        });

        notificationList.appendChild(notifItem);
    });
}

// ========================================
// FORMATER LE TEMPS
// ========================================

function formatTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // en secondes

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jour(s)`;

    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
    });
}

// ========================================
// MARQUER COMME LU
// ========================================

async function markAsRead(notifId) {
    try {
        await updateDoc(doc(db, 'notifications', notifId), {
            read: true
        });
    } catch (error) {
        console.error('Erreur marquage notification:', error);
    }
}

// ========================================
// MARQUER TOUTES COMME LUES
// ========================================

if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        try {
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', currentUser.uid),
                where('read', '==', false)
            );

            const snapshot = await getDocs(notificationsQuery);

            const promises = [];
            snapshot.forEach((docSnap) => {
                promises.push(updateDoc(doc(db, 'notifications', docSnap.id), {
                    read: true
                }));
            });

            await Promise.all(promises);
            console.log('✅ Toutes les notifications marquées comme lues');
        } catch (error) {
            console.error('Erreur marquage toutes lues:', error);
        }
    });
}

// ========================================
// TOGGLE DROPDOWN
// ========================================

if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
    });

    // Fermer en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });
}

console.log('🔔 Système de notifications initialisé');
