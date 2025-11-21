/**
 * VALIDATORS - Validation côté client
 * Validation de données avant envoi au backend
 * @module validators
 */

/**
 * Valide une adresse email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valide un mot de passe
 * @param {string} password
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Mot de passe requis'] };
  }

  if (password.length < 6) {
    errors.push('Au moins 6 caractères');
  }

  if (password.length > 128) {
    errors.push('Maximum 128 caractères');
  }

  // Optionnel: forcer complexité
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Au moins une majuscule');
  // }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valide un nom d'événement
 * @param {string} name
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateEventName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nom requis' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Au moins 3 caractères' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Maximum 100 caractères' };
  }

  // Vérifie les caractères dangereux (XSS)
  if (/<script|<iframe|javascript:|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Caractères interdits détectés' };
  }

  return { valid: true, error: null };
}

/**
 * Valide une date d'événement
 * @param {string} date - Date au format ISO ou timestamp
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateEventDate(date) {
  if (!date) {
    return { valid: false, error: 'Date requise' };
  }

  const eventDate = new Date(date);

  if (isNaN(eventDate.getTime())) {
    return { valid: false, error: 'Date invalide' };
  }

  // La date doit être dans le futur (avec marge de 1 heure)
  const now = new Date();
  const minDate = new Date(now.getTime() - 60 * 60 * 1000);

  if (eventDate < minDate) {
    return { valid: false, error: 'La date doit être dans le futur' };
  }

  // Maximum 2 ans dans le futur
  const maxDate = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

  if (eventDate > maxDate) {
    return { valid: false, error: 'Date trop éloignée (max 2 ans)' };
  }

  return { valid: true, error: null };
}

/**
 * Valide un prix
 * @param {number} price
 * @returns {{valid: boolean, error: string|null}}
 */
export function validatePrice(price) {
  if (typeof price !== 'number') {
    return { valid: false, error: 'Prix invalide' };
  }

  if (price < 0) {
    return { valid: false, error: 'Le prix ne peut pas être négatif' };
  }

  if (price > 10000) {
    return { valid: false, error: 'Prix maximum: 10 000€' };
  }

  // Vérifie max 2 décimales
  if (price.toFixed(2) !== price.toString()) {
    return { valid: false, error: 'Maximum 2 décimales' };
  }

  return { valid: true, error: null };
}

/**
 * Valide un âge minimum
 * @param {number} age
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateAge(age) {
  if (typeof age !== 'number') {
    return { valid: false, error: 'Âge invalide' };
  }

  if (!Number.isInteger(age)) {
    return { valid: false, error: 'L\'âge doit être un nombre entier' };
  }

  if (age < 0) {
    return { valid: false, error: 'L\'âge ne peut pas être négatif' };
  }

  if (age > 99) {
    return { valid: false, error: 'Âge maximum: 99 ans' };
  }

  return { valid: true, error: null };
}

/**
 * Valide une description
 * @param {string} description
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateDescription(description) {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Description requise' };
  }

  const trimmed = description.trim();

  if (trimmed.length < 10) {
    return { valid: false, error: 'Au moins 10 caractères' };
  }

  if (trimmed.length > 5000) {
    return { valid: false, error: 'Maximum 5000 caractères' };
  }

  // Vérifie les caractères dangereux (XSS)
  if (/<script|<iframe|javascript:|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Caractères interdits détectés' };
  }

  return { valid: true, error: null };
}

/**
 * Valide une URL
 * @param {string} url
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL invalide' };
  }

  try {
    const urlObj = new URL(url);

    // Autorise seulement http et https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Protocole non autorisé' };
    }

    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: 'URL invalide' };
  }
}

/**
 * Valide un fichier image
 * @param {File} file
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateImageFile(file) {
  if (!file || !(file instanceof File)) {
    return { valid: false, error: 'Fichier requis' };
  }

  // Vérifie le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non autorisé. Utilisez JPG, PNG ou WebP'
    };
  }

  // Vérifie la taille (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Taille maximale: 5MB'
    };
  }

  // Vérifie le nom du fichier (pas de caractères dangereux)
  if (/<|>|:|"|\/|\\|\||?|\*/g.test(file.name)) {
    return {
      valid: false,
      error: 'Nom de fichier invalide'
    };
  }

  return { valid: true, error: null };
}

/**
 * Sanitize une chaîne de caractères (protection XSS basique)
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
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
 * Valide un objet événement complet
 * @param {Object} event
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateEvent(event) {
  const errors = {};

  // Nom
  const nameValidation = validateEventName(event.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error;
  }

  // Date
  const dateValidation = validateEventDate(event.date);
  if (!dateValidation.valid) {
    errors.date = dateValidation.error;
  }

  // Lieu
  if (!event.location || event.location.trim().length < 3) {
    errors.location = 'Lieu requis (min 3 caractères)';
  }

  // Prix
  const priceValidation = validatePrice(event.price);
  if (!priceValidation.valid) {
    errors.price = priceValidation.error;
  }

  // Âge
  const ageValidation = validateAge(event.age);
  if (!ageValidation.valid) {
    errors.age = ageValidation.error;
  }

  // Description
  const descValidation = validateDescription(event.description);
  if (!descValidation.valid) {
    errors.description = descValidation.error;
  }

  // Lien (optionnel)
  if (event.link) {
    const urlValidation = validateURL(event.link);
    if (!urlValidation.valid) {
      errors.link = urlValidation.error;
    }
  }

  // Préventes (si activées)
  if (event.presales) {
    if (event.presalesEndDate) {
      const endDateValidation = validateEventDate(event.presalesEndDate);
      if (!endDateValidation.valid) {
        errors.presalesEndDate = endDateValidation.error;
      }

      // La date de fin des préventes doit être avant la date de l'événement
      const eventDate = new Date(event.date);
      const presalesEndDate = new Date(event.presalesEndDate);

      if (presalesEndDate >= eventDate) {
        errors.presalesEndDate = 'Doit être avant la date de l\'événement';
      }
    }

    if (event.maxPresales && typeof event.maxPresales === 'number') {
      if (event.maxPresales < 1 || event.maxPresales > 10000) {
        errors.maxPresales = 'Entre 1 et 10 000';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Valide les informations d'acheteur de prévente
 * @param {Object} buyer
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateBuyerInfo(buyer) {
  const errors = {};

  // Nom
  if (!buyer.nom || buyer.nom.trim().length < 2) {
    errors.nom = 'Nom requis (min 2 caractères)';
  } else if (buyer.nom.trim().length > 50) {
    errors.nom = 'Maximum 50 caractères';
  }

  // Prénom
  if (!buyer.prenom || buyer.prenom.trim().length < 2) {
    errors.prenom = 'Prénom requis (min 2 caractères)';
  } else if (buyer.prenom.trim().length > 50) {
    errors.prenom = 'Maximum 50 caractères';
  }

  // Âge
  const ageValidation = validateAge(buyer.age);
  if (!ageValidation.valid) {
    errors.age = ageValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
