/**
 * DELETE EVENT CLOUD FUNCTION
 * Secure server-side event deletion with cleanup
 */

const admin = require('firebase-admin');
const { requireAuth, canManageEvent, createAuditLog } = require('../utils/auth');

// ==========================================
// DELETE EVENT
// ==========================================

async function deleteEvent(data, context) {
    try {
        // 1. Require authentication
        const uid = await requireAuth(context);

        // 2. Validate input
        const { eventId } = data;

        if (!eventId) {
            throw new Error('Event ID is required');
        }

        // 3. Get event document
        const eventRef = admin.firestore().collection('events').doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            throw new Error('Event not found');
        }

        const eventData = eventDoc.data();

        // 4. Check if user can manage this event
        if (!(await canManageEvent(uid, eventData.createdBy))) {
            throw new Error('You do not have permission to delete this event');
        }

        // 5. Check if event has active presales
        const presalesSnapshot = await admin.firestore()
            .collection('presales')
            .where('eventId', '==', eventId)
            .where('status', '==', 'valid')
            .get();

        if (!presalesSnapshot.empty) {
            throw new Error('Cannot delete event with active presales. Please refund all tickets first.');
        }

        // 6. Delete event image from Storage (if exists)
        if (eventData.imagePath) {
            try {
                const bucket = admin.storage().bucket();
                await bucket.file(eventData.imagePath).delete();
            } catch (error) {
                console.warn('Failed to delete event image:', error);
                // Continue with deletion even if image delete fails
            }
        }

        // 7. Delete all likes for this event
        const likesSnapshot = await admin.firestore()
            .collection('likes')
            .where('eventId', '==', eventId)
            .get();

        const batch = admin.firestore().batch();
        likesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 8. Delete all notifications for this event
        const notificationsSnapshot = await admin.firestore()
            .collection('notifications')
            .where('eventId', '==', eventId)
            .get();

        notificationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 9. Delete the event
        batch.delete(eventRef);

        // Commit all deletions
        await batch.commit();

        // 10. Create audit log
        await createAuditLog('delete_event', uid, {
            eventId: eventId,
            eventName: eventData.name,
            eventCreator: eventData.createdBy
        });

        // 11. Return success
        return {
            success: true,
            eventId: eventId,
            message: 'Event deleted successfully'
        };

    } catch (error) {
        console.error('Delete event error:', error);
        throw new Error(error.message || 'Failed to delete event');
    }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = deleteEvent;
