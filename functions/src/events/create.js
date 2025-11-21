/**
 * CLOUD FUNCTION - CREATE EVENT
 * Création sécurisée d'un événement
 * Pattern ultra-sécurisé : Validation + Rate Limiting + Sanitization
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Validation des données d'événement côté serveur
 * NE JAMAIS faire confiance aux données du client
 */
function validateEventData(data) {
  const errors = {};

  // Nom
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Nom requis';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Nom trop court (min 3 caractères)';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Nom trop long (max 100 caractères)';
  }

  // Date
  if (!data.date) {
    errors.date = 'Date requise';
  } else {
    const eventDate = new Date(data.date);
    if (isNaN(eventDate.getTime())) {
      errors.date = 'Date invalide';
    } else if (eventDate < new Date()) {
      errors.date = 'La date doit être dans le futur';
    }
  }

  // Lieu
  if (!data.location || typeof data.location !== 'string') {
    errors.location = 'Lieu requis';
  } else if (data.location.trim().length < 3) {
    errors.location = 'Lieu trop court (min 3 caractères)';
  }

  // Prix
  if (typeof data.price !== 'number') {
    errors.price = 'Prix invalide';
  } else if (data.price < 0) {
    errors.price = 'Prix ne peut pas être négatif';
  } else if (data.price > 10000) {
    errors.price = 'Prix maximum : 10 000€';
  }

  // Âge
  if (typeof data.age !== 'number') {
    errors.age = 'Âge invalide';
  } else if (!Number.isInteger(data.age)) {
    errors.age = 'Âge doit être un nombre entier';
  } else if (data.age < 0 || data.age > 99) {
    errors.age = 'Âge entre 0 et 99';
  }

  // Description
  if (!data.description || typeof data.description !== 'string') {
    errors.description = 'Description requise';
  } else if (data.description.trim().length < 10) {
    errors.description = 'Description trop courte (min 10 caractères)';
  } else if (data.description.trim().length > 5000) {
    errors.description = 'Description trop longue (max 5000 caractères)';
  }

  // Lien (optionnel)
  if (data.link) {
    try {
      const url = new URL(data.link);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.link = 'URL invalide (protocole non autorisé)';
      }
    } catch (e) {
      errors.link = 'URL invalide';
    }
  }

  // Préventes
  if (data.presales === true) {
    if (data.presalesEndDate) {
      const endDate = new Date(data.presalesEndDate);
      const eventDate = new Date(data.date);

      if (isNaN(endDate.getTime())) {
        errors.presalesEndDate = 'Date de fin des préventes invalide';
      } else if (endDate >= eventDate) {
        errors.presalesEndDate = 'Date de fin des préventes doit être avant l\'événement';
      }
    }

    if (data.maxPresales !== undefined) {
      if (typeof data.maxPresales !== 'number' || !Number.isInteger(data.maxPresales)) {
        errors.maxPresales = 'Nombre maximum de préventes invalide';
      } else if (data.maxPresales < 1 || data.maxPresales > 10000) {
        errors.maxPresales = 'Entre 1 et 10 000';
      }
    }
  }

  return errors;
}

/**
 * Sanitize une chaîne de caractères (protection XSS)
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '');
}

/**
 * Rate limiting simple (en mémoire)
 * Pour production : utiliser Redis ou Firestore
 */
const rateLimitMap = new Map();

async function checkRateLimit(userId, action, maxRequests = 10, windowMs = 60000) {
  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const requests = rateLimitMap.get(key);

  // Nettoie les requêtes expirées
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);

  if (validRequests.length >= maxRequests) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Trop de requêtes. Maximum ${maxRequests} par minute.`
    );
  }

  validRequests.push(now);
  rateLimitMap.set(key, validRequests);
}

/**
 * Création notification admin
 */
async function notifyAdminNewEvent(eventId, eventData) {
  try {
    // Récupère tous les admins
    const adminsSnapshot = await admin.firestore()
      .collection('users')
      .where('isAdmin', '==', true)
      .get();

    // Crée une notification pour chaque admin
    const promises = adminsSnapshot.docs.map(async (adminDoc) => {
      return admin.firestore().collection('notifications').add({
        userId: adminDoc.id,
        type: 'event_pending_approval',
        eventId: eventId,
        eventName: eventData.name,
        message: `Nouvel événement en attente d'approbation : ${eventData.name}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Erreur création notification admin:', error);
    // N'interrompt pas le flux principal
  }
}

/**
 * CLOUD FUNCTION : CREATE EVENT
 * Callable function (HTTPS onCall)
 */
exports.createEvent = functions
  .region('europe-west1') // Région européenne
  .https.onCall(async (data, context) => {
    try {
      // ===================================
      // 1. VÉRIFICATION AUTHENTIFICATION
      // ===================================

      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentification requise'
        );
      }

      const userId = context.auth.uid;
      const userEmail = context.auth.token.email;

      // ===================================
      // 2. RATE LIMITING
      // ===================================

      await checkRateLimit(userId, 'createEvent', 10, 60000); // 10 événements/minute max

      // ===================================
      // 3. VALIDATION DES DONNÉES
      // ===================================

      const errors = validateEventData(data);

      if (Object.keys(errors).length > 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Données invalides',
          errors
        );
      }

      // ===================================
      // 4. VÉRIFICATION UTILISATEUR
      // ===================================

      const userDoc = await admin.firestore().collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Utilisateur introuvable'
        );
      }

      const userData = userDoc.data();

      // Optionnel : vérifier que l'utilisateur peut créer des événements
      // if (userData.role !== 'organisateur' && userData.role !== 'admin') {
      //   throw new functions.https.HttpsError(
      //     'permission-denied',
      //     'Vous devez être organisateur pour créer un événement'
      //   );
      // }

      // ===================================
      // 5. SANITIZATION DES DONNÉES
      // ===================================

      const sanitizedData = {
        // Champs nettoyés
        name: sanitizeString(data.name),
        description: sanitizeString(data.description),
        location: sanitizeString(data.location),
        date: data.date,
        price: Number(data.price),
        age: Number(data.age),
        link: data.link ? sanitizeString(data.link) : null,

        // Images (seront uploadées séparément via Storage)
        imageURL: null,
        imagePath: null,

        // Préventes
        presales: Boolean(data.presales),
        presalesEndDate: data.presales && data.presalesEndDate ? data.presalesEndDate : null,
        presalesSold: 0,
        presalesStopped: false,
        maxPresales: data.presales && data.maxPresales ? Number(data.maxPresales) : null,

        // Statut et métadonnées (FORCÉS CÔTÉ SERVEUR)
        status: 'pending', // ⚠️ TOUJOURS pending à la création
        isPriority: false, // ⚠️ Seul admin peut mettre en avant
        createdBy: userId, // ⚠️ Forcé côté serveur
        createdByEmail: userEmail, // ⚠️ Forcé côté serveur
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,

        // Scanners (vide par défaut)
        scanners: []
      };

      // ===================================
      // 6. CRÉATION DANS FIRESTORE
      // ===================================

      const eventRef = await admin.firestore().collection('events').add(sanitizedData);

      console.log(`✅ Événement créé: ${eventRef.id} par ${userId}`);

      // ===================================
      // 7. NOTIFICATION ADMIN
      // ===================================

      await notifyAdminNewEvent(eventRef.id, sanitizedData);

      // ===================================
      // 8. RETOUR SUCCÈS
      // ===================================

      return {
        success: true,
        eventId: eventRef.id,
        message: 'Événement créé avec succès. En attente d\'approbation.'
      };

    } catch (error) {
      // Log pour debugging
      console.error('❌ Erreur createEvent:', error);

      // Si c'est déjà une HttpsError, on la relance
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Sinon, erreur générique
      throw new functions.https.HttpsError(
        'internal',
        'Une erreur est survenue lors de la création de l\'événement',
        error.message
      );
    }
  });
