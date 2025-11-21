/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                     TICKETS CLOUD FUNCTIONS                        ║
 * ║        Gestion ultra-sécurisée des tickets et du scanning          ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { https } from 'firebase-functions/v2';
import { db } from '../admin.js';
import { requireAuth, requireScanner, isEventOwner, isAdmin, logAudit } from '../utils/auth.js';
import { validateTicketData } from '../utils/validators.js';

/**
 * Vérifie la validité d'un ticket
 * Nécessite: Authentification + Rôle scanner ou owner de l'événement
 */
export const verifyTicket = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { ticketId } = request.data;

    // Validation de l'ID du ticket
    const validation = validateTicketData(ticketId);
    if (!validation.isValid) {
      throw new https.HttpsError('invalid-argument', validation.errors.join(', '));
    }

    // Récupération du ticket
    const ticketDoc = await db.collection('presales').doc(ticketId).get();

    if (!ticketDoc.exists) {
      return {
        success: false,
        valid: false,
        error: 'Ticket non trouvé'
      };
    }

    const ticket = ticketDoc.data();

    // Vérification des permissions
    const isOwner = await isEventOwner(auth.uid, ticket.eventId);
    const isAdminUser = await isAdmin(auth.uid);
    const hasPermission = isOwner || isAdminUser;

    if (!hasPermission) {
      throw new https.HttpsError(
        'permission-denied',
        'Vous n\'êtes pas autorisé à scanner ce ticket'
      );
    }

    // Vérifications de validité
    const validationResult = {
      success: true,
      valid: true,
      ticket: {
        ticketId: ticket.ticketId,
        eventId: ticket.eventId,
        eventTitle: ticket.eventTitle,
        userId: ticket.userId,
        status: ticket.status
      }
    };

    // Ticket déjà utilisé
    if (ticket.used) {
      validationResult.valid = false;
      validationResult.error = 'Ticket déjà utilisé';
      validationResult.usedAt = ticket.usedAt;
      validationResult.scannedBy = ticket.scannedBy;
    }

    // Ticket non payé
    if (ticket.status !== 'completed') {
      validationResult.valid = false;
      validationResult.error = 'Ticket non payé';
    }

    // Log d'audit
    await logAudit('ticket_verified', auth.uid, {
      ticketId,
      valid: validationResult.valid,
      eventId: ticket.eventId
    });

    console.log(`✅ Ticket verified: ${ticketId} - Valid: ${validationResult.valid}`);

    return validationResult;
  } catch (error) {
    console.error('❌ Error verifying ticket:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la vérification du ticket');
  }
});

/**
 * Marque un ticket comme utilisé
 * Nécessite: Authentification + Rôle scanner ou owner de l'événement
 * Protection anti-double-scan
 */
export const markTicketUsed = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { ticketId } = request.data;

    // Validation de l'ID du ticket
    const validation = validateTicketData(ticketId);
    if (!validation.isValid) {
      throw new https.HttpsError('invalid-argument', validation.errors.join(', '));
    }

    // Récupération du ticket
    const ticketRef = db.collection('presales').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new https.HttpsError('not-found', 'Ticket non trouvé');
    }

    const ticket = ticketDoc.data();

    // Vérification des permissions
    const isOwner = await isEventOwner(auth.uid, ticket.eventId);
    const isAdminUser = await isAdmin(auth.uid);
    const hasPermission = isOwner || isAdminUser;

    if (!hasPermission) {
      throw new https.HttpsError(
        'permission-denied',
        'Vous n\'êtes pas autorisé à scanner ce ticket'
      );
    }

    // Vérification que le ticket n'est pas déjà utilisé (protection anti-double-scan)
    if (ticket.used) {
      throw new https.HttpsError(
        'failed-precondition',
        `Ticket déjà utilisé le ${ticket.usedAt.toDate().toLocaleString('fr-FR')}`
      );
    }

    // Vérification que le ticket est payé
    if (ticket.status !== 'completed') {
      throw new https.HttpsError('failed-precondition', 'Ticket non payé');
    }

    // Mise à jour du ticket dans une transaction (protection contre race conditions)
    await db.runTransaction(async (transaction) => {
      const freshTicket = await transaction.get(ticketRef);

      if (!freshTicket.exists) {
        throw new Error('Ticket not found');
      }

      const freshData = freshTicket.data();

      // Double vérification dans la transaction
      if (freshData.used) {
        throw new Error('Ticket already used');
      }

      transaction.update(ticketRef, {
        used: true,
        usedAt: new Date(),
        scannedBy: auth.uid,
        status: 'used'
      });
    });

    // Log d'audit
    await logAudit('ticket_used', auth.uid, {
      ticketId,
      eventId: ticket.eventId
    });

    console.log(`✅ Ticket marked as used: ${ticketId} by ${auth.uid}`);

    return {
      success: true,
      message: 'Ticket validé avec succès'
    };
  } catch (error) {
    console.error('❌ Error marking ticket as used:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    if (error.message === 'Ticket already used') {
      throw new https.HttpsError('failed-precondition', 'Ticket déjà utilisé');
    }

    throw new https.HttpsError('internal', 'Erreur lors de la validation du ticket');
  }
});

/**
 * Récupère tous les tickets d'un utilisateur
 * Nécessite: Authentification
 */
export const getUserTickets = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    // Récupération des tickets de l'utilisateur
    const ticketsSnapshot = await db
      .collection('presales')
      .where('userId', '==', auth.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = [];

    ticketsSnapshot.forEach((doc) => {
      const data = doc.data();
      tickets.push({
        id: doc.id,
        ticketId: data.ticketId,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        price: data.price,
        status: data.status,
        qrCode: data.qrCode,
        used: data.used,
        usedAt: data.usedAt,
        createdAt: data.createdAt
      });
    });

    console.log(`✅ Retrieved ${tickets.length} tickets for user ${auth.uid}`);

    return {
      success: true,
      tickets
    };
  } catch (error) {
    console.error('❌ Error getting user tickets:', error);

    throw new https.HttpsError('internal', 'Erreur lors de la récupération des tickets');
  }
});
