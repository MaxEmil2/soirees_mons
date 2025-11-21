/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                     STRIPE CLOUD FUNCTIONS                         ║
 * ║           Gestion ultra-sécurisée des paiements Stripe             ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { https } from 'firebase-functions/v2';
import Stripe from 'stripe';
import { db } from '../admin.js';
import { requireAuth, logAudit } from '../utils/auth.js';
import { validateCheckoutData } from '../utils/validators.js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Initialisation de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crée une session de paiement Stripe
 * Nécessite: Authentification
 */
export const createCheckoutSession = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const data = request.data;

    // Validation des données
    const validation = validateCheckoutData(data);
    if (!validation.isValid) {
      throw new https.HttpsError('invalid-argument', validation.errors.join(', '));
    }

    const { eventId, quantity } = data;

    // Récupération de l'événement
    const eventDoc = await db.collection('events').doc(eventId).get();

    if (!eventDoc.exists) {
      throw new https.HttpsError('not-found', 'Événement non trouvé');
    }

    const event = eventDoc.data();

    // Vérifications de sécurité
    if (event.status !== 'approved') {
      throw new https.HttpsError('failed-precondition', 'Événement non approuvé');
    }

    if (event.availableSpots < quantity) {
      throw new https.HttpsError('failed-precondition', 'Places insuffisantes');
    }

    if (new Date(event.date.toDate()) < new Date()) {
      throw new https.HttpsError('failed-precondition', 'Événement passé');
    }

    // Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: event.title,
              description: `Prévente pour ${event.title}`,
              images: event.imageUrl ? [event.imageUrl] : []
            },
            unit_amount: Math.round(event.price * 100) // Prix en centimes
          },
          quantity
        }
      ],
      mode: 'payment',
      success_url: `${process.env.APP_URL}/presale-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/index.html?canceled=true`,
      metadata: {
        eventId,
        userId: auth.uid,
        quantity: quantity.toString()
      },
      client_reference_id: auth.uid
    });

    // Log d'audit
    await logAudit('checkout_session_created', auth.uid, {
      eventId,
      quantity,
      sessionId: session.id
    });

    console.log(`✅ Checkout session created: ${session.id} for user ${auth.uid}`);

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la création de la session de paiement');
  }
});

/**
 * Webhook Stripe pour traiter les paiements
 * Sécurisé avec signature Stripe
 */
export const stripeWebhook = https.onRequest({ region: 'europe-west1' }, async (request, response) => {
  const sig = request.headers['stripe-signature'];

  try {
    // Vérification de la signature Stripe
    const event = stripe.webhooks.constructEvent(
      request.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`📥 Stripe webhook received: ${event.type}`);

    // Traitement des événements Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded');
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed');
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    response.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    response.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Traite un paiement complété
 * Crée les tickets et met à jour l'événement
 */
async function handleCheckoutCompleted(session) {
  try {
    const { eventId, userId, quantity } = session.metadata;
    const quantityNum = parseInt(quantity);

    // Récupération de l'événement
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new Error('Event not found');
    }

    const event = eventDoc.data();

    // Vérification finale de la disponibilité (protection contre race conditions)
    if (event.availableSpots < quantityNum) {
      throw new Error('Not enough spots available');
    }

    // Création des tickets dans une transaction
    await db.runTransaction(async (transaction) => {
      // Mise à jour des places disponibles
      transaction.update(eventRef, {
        availableSpots: event.availableSpots - quantityNum,
        soldTickets: (event.soldTickets || 0) + quantityNum,
        updatedAt: new Date()
      });

      // Création des tickets individuels
      for (let i = 0; i < quantityNum; i++) {
        const ticketId = uuidv4();
        const ticketRef = db.collection('presales').doc(ticketId);

        // Génération du QR code
        const qrData = JSON.stringify({
          ticketId,
          eventId,
          userId,
          timestamp: Date.now()
        });

        const qrCode = await QRCode.toDataURL(qrData);

        const ticketData = {
          ticketId,
          eventId,
          eventTitle: event.title,
          userId,
          price: event.price,
          status: 'completed',
          paymentIntentId: session.payment_intent,
          stripeSessionId: session.id,
          qrCode,
          createdAt: new Date(),
          used: false,
          usedAt: null,
          scannedBy: null
        };

        transaction.set(ticketRef, ticketData);
      }
    });

    console.log(`✅ ${quantityNum} tickets created for event ${eventId}`);

    // Log d'audit
    await logAudit('payment_completed', userId, {
      eventId,
      quantity: quantityNum,
      amount: session.amount_total / 100,
      sessionId: session.id
    });
  } catch (error) {
    console.error('❌ Error handling checkout completed:', error);
    throw error;
  }
}

/**
 * Récupère le statut d'un paiement
 * Nécessite: Authentification
 */
export const getPaymentStatus = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new https.HttpsError('invalid-argument', 'Session ID requis');
    }

    // Récupération de la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Vérification de propriété
    if (session.client_reference_id !== auth.uid) {
      throw new https.HttpsError('permission-denied', 'Accès non autorisé');
    }

    return {
      success: true,
      status: session.payment_status,
      amountTotal: session.amount_total / 100
    };
  } catch (error) {
    console.error('❌ Error getting payment status:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la récupération du statut');
  }
});
