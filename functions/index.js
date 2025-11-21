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

// Import de l'initialisation Firebase Admin (fichier séparé pour éviter les imports circulaires)
import './admin.js';

// Import et export des Cloud Functions
export { createEvent, updateEvent, deleteEvent, approveEvent } from './events/index.js';
export { createCheckoutSession, stripeWebhook, getPaymentStatus } from './stripe/index.js';
export { verifyTicket, markTicketUsed, getUserTickets } from './tickets/index.js';
export { getUserPresales, getEventPresales } from './presales/index.js';
