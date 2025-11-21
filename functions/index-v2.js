/**
 * ========================================
 * SOIRÉES MONS - CLOUD FUNCTIONS V2
 * Architecture sécurisée niveau NASA
 * ========================================
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// ========================================
// HELPERS - VALIDATION
// ========================================

/**
 * Valide qu'un utilisateur est authentifié
 */
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }
    return context.auth.uid;
}

/**
 * Valide qu'un utilisateur a un rôle spécifique
 */
async function requireRole(userId, allowedRoles) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Utilisateur non trouvé');
    }

    const userData = userDoc.data();
    if (!allowedRoles.includes(userData.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Permissions insuffisantes');
    }

    return userData;
}

/**
 * Valide les données d'un événement
 */
function validateEventData(data) {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || data.name.length < 3) {
        errors.push('Nom invalide (min 3 caractères)');
    }
    if (!data.location || typeof data.location !== 'string' || data.location.length < 3) {
        errors.push('Lieu invalide (min 3 caractères)');
    }
    if (!data.date || isNaN(new Date(data.date).getTime())) {
        errors.push('Date invalide');
    }
    if (data.age < 16 || data.age > 99) {
        errors.push('Âge invalide (16-99)');
    }
    if (data.presales) {
        if (data.price < 1 || data.price > 1000) {
            errors.push('Prix invalide (1€-1000€)');
        }
        if (data.maxPresales < 1 || data.maxPresales > 10000) {
            errors.push('Nombre max de préventes invalide');
        }
    }

    if (errors.length > 0) {
        throw new functions.https.HttpsError('invalid-argument', errors.join(', '));
    }
}

/**
 * Nettoie les données HTML (anti-XSS)
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
}

// ========================================
// FONCTION: createEvent
// ========================================

exports.createEvent = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const userId = requireAuth(context);

        // Nettoyer les données
        const eventData = {
            name: sanitizeString(data.name),
            location: sanitizeString(data.location),
            description: sanitizeString(data.description || ''),
            date: data.date,
            age: parseInt(data.age),
            price: data.presales ? parseFloat(data.price) : 0,
            link: data.link || '',
            imageURL: data.imageURL || '',
            imagePath: data.imagePath || '',
            presales: Boolean(data.presales),
            maxPresales: data.presales ? parseInt(data.maxPresales) : 0,
            presalesEndDate: data.presalesEndDate || null,
            presalesSold: 0,
            presalesStopped: false,
            status: 'pending',
            createdBy: userId,
            createdByEmail: context.auth.token.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            scanners: []
        };

        // Valider
        validateEventData(eventData);

        // Créer l'événement
        const eventRef = await db.collection('events').add(eventData);

        // Créer notification pour l'utilisateur
        await db.collection('notifications').add({
            userId: userId,
            type: 'event_submitted',
            eventId: eventRef.id,
            eventName: eventData.name,
            message: 'Votre soirée a été soumise et est en attente de validation',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, eventId: eventRef.id };
    });

// ========================================
// FONCTION: approveEvent (ADMIN)
// ========================================

exports.approveEvent = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const userId = requireAuth(context);
        await requireRole(userId, ['admin']);

        const { eventId } = data;
        if (!eventId) {
            throw new functions.https.HttpsError('invalid-argument', 'eventId requis');
        }

        // Approuver l'événement
        await db.collection('events').doc(eventId).update({
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: userId
        });

        // Notifier le créateur
        const eventDoc = await db.collection('events').doc(eventId).get();
        const eventData = eventDoc.data();

        await db.collection('notifications').add({
            userId: eventData.createdBy,
            type: 'event_approved',
            eventId: eventId,
            eventName: eventData.name,
            message: 'Votre soirée a été approuvée !',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    });

// ========================================
// FONCTION: rejectEvent (ADMIN)
// ========================================

exports.rejectEvent = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const userId = requireAuth(context);
        await requireRole(userId, ['admin']);

        const { eventId, reason } = data;
        if (!eventId || !reason) {
            throw new functions.https.HttpsError('invalid-argument', 'eventId et reason requis');
        }

        await db.collection('events').doc(eventId).update({
            status: 'rejected',
            rejectionReason: sanitizeString(reason),
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy: userId
        });

        // Notifier le créateur
        const eventDoc = await db.collection('events').doc(eventId).get();
        const eventData = eventDoc.data();

        await db.collection('notifications').add({
            userId: eventData.createdBy,
            type: 'event_rejected',
            eventId: eventId,
            eventName: eventData.name,
            message: `Votre soirée a été refusée. Raison: ${sanitizeString(reason)}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    });

// ========================================
// FONCTION: scanPresale (SCANNER)
// ========================================

exports.scanPresale = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const userId = requireAuth(context);

        const { presaleId } = data;
        if (!presaleId) {
            throw new functions.https.HttpsError('invalid-argument', 'presaleId requis');
        }

        // Vérifier que la prévente existe
        const presaleDoc = await db.collection('presales').doc(presaleId).get();
        if (!presaleDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Prévente introuvable');
        }

        const presaleData = presaleDoc.data();

        // Vérifier que l'utilisateur est scanner pour cet événement
        const eventDoc = await db.collection('events').doc(presaleData.eventId).get();
        const eventData = eventDoc.data();

        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        const isAuthorized = userData.role === 'admin' ||
                            eventData.createdBy === userId ||
                            (eventData.scanners && eventData.scanners.includes(userId));

        if (!isAuthorized) {
            throw new functions.https.HttpsError('permission-denied', 'Vous n\'êtes pas autorisé à scanner cette prévente');
        }

        // Vérifier que la prévente n'a pas déjà été utilisée
        if (presaleData.status === 'used') {
            throw new functions.https.HttpsError('failed-precondition', 'Cette prévente a déjà été utilisée');
        }

        // Marquer comme utilisée
        await db.collection('presales').doc(presaleId).update({
            status: 'used',
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            scannedBy: userId
        });

        // Logger le scan (audit trail)
        await db.collection('scanLogs').add({
            presaleId: presaleId,
            eventId: presaleData.eventId,
            scannedBy: userId,
            scannedAt: admin.firestore.FieldValue.serverTimestamp(),
            buyerName: presaleData.buyerName,
            buyerEmail: presaleData.buyerEmail
        });

        return {
            success: true,
            buyerName: presaleData.buyerName,
            buyerAge: presaleData.buyerAge,
            buyerEmail: presaleData.buyerEmail
        };
    });

// ========================================
// FONCTION: addScanner (ORGANIZER)
// ========================================

exports.addScanner = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const userId = requireAuth(context);

        const { eventId, scannerUid } = data;
        if (!eventId || !scannerUid) {
            throw new functions.https.HttpsError('invalid-argument', 'eventId et scannerUid requis');
        }

        // Vérifier que l'événement existe et appartient à l'utilisateur
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Événement introuvable');
        }

        const eventData = eventDoc.data();
        if (eventData.createdBy !== userId) {
            const userData = await requireRole(userId, ['admin']);
            // Admin peut aussi ajouter des scanners
        }

        // Vérifier que le scanner existe
        try {
            await auth.getUser(scannerUid);
        } catch (error) {
            throw new functions.https.HttpsError('not-found', 'Utilisateur scanner introuvable');
        }

        // Ajouter le scanner
        const currentScanners = eventData.scanners || [];
        if (currentScanners.includes(scannerUid)) {
            throw new functions.https.HttpsError('already-exists', 'Ce scanner est déjà ajouté');
        }

        if (currentScanners.length >= 7) {
            throw new functions.https.HttpsError('resource-exhausted', 'Maximum 7 scanners autorisés');
        }

        currentScanners.push(scannerUid);

        await db.collection('events').doc(eventId).update({
            scanners: currentScanners
        });

        // Mettre à jour le rôle de l'utilisateur à 'scanner' s'il est 'user'
        const scannerUserDoc = await db.collection('users').doc(scannerUid).get();
        if (scannerUserDoc.exists && scannerUserDoc.data().role === 'user') {
            await db.collection('users').doc(scannerUid).update({
                role: 'scanner'
            });
        }

        return { success: true };
    });

// ========================================
// WEBHOOK: Stripe Payment Success
// ========================================

exports.stripeWebhook = functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = functions.config().stripe.webhook_secret;

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Gérer l'événement checkout.session.completed
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            try {
                // Récupérer les métadonnées
                const eventId = session.metadata.eventId;
                const userId = session.metadata.userId;
                const buyerName = session.metadata.buyerName;
                const buyerFirstName = session.metadata.buyerFirstName;
                const buyerAge = parseInt(session.metadata.buyerAge);
                const buyerEmail = session.customer_details.email;

                // Générer QR code
                const presaleId = db.collection('presales').doc().id;
                const qrData = JSON.stringify({ presaleId, eventId, buyerEmail });
                const qrCodeBuffer = await QRCode.toBuffer(qrData, { width: 500 });

                // Upload QR code vers Storage
                const bucket = storage.bucket();
                const file = bucket.file(`presales/${presaleId}/qr-code.png`);
                await file.save(qrCodeBuffer, {
                    metadata: { contentType: 'image/png' }
                });
                const [qrCodeURL] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500'
                });

                // Créer la prévente
                await db.collection('presales').doc(presaleId).set({
                    eventId: eventId,
                    userId: userId,
                    buyerName: buyerName,
                    buyerFirstName: buyerFirstName,
                    buyerAge: buyerAge,
                    buyerEmail: buyerEmail,
                    qrCodeURL: qrCodeURL,
                    status: 'valid',
                    paymentIntentId: session.payment_intent,
                    amountPaid: session.amount_total / 100,
                    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
                    usedAt: null,
                    scannedBy: null
                });

                // Incrémenter presalesSold
                await db.collection('events').doc(eventId).update({
                    presalesSold: admin.firestore.FieldValue.increment(1)
                });

                // Envoyer email avec QR code
                // TODO: Implémenter l'envoi d'email

                console.log('✅ Prévente créée:', presaleId);
            } catch (error) {
                console.error('❌ Erreur création prévente:', error);
            }
        }

        res.json({ received: true });
    });

// ========================================
// TRIGGER: Nettoyage auto après 24h
// ========================================

exports.cleanupOldPresales = functions
    .region('europe-west1')
    .pubsub.schedule('every 24 hours')
    .onRun(async (context) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const snapshot = await db.collection('presales')
            .where('purchasedAt', '<', cutoff)
            .where('status', '==', 'valid')
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            // Marquer comme expiré au lieu de supprimer
            batch.update(doc.ref, { status: 'expired' });
        });

        await batch.commit();
        console.log(`✅ ${snapshot.size} préventes nettoyées`);
    });
