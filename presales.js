// Module de gestion des préventes - Soirées Mons
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

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
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');

/**
 * Vérifie si les préventes sont disponibles pour un événement
 */
export async function checkPresalesAvailability(eventId) {
    try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
            return { available: false, reason: 'Événement non trouvé' };
        }

        const event = eventDoc.data();

        // Vérifier si l'événement est approuvé
        if (event.status !== 'approved') {
            return { available: false, reason: 'Événement non approuvé' };
        }

        // Vérifier si les préventes sont activées
        if (!event.presales) {
            return { available: false, reason: 'Préventes non activées' };
        }

        // Vérifier la date de fin des préventes
        if (event.presalesEndDate) {
            const endDate = new Date(event.presalesEndDate);
            if (new Date() > endDate) {
                return { available: false, reason: 'Préventes terminées' };
            }
        }

        // Vérifier si la date de l'événement n'est pas passée
        const eventDate = new Date(event.date);
        if (new Date() > eventDate) {
            return { available: false, reason: 'Événement passé' };
        }

        // Vérifier que le créateur a un compte Stripe configuré
        const creatorDoc = await getDoc(doc(db, 'users', event.createdBy));
        if (!creatorDoc.exists() || !creatorDoc.data().stripeAccountId) {
            return { available: false, reason: 'Paiement non configuré par l\'organisateur' };
        }

        return {
            available: true,
            event: event,
            presalesEndDate: event.presalesEndDate ? new Date(event.presalesEndDate) : null
        };

    } catch (error) {
        console.error('Erreur vérification disponibilité:', error);
        return { available: false, reason: error.message };
    }
}

/**
 * Lance le processus d'achat d'une prévente
 */
export async function buyPresale(eventId) {
    const user = auth.currentUser;

    if (!user) {
        // Rediriger vers la connexion
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + '?buyPresale=' + eventId)}`;
        return { success: false, error: 'Non connecté' };
    }

    try {
        // Vérifier la disponibilité
        const availability = await checkPresalesAvailability(eventId);
        if (!availability.available) {
            return { success: false, error: availability.reason };
        }

        // Vérifier si l'utilisateur n'a pas déjà acheté cette prévente
        const existingPresales = await getDocs(
            query(
                collection(db, 'presales'),
                where('eventId', '==', eventId),
                where('userId', '==', user.uid),
                where('status', '==', 'valid')
            )
        );

        if (!existingPresales.empty) {
            return { success: false, error: 'Vous avez déjà une prévente pour cet événement' };
        }

        // Créer la session de checkout via Cloud Function
        const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
        const result = await createCheckoutSession({
            eventId: eventId,
            baseUrl: window.location.origin
        });

        if (result.data.url) {
            // Rediriger vers Stripe Checkout
            window.location.href = result.data.url;
            return { success: true };
        } else {
            return { success: false, error: 'Erreur lors de la création du paiement' };
        }

    } catch (error) {
        console.error('Erreur achat prévente:', error);
        return { success: false, error: error.message || 'Erreur lors de l\'achat' };
    }
}

/**
 * Récupère les préventes de l'utilisateur connecté
 */
export async function getMyPresales() {
    const user = auth.currentUser;

    if (!user) {
        return { success: false, error: 'Non connecté', presales: [] };
    }

    try {
        const getMyPresalesFunc = httpsCallable(functions, 'getMyPresales');
        const result = await getMyPresalesFunc();
        return { success: true, presales: result.data.presales };

    } catch (error) {
        console.error('Erreur récupération préventes:', error);
        return { success: false, error: error.message, presales: [] };
    }
}

/**
 * Crée/accède au compte Stripe Connect pour un créateur
 */
export async function setupStripeConnect() {
    const user = auth.currentUser;

    if (!user) {
        return { success: false, error: 'Non connecté' };
    }

    try {
        const createStripeConnectAccount = httpsCallable(functions, 'createStripeConnectAccount');
        const result = await createStripeConnectAccount({
            baseUrl: window.location.origin
        });

        if (result.data.url) {
            window.location.href = result.data.url;
            return { success: true };
        }

        return { success: false, error: 'Erreur lors de la configuration Stripe' };

    } catch (error) {
        console.error('Erreur setup Stripe Connect:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Vérifie le statut du compte Stripe Connect
 */
export async function checkStripeConnectStatus() {
    const user = auth.currentUser;

    if (!user) {
        return { status: 'not_authenticated', canReceivePayments: false };
    }

    try {
        const checkStripeAccountStatus = httpsCallable(functions, 'checkStripeAccountStatus');
        const result = await checkStripeAccountStatus();
        return result.data;

    } catch (error) {
        console.error('Erreur vérification statut Stripe:', error);
        return { status: 'error', canReceivePayments: false, error: error.message };
    }
}

/**
 * Récupère les préventes pour un événement (pour le créateur)
 */
export async function getPresalesForEvent(eventId) {
    const user = auth.currentUser;

    if (!user) {
        return { success: false, error: 'Non connecté', presales: [], stats: {} };
    }

    try {
        const getPresalesForEventFunc = httpsCallable(functions, 'getPresalesForEvent');
        const result = await getPresalesForEventFunc({ eventId });
        return { success: true, ...result.data };

    } catch (error) {
        console.error('Erreur récupération préventes événement:', error);
        return { success: false, error: error.message, presales: [], stats: {} };
    }
}

/**
 * Formate le prix pour l'affichage
 */
export function formatPrice(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-BE', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Formate une date pour l'affichage
 */
export function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('fr-BE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export des fonctions pour utilisation globale
window.presalesModule = {
    checkPresalesAvailability,
    buyPresale,
    getMyPresales,
    setupStripeConnect,
    checkStripeConnectStatus,
    getPresalesForEvent,
    formatPrice,
    formatDate
};
