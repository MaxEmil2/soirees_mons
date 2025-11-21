/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                       EVENTS SERVICE                               ║
 * ║              Service pour la gestion des événements                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase.js';

/**
 * Service de gestion des événements
 */
class EventsService {
  constructor() {
    this.eventsRef = collection(db, 'events');
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Récupère tous les événements approuvés
   */
  async getApprovedEvents(options = {}) {
    try {
      const {
        limitCount = 50,
        category = null,
        sortBy = 'date',
        lastDoc = null
      } = options;

      let q = query(
        this.eventsRef,
        where('status', '==', 'approved'),
        where('date', '>=', Timestamp.now())
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }

      q = query(q, orderBy(sortBy), limit(limitCount));

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const events = [];

      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Retrieved ${events.length} approved events`);
      return { success: true, events, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      console.error('❌ Error getting approved events:', error);
      return { success: false, error: 'Erreur lors de la récupération des événements' };
    }
  }

  /**
   * Récupère un événement par son ID (avec cache)
   */
  async getEventById(eventId) {
    try {
      // Vérification du cache
      const cached = this.cache.get(eventId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Event retrieved from cache:', eventId);
        return { success: true, event: cached.data };
      }

      // Récupération depuis Firestore
      const eventDoc = await getDoc(doc(this.eventsRef, eventId));

      if (!eventDoc.exists()) {
        return { success: false, error: 'Événement non trouvé' };
      }

      const event = {
        id: eventDoc.id,
        ...eventDoc.data()
      };

      // Mise en cache
      this.cache.set(eventId, { data: event, timestamp: Date.now() });

      console.log('✅ Event retrieved:', eventId);
      return { success: true, event };
    } catch (error) {
      console.error('❌ Error getting event:', error);
      return { success: false, error: 'Erreur lors de la récupération de l\'événement' };
    }
  }

  /**
   * Récupère les événements créés par l'utilisateur connecté
   */
  async getMyEvents(userId) {
    try {
      const q = query(
        this.eventsRef,
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const events = [];

      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Retrieved ${events.length} events for user ${userId}`);
      return { success: true, events };
    } catch (error) {
      console.error('❌ Error getting user events:', error);
      return { success: false, error: 'Erreur lors de la récupération de vos événements' };
    }
  }

  /**
   * Crée un nouvel événement via Cloud Function
   */
  async createEvent(eventData) {
    try {
      const createEventFn = httpsCallable(functions, 'createEvent');
      const result = await createEventFn(eventData);

      // Invalidation du cache
      this.cache.clear();

      console.log('✅ Event created:', result.data);
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de l\'événement'
      };
    }
  }

  /**
   * Met à jour un événement via Cloud Function
   */
  async updateEvent(eventId, updates) {
    try {
      const updateEventFn = httpsCallable(functions, 'updateEvent');
      const result = await updateEventFn({ eventId, ...updates });

      // Invalidation du cache
      this.cache.delete(eventId);

      console.log('✅ Event updated:', eventId);
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error updating event:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour de l\'événement'
      };
    }
  }

  /**
   * Supprime un événement via Cloud Function
   */
  async deleteEvent(eventId) {
    try {
      const deleteEventFn = httpsCallable(functions, 'deleteEvent');
      const result = await deleteEventFn({ eventId });

      // Invalidation du cache
      this.cache.delete(eventId);

      console.log('✅ Event deleted:', eventId);
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression de l\'événement'
      };
    }
  }

  /**
   * Approuve un événement (Admin seulement) via Cloud Function
   */
  async approveEvent(eventId, approved = true) {
    try {
      const approveEventFn = httpsCallable(functions, 'approveEvent');
      const result = await approveEventFn({ eventId, approved });

      // Invalidation du cache
      this.cache.delete(eventId);

      console.log(`✅ Event ${approved ? 'approved' : 'rejected'}:`, eventId);
      return { success: true, ...result.data };
    } catch (error) {
      console.error('❌ Error approving event:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'approbation de l\'événement'
      };
    }
  }

  /**
   * Recherche d'événements
   */
  async searchEvents(searchTerm) {
    try {
      const q = query(
        this.eventsRef,
        where('status', '==', 'approved'),
        where('date', '>=', Timestamp.now()),
        orderBy('date')
      );

      const snapshot = await getDocs(q);
      const events = [];

      const lowerSearchTerm = searchTerm.toLowerCase();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const title = data.title?.toLowerCase() || '';
        const description = data.description?.toLowerCase() || '';
        const location = data.location?.toLowerCase() || '';

        if (
          title.includes(lowerSearchTerm) ||
          description.includes(lowerSearchTerm) ||
          location.includes(lowerSearchTerm)
        ) {
          events.push({
            id: doc.id,
            ...data
          });
        }
      });

      console.log(`✅ Found ${events.length} events for search: "${searchTerm}"`);
      return { success: true, events };
    } catch (error) {
      console.error('❌ Error searching events:', error);
      return { success: false, error: 'Erreur lors de la recherche' };
    }
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Event cache cleared');
  }
}

// Export de l'instance unique
export const eventsService = new EventsService();
