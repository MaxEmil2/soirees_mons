/**
 * SOIRÉES MONS - CLOUD FUNCTIONS
 * Secure backend operations with NASA-level security
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import event functions
const createEvent = require('./events/createEvent');
const updateEvent = require('./events/updateEvent');
const approveEvent = require('./events/approveEvent');
const deleteEvent = require('./events/deleteEvent');

// ==========================================
// RUNTIME OPTIONS
// ==========================================

// Runtime options for callable functions (Gen 1)
const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '256MB'
};

// ==========================================
// EVENT FUNCTIONS
// ==========================================

/**
 * Create a new event
 * Callable function - requires authentication
 * Organizers/admins: approved automatically
 * Regular users: pending approval
 */
exports.createEvent = functions
    .region('europe-west1')
    .runWith(runtimeOpts)
    .https.onCall(createEvent);

/**
 * Update an existing event
 * Callable function - requires authentication
 * Only event creator or admin can update
 */
exports.updateEvent = functions
    .region('europe-west1')
    .runWith(runtimeOpts)
    .https.onCall(updateEvent);

/**
 * Approve or reject a pending event
 * Callable function - admin only
 */
exports.approveEvent = functions
    .region('europe-west1')
    .runWith(runtimeOpts)
    .https.onCall(approveEvent);

/**
 * Delete an event
 * Callable function - requires authentication
 * Only event creator or admin can delete
 */
exports.deleteEvent = functions
    .region('europe-west1')
    .runWith(runtimeOpts)
    .https.onCall(deleteEvent);

// ==========================================
// PRESALE FUNCTIONS (TODO: Implement)
// ==========================================

/**
 * Create Stripe Checkout Session for presale
 * Callable function - requires authentication
 */
// exports.createCheckoutSession = functions
//     .region('europe-west1')
//     .https.onCall(createCheckoutSession);

/**
 * Handle Stripe webhook for payment confirmation
 * HTTP function - webhook endpoint
 */
// exports.handleStripeWebhook = functions
//     .region('europe-west1')
//     .https.onRequest(handleStripeWebhook);

/**
 * Validate and mark ticket as used
 * Callable function - requires scanner role
 */
// exports.validateTicket = functions
//     .region('europe-west1')
//     .https.onCall(validateTicket);

// ==========================================
// USER FUNCTIONS (TODO: Implement)
// ==========================================

/**
 * Update user role
 * Callable function - admin only
 */
// exports.updateUserRole = functions
//     .region('europe-west1')
//     .https.onCall(updateUserRole);

/**
 * Setup Stripe Connect account for organizer
 * Callable function - requires organizer role
 */
// exports.setupStripeAccount = functions
//     .region('europe-west1')
//     .https.onCall(setupStripeAccount);

// ==========================================
// STATS FUNCTIONS (TODO: Implement)
// ==========================================

/**
 * Get organizer statistics
 * Callable function - requires organizer/admin role
 */
// exports.getOrganizerStats = functions
//     .region('europe-west1')
//     .https.onCall(getOrganizerStats);

/**
 * Aggregate statistics (scheduled function)
 * Runs daily to update stats
 */
// exports.aggregateStats = functions
//     .region('europe-west1')
//     .pubsub.schedule('every 24 hours')
//     .onRun(aggregateStats);

// ==========================================
// NOTIFICATION FUNCTIONS (TODO: Implement)
// ==========================================

/**
 * Send email notification
 * Callable function - internal use
 */
// exports.sendEmailNotification = functions
//     .region('europe-west1')
//     .https.onCall(sendEmailNotification);

// ==========================================
// FIRESTORE TRIGGERS
// ==========================================

/**
 * On user created - send welcome email
 */
exports.onUserCreated = functions
    .region('europe-west1')
    .auth.user().onCreate(async (user) => {
        try {
            // Create user notification
            await admin.firestore().collection('notifications').add({
                userId: user.uid,
                type: 'welcome',
                message: 'Welcome to Soirées Mons! Start exploring amazing events in Mons.',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Welcome notification created for user:', user.uid);
        } catch (error) {
            console.error('Error creating welcome notification:', error);
        }
    });

/**
 * On event created - notify admins (if pending)
 */
exports.onEventCreated = functions
    .region('europe-west1')
    .firestore.document('events/{eventId}')
    .onCreate(async (snap, context) => {
        try {
            const eventData = snap.data();

            // If event is pending, notify admins
            if (eventData.status === 'pending') {
                // Get all admin users
                const adminsSnapshot = await admin.firestore()
                    .collection('users')
                    .where('isAdmin', '==', true)
                    .get();

                // Create notification for each admin
                const batch = admin.firestore().batch();
                adminsSnapshot.docs.forEach(adminDoc => {
                    const notificationRef = admin.firestore().collection('notifications').doc();
                    batch.set(notificationRef, {
                        userId: adminDoc.id,
                        type: 'event_pending_review',
                        eventId: context.params.eventId,
                        eventName: eventData.name,
                        message: `New event "${eventData.name}" is awaiting approval`,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });

                await batch.commit();
                console.log('Admins notified of pending event:', context.params.eventId);
            }
        } catch (error) {
            console.error('Error notifying admins:', error);
        }
    });

/**
 * On presale created - send confirmation email
 */
exports.onPresaleCreated = functions
    .region('europe-west1')
    .firestore.document('presales/{presaleId}')
    .onCreate(async (snap, context) => {
        try {
            const presaleData = snap.data();

            // Create notification for buyer
            await admin.firestore().collection('notifications').add({
                userId: presaleData.userId,
                type: 'presale_purchased',
                eventId: presaleData.eventId,
                eventName: presaleData.eventName,
                message: `Your ticket for "${presaleData.eventName}" has been purchased successfully!`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Get event to notify organizer
            const eventDoc = await admin.firestore().collection('events').doc(presaleData.eventId).get();
            if (eventDoc.exists) {
                const eventData = eventDoc.data();

                // Notify event organizer
                await admin.firestore().collection('notifications').add({
                    userId: eventData.createdBy,
                    type: 'presale_sold',
                    eventId: presaleData.eventId,
                    eventName: presaleData.eventName,
                    message: `A ticket for "${presaleData.eventName}" has been sold!`,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log('Presale notifications created:', context.params.presaleId);
        } catch (error) {
            console.error('Error creating presale notifications:', error);
        }
    });

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * Health check endpoint
 */
exports.healthCheck = functions
    .region('europe-west1')
    .https.onRequest((req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            region: 'europe-west1'
        });
    });
