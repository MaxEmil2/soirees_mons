/**
 * SYSTÈME DE CACHE INTELLIGENT
 * Cache en mémoire avec TTL et invalidation
 * @module cache
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live
  }

  /**
   * Stocke une valeur dans le cache
   * @param {string} key - Clé du cache
   * @param {*} value - Valeur à cacher
   * @param {number} ttl - Durée de vie en millisecondes (défaut: 5 minutes)
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - Clé du cache
   * @returns {*} Valeur cachée ou null si expirée/inexistante
   */
  get(key) {
    // Vérifie si la clé existe
    if (!this.cache.has(key)) {
      return null;
    }

    // Vérifie si le TTL est expiré
    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Vérifie si une clé existe dans le cache
   * @param {string} key - Clé du cache
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Supprime une clé du cache
   * @param {string} key - Clé du cache
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Supprime toutes les clés correspondant à un préfixe
   * @param {string} prefix - Préfixe des clés à supprimer
   */
  invalidateByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }

  /**
   * Vide complètement le cache
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  /**
   * Retourne la taille du cache
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }
}

// Instance singleton
const cache = new CacheManager();

// Nettoyage automatique toutes les minutes
setInterval(() => cache.cleanup(), 60 * 1000);

export default cache;

/**
 * Helper pour wrapper une fonction avec du cache
 * @param {Function} fn - Fonction à wrapper
 * @param {string} key - Clé de cache
 * @param {number} ttl - Durée de vie du cache
 * @returns {Function}
 */
export function withCache(fn, key, ttl) {
  return async function(...args) {
    // Génère une clé unique avec les arguments
    const cacheKey = `${key}:${JSON.stringify(args)}`;

    // Vérifie le cache
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Exécute la fonction
    const result = await fn(...args);

    // Met en cache
    cache.set(cacheKey, result, ttl);

    return result;
  };
}
