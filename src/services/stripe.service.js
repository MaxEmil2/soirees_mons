/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                       STRIPE SERVICE                               ║
 * ║            Service pour les paiements Stripe sécurisés             ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.js';

/**
 * Service de gestion des paiements Stripe
 */
class StripeService {
  /**
   * Crée une session de paiement Stripe
   */
  async createCheckoutSession(eventId, quantity = 1) {
    try {
      const createCheckoutFn = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutFn({ eventId, quantity });

      console.log('✅ Checkout session created');
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de la session de paiement'
      };
    }
  }

  /**
   * Redirige vers la page de paiement Stripe
   */
  async redirectToCheckout(eventId, quantity = 1) {
    try {
      const result = await this.createCheckoutSession(eventId, quantity);

      if (result.success && result.url) {
        window.location.href = result.url;
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error redirecting to checkout:', error);
      return { success: false, error: 'Erreur lors de la redirection' };
    }
  }

  /**
   * Récupère le statut d'un paiement
   */
  async getPaymentStatus(sessionId) {
    try {
      const getPaymentStatusFn = httpsCallable(functions, 'getPaymentStatus');
      const result = await getPaymentStatusFn({ sessionId });

      console.log('✅ Payment status retrieved');
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du statut'
      };
    }
  }
}

// Export de l'instance unique
export const stripeService = new StripeService();
