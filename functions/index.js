const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');
const QRCode = require('qrcode');
const sgMail = require('@sendgrid/mail');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Configuration - À définir dans Firebase Config
// firebase functions:config:set stripe.secret_key="sk_live_xxx" stripe.webhook_secret="whsec_xxx"
// stripe.platform_account="acct_xxx" email.user="xxx" email.pass="xxx"

const getStripe = () => {
    const secretKey = functions.config().stripe?.secret_key;
    if (!secretKey) {
        throw new Error('Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_xxx"');
    }
    return stripe(secretKey);
};

// Configuration SendGrid
const initSendGrid = () => {
    const apiKey = functions.config().sendgrid?.api_key;
    if (!apiKey) {
        throw new Error('SendGrid API key not configured. Run: firebase functions:config:set sendgrid.api_key="SG.xxx"');
    }
    sgMail.setApiKey(apiKey);
};

// ============================================
// 1. STRIPE CONNECT - Onboarding créateurs
// ============================================

/**
 * Crée un compte Stripe Connect pour un créateur de soirée
 */
exports.createStripeConnectAccount = functions.region('europe-west1').https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;

    try {
        const stripeClient = getStripe();

        // Vérifier si l'utilisateur a déjà un compte Stripe
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().stripeAccountId) {
            // Retourner le lien d'onboarding pour compléter l'inscription
            const accountLink = await stripeClient.accountLinks.create({
                account: userDoc.data().stripeAccountId,
                refresh_url: `${data.baseUrl}/dashboard.html?stripe=refresh`,
                return_url: `${data.baseUrl}/dashboard.html?stripe=success`,
                type: 'account_onboarding',
            });
            return { url: accountLink.url, accountId: userDoc.data().stripeAccountId };
        }

        // Créer un nouveau compte Stripe Connect (Express)
        const account = await stripeClient.accounts.create({
            type: 'express',
            country: 'BE',
            email: userEmail,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: {
                firebase_uid: userId
            }
        });

        // Sauvegarder l'ID du compte Stripe dans Firestore
        await db.collection('users').doc(userId).update({
            stripeAccountId: account.id,
            stripeAccountStatus: 'pending'
        });

        // Créer le lien d'onboarding
        const accountLink = await stripeClient.accountLinks.create({
            account: account.id,
            refresh_url: `${data.baseUrl}/dashboard.html?stripe=refresh`,
            return_url: `${data.baseUrl}/dashboard.html?stripe=success`,
            type: 'account_onboarding',
        });

        return { url: accountLink.url, accountId: account.id };
    } catch (error) {
        console.error('Erreur création compte Stripe:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Vérifie le statut du compte Stripe Connect d'un utilisateur
 */
exports.checkStripeAccountStatus = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const userId = context.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists || !userDoc.data().stripeAccountId) {
            return { status: 'not_created', canReceivePayments: false };
        }

        const stripeClient = getStripe();
        const account = await stripeClient.accounts.retrieve(userDoc.data().stripeAccountId);

        const status = {
            status: account.details_submitted ? 'active' : 'pending',
            canReceivePayments: account.charges_enabled && account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled
        };

        // Mettre à jour le statut dans Firestore
        await db.collection('users').doc(userId).update({
            stripeAccountStatus: status.status,
            stripeCanReceivePayments: status.canReceivePayments
        });

        return status;
    } catch (error) {
        console.error('Erreur vérification statut Stripe:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// 2. CRÉATION DE SESSION CHECKOUT
// ============================================

/**
 * Crée une session Stripe Checkout pour l'achat d'une prévente
 */
exports.createCheckoutSession = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté pour acheter une prévente');
    }

    const { eventId, baseUrl, buyerInfo } = data;
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;

    try {
        // Récupérer les infos de l'événement
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
        }

        const event = eventDoc.data();

        // Vérifications
        if (event.status !== 'approved') {
            throw new functions.https.HttpsError('failed-precondition', 'Cet événement n\'est pas encore approuvé');
        }

        if (!event.presales) {
            throw new functions.https.HttpsError('failed-precondition', 'Les préventes ne sont pas activées pour cet événement');
        }

        // Vérifier si sold out (quota atteint)
        if (event.maxPresales && event.presalesSold >= event.maxPresales) {
            throw new functions.https.HttpsError('failed-precondition', 'Sold out ! Toutes les préventes ont été vendues.');
        }

        // Vérifier la date de fin des préventes
        if (event.presalesEndDate) {
            const endDate = new Date(event.presalesEndDate);
            if (new Date() > endDate) {
                throw new functions.https.HttpsError('failed-precondition', 'Les préventes sont terminées pour cet événement');
            }
        }

        // Vérifier que le créateur a un compte Stripe actif
        const creatorDoc = await db.collection('users').doc(event.createdBy).get();
        if (!creatorDoc.exists || !creatorDoc.data().stripeAccountId) {
            throw new functions.https.HttpsError('failed-precondition', 'Le créateur de l\'événement n\'a pas configuré son compte de paiement');
        }

        const creatorStripeAccountId = creatorDoc.data().stripeAccountId;

        const stripeClient = getStripe();

        // Prix du ticket et calcul de la commission (12% plateforme, 88% organisateur)
        const ticketPrice = event.ticketPrice || 800; // Prix en centimes (défaut: 8€)
        const totalAmount = ticketPrice;
        const platformFee = Math.round(totalAmount * 0.12); // 12% commission Soirées Mons
        const creatorAmount = totalAmount - platformFee; // 88% pour l'organisateur

        // Créer la session Checkout avec split payment
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card', 'bancontact', 'ideal'],
            mode: 'payment',
            customer_email: userEmail,
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Prévente - ${event.name}`,
                        description: `Entrée pour ${event.name} le ${new Date(event.date).toLocaleDateString('fr-BE')}`,
                        images: event.imageURL ? [event.imageURL] : []
                    },
                    unit_amount: totalAmount
                },
                quantity: 1
            }],
            payment_intent_data: {
                application_fee_amount: platformFee,
                transfer_data: {
                    destination: creatorStripeAccountId
                },
                metadata: {
                    eventId: eventId,
                    userId: userId,
                    userEmail: userEmail,
                    eventName: event.name,
                    eventDate: event.date,
                    creatorId: event.createdBy,
                    platformFee: platformFee.toString(),
                    creatorAmount: creatorAmount.toString()
                }
            },
            metadata: {
                eventId: eventId,
                userId: userId,
                userEmail: userEmail,
                eventName: event.name,
                creatorId: event.createdBy,
                platformFee: platformFee.toString(),
                creatorAmount: creatorAmount.toString(),
                buyerNom: buyerInfo?.nom || '',
                buyerPrenom: buyerInfo?.prenom || '',
                buyerAge: buyerInfo?.age?.toString() || ''
            },
            success_url: `${baseUrl}/presale-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/index.html?presale=cancelled`,
            locale: 'fr'
        });

        return { sessionId: session.id, url: session.url };
    } catch (error) {
        console.error('Erreur création session checkout:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// 3. WEBHOOK STRIPE
// ============================================

/**
 * Webhook pour recevoir les événements Stripe
 */
exports.stripeWebhook = functions.region('europe-west1').https.onRequest(async (req, res) => {
    const stripeClient = getStripe();
    const webhookSecret = functions.config().stripe?.webhook_secret;

    if (!webhookSecret) {
        console.error('Webhook secret not configured');
        return res.status(500).send('Webhook secret not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Traiter les différents types d'événements
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;

        case 'payment_intent.succeeded':
            console.log('Payment intent succeeded:', event.data.object.id);
            break;

        case 'payment_intent.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;

        case 'charge.refunded':
            await handleRefund(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
});

/**
 * Gère le paiement réussi
 */
async function handleCheckoutCompleted(session) {
    const { eventId, userId, userEmail, eventName, platformFee, creatorAmount, buyerNom, buyerPrenom, buyerAge } = session.metadata;

    try {
        // Générer un ID unique pour la prévente
        const presaleId = uuidv4();
        const qrCodeData = JSON.stringify({
            presaleId: presaleId,
            eventId: eventId,
            timestamp: Date.now()
        });

        // Générer le QR code en base64
        const qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Récupérer les infos de l'utilisateur
        const userDoc = await db.collection('users').doc(userId).get();
        const userName = userDoc.exists ? (userDoc.data().displayName || userEmail.split('@')[0]) : userEmail.split('@')[0];

        // Calculer les montants en euros
        const prixTotal = session.amount_total / 100;
        const commission = parseInt(platformFee) / 100;
        const montantRecu = parseInt(creatorAmount) / 100;

        // Créer le document de prévente dans Firestore
        const presaleData = {
            id: presaleId,
            eventId: eventId,
            eventName: eventName,
            userId: userId,
            userEmail: userEmail,
            userName: userName,
            // Infos de l'acheteur
            buyerNom: buyerNom || '',
            buyerPrenom: buyerPrenom || '',
            buyerAge: buyerAge ? parseInt(buyerAge) : null,
            amount: prixTotal, // Prix total en euros (pour compatibilité)
            prix_total: prixTotal, // Prix total payé par l'acheteur
            commission: commission, // Commission plateforme (12%)
            montant_recu: montantRecu, // Montant reçu par l'organisateur (88%)
            currency: session.currency,
            status: 'valid', // valid, used, refunded
            qrCode: qrCodeBase64,
            qrCodeData: qrCodeData,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            emailSent: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            usedAt: null,
            scannedBy: null
        };

        await db.collection('presales').doc(presaleId).set(presaleData);

        // Incrémenter le compteur de préventes vendues
        await db.collection('events').doc(eventId).update({
            presalesSold: admin.firestore.FieldValue.increment(1)
        });

        // Envoyer l'email avec le QR code
        await sendPresaleEmail(presaleData);

        // Mettre à jour le statut d'envoi d'email
        await db.collection('presales').doc(presaleId).update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Créer une notification pour l'utilisateur
        await db.collection('notifications').add({
            userId: userId,
            type: 'presale_purchased',
            eventId: eventId,
            eventName: eventName,
            presaleId: presaleId,
            message: `Votre prévente pour "${eventName}" a été confirmée ! Vérifiez votre email pour le QR code.`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Notifier le créateur de l'événement
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
            const creatorId = eventDoc.data().createdBy;
            await db.collection('notifications').add({
                userId: creatorId,
                type: 'presale_sold',
                eventId: eventId,
                eventName: eventName,
                presaleId: presaleId,
                message: `Nouvelle prévente vendue pour "${eventName}" ! Vous recevrez ${montantRecu.toFixed(2)}€.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log(`Prévente créée avec succès: ${presaleId}`);
    } catch (error) {
        console.error('Erreur lors de la création de la prévente:', error);
        throw error;
    }
}

/**
 * Gère l'échec de paiement
 */
async function handlePaymentFailed(paymentIntent) {
    const { eventId, userId, eventName } = paymentIntent.metadata;

    if (userId) {
        await db.collection('notifications').add({
            userId: userId,
            type: 'payment_failed',
            eventId: eventId,
            eventName: eventName,
            message: `Le paiement pour la prévente "${eventName}" a échoué. Veuillez réessayer.`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log(`Paiement échoué pour l'événement ${eventId}`);
}

/**
 * Gère le remboursement
 */
async function handleRefund(charge) {
    // Chercher la prévente correspondante
    const presalesSnapshot = await db.collection('presales')
        .where('stripePaymentIntentId', '==', charge.payment_intent)
        .get();

    if (!presalesSnapshot.empty) {
        const presaleDoc = presalesSnapshot.docs[0];
        const presaleData = presaleDoc.data();

        // Mettre à jour le statut de la prévente
        await presaleDoc.ref.update({
            status: 'refunded',
            refundedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Notifier l'utilisateur
        await db.collection('notifications').add({
            userId: presaleData.userId,
            type: 'presale_refunded',
            eventId: presaleData.eventId,
            eventName: presaleData.eventName,
            presaleId: presaleData.id,
            message: `Votre prévente pour "${presaleData.eventName}" a été remboursée.`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Prévente remboursée: ${presaleData.id}`);
    }
}

/**
 * Envoie l'email avec le QR code via SendGrid
 */
async function sendPresaleEmail(presaleData) {
    initSendGrid();

    const eventDoc = await db.collection('events').doc(presaleData.eventId).get();
    const eventData = eventDoc.data();
    const eventDate = new Date(eventData.date).toLocaleDateString('fr-BE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #0a0a12;
                color: #ffffff;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 212, 255, 0.1));
                border-radius: 20px;
                padding: 40px;
                border: 1px solid rgba(108, 99, 255, 0.3);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                background: linear-gradient(90deg, #6c63ff, #00d4ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .title {
                font-size: 24px;
                color: #00d4ff;
                margin: 20px 0;
            }
            .event-name {
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
                margin: 10px 0;
            }
            .event-details {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 5px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .detail-label {
                color: #a0a0a0;
            }
            .detail-value {
                color: #ffffff;
                font-weight: 500;
            }
            .qr-container {
                text-align: center;
                background: #ffffff;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
            }
            .qr-code {
                max-width: 250px;
            }
            .qr-text {
                color: #333333;
                font-size: 14px;
                margin-top: 15px;
            }
            .presale-id {
                font-family: monospace;
                font-size: 12px;
                color: #666666;
                word-break: break-all;
            }
            .warning {
                background: rgba(250, 173, 20, 0.2);
                border: 1px solid rgba(250, 173, 20, 0.5);
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 12px;
                color: #a0a0a0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">SOIRÉES MONS</div>
                <div class="title">Votre prévente est confirmée !</div>
            </div>

            <div class="event-name">${presaleData.eventName}</div>

            <div class="event-details">
                <div class="detail-row">
                    <span class="detail-label">Nom</span>
                    <span class="detail-value">${presaleData.userName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${eventDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Lieu</span>
                    <span class="detail-value">${eventData.location}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Prix payé</span>
                    <span class="detail-value">${presaleData.amount}€</span>
                </div>
            </div>

            <div class="qr-container">
                <img src="cid:qrcode" alt="QR Code" class="qr-code">
                <div class="qr-text">
                    Présentez ce QR code à l'entrée de l'événement
                </div>
                <div class="presale-id">
                    ID: ${presaleData.id}
                </div>
            </div>

            <div class="warning">
                <strong>Important :</strong> Ce QR code est unique et personnel. Ne le partagez pas.
                Il ne peut être utilisé qu'une seule fois.
            </div>

            <div class="footer">
                <p>Merci d'avoir choisi Soirées Mons !</p>
                <p>En cas de problème, contactez-nous sur Instagram @soireesmons</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Extraire le base64 du QR code
    const qrBase64 = presaleData.qrCode.split(',')[1];

    const msg = {
        to: presaleData.userEmail,
        from: {
            email: functions.config().sendgrid?.from_email || 'noreply@soireesmons.be',
            name: 'Soirées Mons'
        },
        subject: `🎉 Votre prévente pour ${presaleData.eventName}`,
        html: htmlContent,
        attachments: [
            {
                content: qrBase64,
                filename: 'qrcode.png',
                type: 'image/png',
                disposition: 'inline',
                content_id: 'qrcode'
            }
        ]
    };

    try {
        await sgMail.send(msg);
        console.log(`Email envoyé à ${presaleData.userEmail} via SendGrid`);
    } catch (error) {
        console.error('Erreur SendGrid:', error);
        if (error.response) {
            console.error('SendGrid response body:', error.response.body);
        }
        throw error;
    }
}

// ============================================
// 4. VÉRIFICATION ET SCAN DES TICKETS
// ============================================

/**
 * Vérifie un ticket (QR code) - retourne le statut
 */
exports.verifyTicket = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const { qrCodeData, eventId } = data;

    try {
        // Parser les données du QR code
        let qrData;
        try {
            qrData = JSON.parse(qrCodeData);
        } catch (e) {
            return {
                valid: false,
                status: 'invalid',
                message: 'QR code invalide ou corrompu'
            };
        }

        const presaleId = qrData.presaleId;

        // Récupérer la prévente
        const presaleDoc = await db.collection('presales').doc(presaleId).get();

        if (!presaleDoc.exists) {
            return {
                valid: false,
                status: 'not_found',
                message: 'Ticket non trouvé dans le système'
            };
        }

        const presale = presaleDoc.data();

        // Vérifier que le ticket appartient à cet événement
        if (presale.eventId !== eventId) {
            return {
                valid: false,
                status: 'wrong_event',
                message: 'Ce ticket n\'est pas pour cet événement'
            };
        }

        // Vérifier le statut du ticket
        if (presale.status === 'used') {
            return {
                valid: false,
                status: 'already_used',
                message: 'Ce ticket a déjà été utilisé',
                usedAt: presale.usedAt?.toDate?.() || presale.usedAt,
                userName: presale.userName
            };
        }

        if (presale.status === 'refunded') {
            return {
                valid: false,
                status: 'refunded',
                message: 'Ce ticket a été remboursé'
            };
        }

        // Ticket valide
        return {
            valid: true,
            status: 'valid',
            message: 'Ticket valide !',
            presaleId: presale.id,
            userName: presale.userName,
            userEmail: presale.userEmail,
            purchaseDate: presale.createdAt?.toDate?.() || presale.createdAt
        };

    } catch (error) {
        console.error('Erreur vérification ticket:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Marque un ticket comme utilisé
 */
exports.markTicketUsed = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const { presaleId, eventId } = data;
    const scannerId = context.auth.uid;

    try {
        // Vérifier que l'utilisateur est le créateur de l'événement ou admin
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
        }

        const event = eventDoc.data();
        const userDoc = await db.collection('users').doc(scannerId).get();
        const isAdmin = userDoc.exists && userDoc.data().isAdmin === true;

        if (event.createdBy !== scannerId && !isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Vous n\'êtes pas autorisé à scanner les tickets pour cet événement');
        }

        // Récupérer et vérifier la prévente
        const presaleDoc = await db.collection('presales').doc(presaleId).get();
        if (!presaleDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Prévente non trouvée');
        }

        const presale = presaleDoc.data();

        if (presale.eventId !== eventId) {
            throw new functions.https.HttpsError('failed-precondition', 'Ce ticket n\'est pas pour cet événement');
        }

        if (presale.status !== 'valid') {
            throw new functions.https.HttpsError('failed-precondition', `Ce ticket ne peut pas être utilisé (statut: ${presale.status})`);
        }

        // Marquer comme utilisé
        await db.collection('presales').doc(presaleId).update({
            status: 'used',
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            scannedBy: scannerId
        });

        return {
            success: true,
            message: 'Ticket validé avec succès !',
            userName: presale.userName
        };

    } catch (error) {
        console.error('Erreur marquage ticket utilisé:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// 5. RÉCUPÉRATION DES DONNÉES PRÉVENTES
// ============================================

/**
 * Récupère toutes les préventes pour un événement (pour le créateur)
 */
exports.getPresalesForEvent = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const { eventId } = data;
    const userId = context.auth.uid;

    try {
        // Vérifier que l'utilisateur est le créateur ou admin
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
        }

        const event = eventDoc.data();
        const userDoc = await db.collection('users').doc(userId).get();
        const isAdmin = userDoc.exists && userDoc.data().isAdmin === true;

        if (event.createdBy !== userId && !isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Accès non autorisé');
        }

        // Récupérer les préventes
        const presalesSnapshot = await db.collection('presales')
            .where('eventId', '==', eventId)
            .orderBy('createdAt', 'desc')
            .get();

        const presales = [];
        presalesSnapshot.forEach(doc => {
            const data = doc.data();
            presales.push({
                id: data.id,
                userName: data.userName,
                userEmail: data.userEmail,
                amount: data.amount,
                prix_total: data.prix_total || data.amount,
                commission: data.commission || data.amount * 0.12,
                montant_recu: data.montant_recu || data.amount * 0.88,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                usedAt: data.usedAt?.toDate?.() || data.usedAt
            });
        });

        // Statistiques - calculer les revenus réels basés sur les données Firestore
        const activePresales = presales.filter(p => p.status !== 'refunded');
        const stats = {
            total: presales.length,
            valid: presales.filter(p => p.status === 'valid').length,
            used: presales.filter(p => p.status === 'used').length,
            refunded: presales.filter(p => p.status === 'refunded').length,
            totalRevenue: activePresales.reduce((sum, p) => sum + (p.montant_recu || p.amount * 0.88), 0) // Montant reçu par l'organisateur (88%)
        };

        return { presales, stats };

    } catch (error) {
        console.error('Erreur récupération préventes:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Récupère les préventes de l'utilisateur
 */
exports.getMyPresales = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const userId = context.auth.uid;

    try {
        const presalesSnapshot = await db.collection('presales')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const presales = [];
        presalesSnapshot.forEach(doc => {
            const data = doc.data();
            presales.push({
                id: data.id,
                eventId: data.eventId,
                eventName: data.eventName,
                amount: data.amount,
                status: data.status,
                qrCode: data.qrCode,
                // Infos acheteur
                buyerNom: data.buyerNom || '',
                buyerPrenom: data.buyerPrenom || '',
                buyerAge: data.buyerAge || null,
                // Convertir les dates en ISO string pour éviter les problèmes de sérialisation
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                usedAt: data.usedAt?.toDate?.()?.toISOString() || null
            });
        });

        return { presales };

    } catch (error) {
        console.error('Erreur récupération mes préventes:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// 6. ADMINISTRATION
// ============================================

/**
 * Récupère toutes les préventes (admin uniquement)
 */
exports.getAllPresales = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const userId = context.auth.uid;

    try {
        // Vérifier que l'utilisateur est admin
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists || userDoc.data().isAdmin !== true) {
            throw new functions.https.HttpsError('permission-denied', 'Accès réservé aux administrateurs');
        }

        const presalesSnapshot = await db.collection('presales')
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get();

        const presales = [];
        presalesSnapshot.forEach(doc => {
            const data = doc.data();
            presales.push({
                id: data.id,
                eventId: data.eventId,
                eventName: data.eventName,
                userName: data.userName,
                userEmail: data.userEmail,
                amount: data.amount,
                prix_total: data.prix_total || data.amount,
                commission: data.commission || data.amount * 0.12,
                montant_recu: data.montant_recu || data.amount * 0.88,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                usedAt: data.usedAt?.toDate?.() || data.usedAt
            });
        });

        // Statistiques globales - calculer les revenus réels basés sur les données Firestore
        const activePresales = presales.filter(p => p.status !== 'refunded');
        const stats = {
            total: presales.length,
            valid: presales.filter(p => p.status === 'valid').length,
            used: presales.filter(p => p.status === 'used').length,
            refunded: presales.filter(p => p.status === 'refunded').length,
            totalRevenue: activePresales.reduce((sum, p) => sum + (p.prix_total || p.amount), 0),
            platformCommission: activePresales.reduce((sum, p) => sum + (p.commission || p.amount * 0.12), 0),
            creatorsRevenue: activePresales.reduce((sum, p) => sum + (p.montant_recu || p.amount * 0.88), 0)
        };

        return { presales, stats };

    } catch (error) {
        console.error('Erreur récupération toutes préventes:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Rembourse une prévente (admin uniquement)
 */
exports.refundPresale = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté');
    }

    const { presaleId } = data;
    const userId = context.auth.uid;

    try {
        // Vérifier que l'utilisateur est admin
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists || userDoc.data().isAdmin !== true) {
            throw new functions.https.HttpsError('permission-denied', 'Accès réservé aux administrateurs');
        }

        // Récupérer la prévente
        const presaleDoc = await db.collection('presales').doc(presaleId).get();
        if (!presaleDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Prévente non trouvée');
        }

        const presale = presaleDoc.data();

        if (presale.status === 'refunded') {
            throw new functions.https.HttpsError('failed-precondition', 'Cette prévente a déjà été remboursée');
        }

        if (presale.status === 'used') {
            throw new functions.https.HttpsError('failed-precondition', 'Impossible de rembourser un ticket déjà utilisé');
        }

        // Effectuer le remboursement via Stripe
        const stripeClient = getStripe();
        const paymentIntent = await stripeClient.paymentIntents.retrieve(presale.stripePaymentIntentId);

        await stripeClient.refunds.create({
            payment_intent: presale.stripePaymentIntentId,
            reason: 'requested_by_customer'
        });

        // Le statut sera mis à jour par le webhook

        return {
            success: true,
            message: 'Remboursement initié avec succès'
        };

    } catch (error) {
        console.error('Erreur remboursement:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
