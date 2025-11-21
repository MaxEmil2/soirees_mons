/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                   AUTHENTICATION & AUTHORIZATION                   ║
 * ║              Vérifications ultra-sécurisées d'accès                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { db } from '../admin.js';
import { https } from 'firebase-functions/v2';

/**
 * Vérifie qu'un utilisateur est authentifié
 * Throw une erreur si non authentifié
 */
export async function requireAuth(context) {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action'
    );
  }
  return context.auth;
}

/**
 * Récupère les données utilisateur depuis Firestore
 */
export async function getUserData(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    return {
      uid,
      ...userDoc.data()
    };
  } catch (error) {
    console.error(`Error fetching user data for ${uid}:`, error);
    return null;
  }
}

/**
 * Vérifie si un utilisateur est admin
 */
export async function isAdmin(uid) {
  const userData = await getUserData(uid);
  return userData?.isAdmin === true;
}

/**
 * Vérifie si un utilisateur est organisateur
 */
export async function isOrganizer(uid) {
  const userData = await getUserData(uid);
  return userData?.isOrganizer === true || userData?.isAdmin === true;
}

/**
 * Vérifie si un utilisateur est scanner
 */
export async function isScanner(uid) {
  const userData = await getUserData(uid);
  return userData?.isScanner === true || userData?.isAdmin === true;
}

/**
 * Vérifie si un utilisateur est propriétaire d'un événement
 */
export async function isEventOwner(uid, eventId) {
  try {
    const eventDoc = await db.collection('events').doc(eventId).get();

    if (!eventDoc.exists) {
      return false;
    }

    const eventData = eventDoc.data();
    return eventData.createdBy === uid;
  } catch (error) {
    console.error(`Error checking event ownership:`, error);
    return false;
  }
}

/**
 * Vérifie les permissions pour un événement
 * Throw une erreur si pas autorisé
 */
export async function requireEventPermission(uid, eventId) {
  const isOwner = await isEventOwner(uid, eventId);
  const isAdminUser = await isAdmin(uid);

  if (!isOwner && !isAdminUser) {
    throw new https.HttpsError(
      'permission-denied',
      'Vous n\'êtes pas autorisé à modifier cet événement'
    );
  }

  return true;
}

/**
 * Vérifie que l'utilisateur est admin
 * Throw une erreur si pas admin
 */
export async function requireAdmin(uid) {
  const isAdminUser = await isAdmin(uid);

  if (!isAdminUser) {
    throw new https.HttpsError(
      'permission-denied',
      'Cette action nécessite des droits administrateur'
    );
  }

  return true;
}

/**
 * Vérifie que l'utilisateur est organisateur
 * Throw une erreur si pas organisateur
 */
export async function requireOrganizer(uid) {
  const isOrganizerUser = await isOrganizer(uid);

  if (!isOrganizerUser) {
    throw new https.HttpsError(
      'permission-denied',
      'Cette action nécessite des droits organisateur'
    );
  }

  return true;
}

/**
 * Vérifie que l'utilisateur est scanner
 * Throw une erreur si pas scanner
 */
export async function requireScanner(uid) {
  const isScannerUser = await isScanner(uid);

  if (!isScannerUser) {
    throw new https.HttpsError(
      'permission-denied',
      'Cette action nécessite des droits scanner'
    );
  }

  return true;
}

/**
 * Crée un log d'audit pour traçabilité
 */
export async function logAudit(action, uid, details = {}) {
  try {
    await db.collection('audit_logs').add({
      action,
      uid,
      details,
      timestamp: new Date(),
      ip: details.ip || null
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}
