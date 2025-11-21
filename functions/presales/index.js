/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                    PRESALES CLOUD FUNCTIONS                        ║
 * ║         Gestion sécurisée des préventes et statistiques            ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { https } from 'firebase-functions/v2';
import { db } from '../admin.js';
import { requireAuth, isEventOwner, isAdmin } from '../utils/auth.js';

/**
 * Récupère les préventes d'un utilisateur
 * Nécessite: Authentification
 */
export const getUserPresales = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const presalesSnapshot = await db
      .collection('presales')
      .where('userId', '==', auth.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const presales = [];

    presalesSnapshot.forEach((doc) => {
      const data = doc.data();
      presales.push({
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

    console.log(`✅ Retrieved ${presales.length} presales for user ${auth.uid}`);

    return {
      success: true,
      presales
    };
  } catch (error) {
    console.error('❌ Error getting user presales:', error);
    throw new https.HttpsError('internal', 'Erreur lors de la récupération des préventes');
  }
});

/**
 * Récupère les préventes d'un événement
 * Nécessite: Authentification + Owner de l'événement ou Admin
 */
export const getEventPresales = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { eventId } = request.data;

    if (!eventId) {
      throw new https.HttpsError('invalid-argument', 'ID d\'événement requis');
    }

    // Vérification des permissions
    const isOwner = await isEventOwner(auth.uid, eventId);
    const isAdminUser = await isAdmin(auth.uid);

    if (!isOwner && !isAdminUser) {
      throw new https.HttpsError(
        'permission-denied',
        'Vous n\'êtes pas autorisé à voir ces préventes'
      );
    }

    // Récupération des préventes
    const presalesSnapshot = await db
      .collection('presales')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();

    const presales = [];
    let totalRevenue = 0;
    let usedTickets = 0;

    presalesSnapshot.forEach((doc) => {
      const data = doc.data();

      presales.push({
        id: doc.id,
        ticketId: data.ticketId,
        userId: data.userId,
        price: data.price,
        status: data.status,
        used: data.used,
        usedAt: data.usedAt,
        createdAt: data.createdAt
      });

      if (data.status === 'completed') {
        totalRevenue += data.price;
      }

      if (data.used) {
        usedTickets++;
      }
    });

    console.log(`✅ Retrieved ${presales.length} presales for event ${eventId}`);

    return {
      success: true,
      presales,
      statistics: {
        totalTickets: presales.length,
        usedTickets,
        unusedTickets: presales.length - usedTickets,
        totalRevenue,
        averagePrice: presales.length > 0 ? totalRevenue / presales.length : 0
      }
    };
  } catch (error) {
    console.error('❌ Error getting event presales:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la récupération des préventes');
  }
});
