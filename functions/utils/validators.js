/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                     VALIDATORS ULTRA-SÉCURISÉS                     ║
 * ║         Validation de toutes les entrées utilisateur              ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

/**
 * Nettoie et valide une chaîne de caractères
 * Protection contre les injections XSS
 */
export function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';

  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Supprime les balises HTML
    .replace(/[\x00-\x1F\x7F]/g, ''); // Supprime les caractères de contrôle
}

/**
 * Valide un email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide une URL
 */
export function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valide un numéro de téléphone
 */
export function isValidPhone(phone) {
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Valide une date
 */
export function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Valide qu'une date est dans le futur
 */
export function isFutureDate(dateString) {
  const date = new Date(dateString);
  return date > new Date();
}

/**
 * Valide un prix
 */
export function isValidPrice(price) {
  return typeof price === 'number' && price >= 0 && price <= 10000 && !isNaN(price);
}

/**
 * Valide une quantité
 */
export function isValidQuantity(quantity) {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 10000;
}

/**
 * Valide les données d'un événement
 */
export function validateEventData(data) {
  const errors = [];

  // Titre requis
  if (!data.title || sanitizeString(data.title).length < 3) {
    errors.push('Le titre doit contenir au moins 3 caractères');
  }

  // Description requise
  if (!data.description || sanitizeString(data.description, 5000).length < 10) {
    errors.push('La description doit contenir au moins 10 caractères');
  }

  // Date requise et valide
  if (!data.date || !isValidDate(data.date)) {
    errors.push('Date invalide');
  }

  // Date dans le futur
  if (data.date && !isFutureDate(data.date)) {
    errors.push('La date doit être dans le futur');
  }

  // Lieu requis
  if (!data.location || sanitizeString(data.location).length < 3) {
    errors.push('Le lieu doit contenir au moins 3 caractères');
  }

  // Prix valide
  if (data.price !== undefined && !isValidPrice(data.price)) {
    errors.push('Prix invalide (0-10000)');
  }

  // Places disponibles valides
  if (data.availableSpots !== undefined && !isValidQuantity(data.availableSpots)) {
    errors.push('Nombre de places invalide (1-10000)');
  }

  // Image URL valide si fournie
  if (data.imageUrl && !isValidUrl(data.imageUrl)) {
    errors.push('URL d\'image invalide');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valide les données de checkout Stripe
 */
export function validateCheckoutData(data) {
  const errors = [];

  // Event ID requis
  if (!data.eventId || typeof data.eventId !== 'string') {
    errors.push('ID d\'événement requis');
  }

  // Quantité valide
  if (!data.quantity || !isValidQuantity(data.quantity) || data.quantity > 10) {
    errors.push('Quantité invalide (1-10)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valide les données de ticket
 */
export function validateTicketData(ticketId) {
  if (!ticketId || typeof ticketId !== 'string' || ticketId.length < 10) {
    return {
      isValid: false,
      errors: ['ID de ticket invalide']
    };
  }

  return {
    isValid: true,
    errors: []
  };
}
