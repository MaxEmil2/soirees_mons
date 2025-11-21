/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                      TICKETS SERVICE                               ║
 * ║              Service pour la gestion des tickets QR                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.js';

/**
 * Service de gestion des tickets
 */
class TicketsService {
  /**
   * Récupère tous les tickets de l'utilisateur connecté
   */
  async getMyTickets() {
    try {
      const getUserTicketsFn = httpsCallable(functions, 'getUserTickets');
      const result = await getUserTicketsFn();

      console.log('✅ User tickets retrieved');
      return { success: true, tickets: result.data.tickets };
    } catch (error) {
      console.error('❌ Error getting user tickets:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de vos tickets'
      };
    }
  }

  /**
   * Vérifie la validité d'un ticket
   */
  async verifyTicket(ticketId) {
    try {
      const verifyTicketFn = httpsCallable(functions, 'verifyTicket');
      const result = await verifyTicketFn({ ticketId });

      console.log('✅ Ticket verified');
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error verifying ticket:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la vérification du ticket'
      };
    }
  }

  /**
   * Marque un ticket comme utilisé
   */
  async markTicketUsed(ticketId) {
    try {
      const markTicketUsedFn = httpsCallable(functions, 'markTicketUsed');
      const result = await markTicketUsedFn({ ticketId });

      console.log('✅ Ticket marked as used');
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error marking ticket as used:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la validation du ticket'
      };
    }
  }

  /**
   * Récupère les préventes d'un événement (pour organisateur)
   */
  async getEventPresales(eventId) {
    try {
      const getEventPresalesFn = httpsCallable(functions, 'getEventPresales');
      const result = await getEventPresalesFn({ eventId });

      console.log('✅ Event presales retrieved');
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error getting event presales:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des préventes'
      };
    }
  }
}

// Export de l'instance unique
export const ticketsService = new TicketsService();
