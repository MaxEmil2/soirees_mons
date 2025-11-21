/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                      EVENTS CLOUD FUNCTIONS                        ║
 * ║              Gestion ultra-sécurisée des événements                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { https } from 'firebase-functions/v2';
import { db } from '../admin.js';
import { requireAuth, requireEventPermission, requireAdmin, logAudit } from '../utils/auth.js';
import { validateEventData, sanitizeString } from '../utils/validators.js';

/**
 * Crée un nouvel événement
 * Nécessite: Authentification + Rôle organisateur
 */
export const createEvent = https.onCall({ region: 'europe-west1' }, async (request) => {
  // Vérification authentification
  const auth = await requireAuth(request);

  try {
    const data = request.data;

    // Validation complète des données
    const validation = validateEventData(data);
    if (!validation.isValid) {
      throw new https.HttpsError('invalid-argument', validation.errors.join(', '));
    }

    // Sanitisation des données
    const eventData = {
      title: sanitizeString(data.title, 200),
      description: sanitizeString(data.description, 5000),
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      location: sanitizeString(data.location, 200),
      address: sanitizeString(data.address || '', 300),
      price: parseFloat(data.price) || 0,
      availableSpots: parseInt(data.availableSpots) || 0,
      totalSpots: parseInt(data.availableSpots) || 0,
      category: sanitizeString(data.category || 'Autre', 50),
      imageUrl: data.imageUrl || null,
      createdBy: auth.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending', // En attente d'approbation admin
      soldTickets: 0,
      views: 0,
      likes: 0,
      featured: false,
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 10).map(t => sanitizeString(t, 50)) : []
    };

    // Création de l'événement dans Firestore
    const eventRef = await db.collection('events').add(eventData);

    // Log d'audit
    await logAudit('event_created', auth.uid, {
      eventId: eventRef.id,
      title: eventData.title
    });

    console.log(`✅ Event created: ${eventRef.id} by ${auth.uid}`);

    return {
      success: true,
      eventId: eventRef.id,
      message: 'Événement créé avec succès. En attente d\'approbation.'
    };
  } catch (error) {
    console.error('❌ Error creating event:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la création de l\'événement');
  }
});

/**
 * Met à jour un événement existant
 * Nécessite: Authentification + Propriétaire ou Admin
 */
export const updateEvent = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { eventId, ...updates } = request.data;

    if (!eventId) {
      throw new https.HttpsError('invalid-argument', 'ID d\'événement requis');
    }

    // Vérification des permissions
    await requireEventPermission(auth.uid, eventId);

    // Récupération de l'événement actuel
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new https.HttpsError('not-found', 'Événement non trouvé');
    }

    // Validation des données mises à jour
    const currentData = eventDoc.data();
    const updatedData = { ...currentData, ...updates };
    const validation = validateEventData(updatedData);

    if (!validation.isValid) {
      throw new https.HttpsError('invalid-argument', validation.errors.join(', '));
    }

    // Sanitisation des mises à jour
    const sanitizedUpdates = {};

    if (updates.title) sanitizedUpdates.title = sanitizeString(updates.title, 200);
    if (updates.description) sanitizedUpdates.description = sanitizeString(updates.description, 5000);
    if (updates.date) sanitizedUpdates.date = new Date(updates.date);
    if (updates.endDate) sanitizedUpdates.endDate = new Date(updates.endDate);
    if (updates.location) sanitizedUpdates.location = sanitizeString(updates.location, 200);
    if (updates.address) sanitizedUpdates.address = sanitizeString(updates.address, 300);
    if (updates.price !== undefined) sanitizedUpdates.price = parseFloat(updates.price);
    if (updates.availableSpots !== undefined) sanitizedUpdates.availableSpots = parseInt(updates.availableSpots);
    if (updates.category) sanitizedUpdates.category = sanitizeString(updates.category, 50);
    if (updates.imageUrl) sanitizedUpdates.imageUrl = updates.imageUrl;
    if (Array.isArray(updates.tags)) {
      sanitizedUpdates.tags = updates.tags.slice(0, 10).map(t => sanitizeString(t, 50));
    }

    // Ajout du timestamp de modification
    sanitizedUpdates.updatedAt = new Date();

    // Mise à jour dans Firestore
    await eventRef.update(sanitizedUpdates);

    // Log d'audit
    await logAudit('event_updated', auth.uid, {
      eventId,
      updates: Object.keys(sanitizedUpdates)
    });

    console.log(`✅ Event updated: ${eventId} by ${auth.uid}`);

    return {
      success: true,
      message: 'Événement mis à jour avec succès'
    };
  } catch (error) {
    console.error('❌ Error updating event:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la mise à jour de l\'événement');
  }
});

/**
 * Supprime un événement
 * Nécessite: Authentification + Propriétaire ou Admin
 */
export const deleteEvent = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    const { eventId } = request.data;

    if (!eventId) {
      throw new https.HttpsError('invalid-argument', 'ID d\'événement requis');
    }

    // Vérification des permissions
    await requireEventPermission(auth.uid, eventId);

    // Vérification qu'il n'y a pas de tickets vendus
    const presalesSnapshot = await db
      .collection('presales')
      .where('eventId', '==', eventId)
      .where('status', '==', 'completed')
      .limit(1)
      .get();

    if (!presalesSnapshot.empty) {
      throw new https.HttpsError(
        'failed-precondition',
        'Impossible de supprimer un événement avec des tickets vendus'
      );
    }

    // Suppression de l'événement
    await db.collection('events').doc(eventId).delete();

    // Log d'audit
    await logAudit('event_deleted', auth.uid, { eventId });

    console.log(`✅ Event deleted: ${eventId} by ${auth.uid}`);

    return {
      success: true,
      message: 'Événement supprimé avec succès'
    };
  } catch (error) {
    console.error('❌ Error deleting event:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de la suppression de l\'événement');
  }
});

/**
 * Approuve un événement (Admin seulement)
 * Change le statut de 'pending' à 'approved'
 */
export const approveEvent = https.onCall({ region: 'europe-west1' }, async (request) => {
  const auth = await requireAuth(request);

  try {
    // Vérification des permissions admin
    await requireAdmin(auth.uid);

    const { eventId, approved } = request.data;

    if (!eventId) {
      throw new https.HttpsError('invalid-argument', 'ID d\'événement requis');
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new https.HttpsError('not-found', 'Événement non trouvé');
    }

    // Mise à jour du statut
    const newStatus = approved ? 'approved' : 'rejected';
    await eventRef.update({
      status: newStatus,
      approvedBy: auth.uid,
      approvedAt: new Date(),
      updatedAt: new Date()
    });

    // Log d'audit
    await logAudit('event_approval', auth.uid, {
      eventId,
      status: newStatus
    });

    console.log(`✅ Event ${approved ? 'approved' : 'rejected'}: ${eventId} by ${auth.uid}`);

    return {
      success: true,
      message: `Événement ${approved ? 'approuvé' : 'rejeté'} avec succès`
    };
  } catch (error) {
    console.error('❌ Error approving event:', error);

    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError('internal', 'Erreur lors de l\'approbation de l\'événement');
  }
});
