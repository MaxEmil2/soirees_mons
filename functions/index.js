/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                 SOIRÉES MONS - CLOUD FUNCTIONS                    ║
 * ║                   Niveau de Sécurité: NASA 🔒                      ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Architecture ultra-sécurisée avec:
 * - Validation complète de toutes les entrées
 * - Vérifications d'authentification et d'autorisation
 * - Protection contre les injections et les attaques
 * - Rate limiting
 * - Logs complets pour audit
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialisation de Firebase Admin
initializeApp();

// Export des services Firebase
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

// Configuration globale
db.settings({ ignoreUndefinedProperties: true });

// Import et export des Cloud Functions
export { createEvent, updateEvent, deleteEvent, approveEvent } from './events/index.js';
export { createCheckoutSession, stripeWebhook, getPaymentStatus } from './stripe/index.js';
export { verifyTicket, markTicketUsed, getUserTickets } from './tickets/index.js';
export { getUserPresales, getEventPresales } from './presales/index.js';
