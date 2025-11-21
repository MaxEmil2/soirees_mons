/**
 * APPROVE/REJECT EVENT CLOUD FUNCTION
 * Admin-only function to approve or reject pending events
 */

const admin = require('firebase-admin');
const { requireAdmin, createAuditLog } = require('../utils/auth');
const { validateString, validateEnum } = require('../utils/validation');

// ==========================================
// APPROVE OR REJECT EVENT
// ==========================================

async function approveEvent(data, context) {
    try {
        // 1. Require admin authentication
        const uid = await requireAdmin(context);

        // 2. Validate input
        const { eventId, action, reason } = data;

        if (!eventId) {
            throw new Error('Event ID is required');
        }

        const actionValidation = validateEnum(action, ['approve', 'reject']);
        if (!actionValidation.valid) {
            throw new Error('Invalid action. Must be "approve" or "reject"');
        }

        // 3. Get event document
        const eventRef = admin.firestore().collection('events').doc(eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            throw new Error('Event not found');
        }

        const eventData = eventDoc.data();

        // 4. Check if event is pending
        if (eventData.status !== 'pending') {
            throw new Error(`Event is already ${eventData.status}`);
        }

        // 5. Update event status
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (action === 'approve') {
            updates.status = 'approved';
            updates.approvedAt = admin.firestore.FieldValue.serverTimestamp();
        } else {
            updates.status = 'rejected';
            updates.rejectedAt = admin.firestore.FieldValue.serverTimestamp();

            // Validate and add rejection reason
            if (reason) {
                const reasonValidation = validateString(reason, 1, 500);
                if (!reasonValidation.valid) {
                    throw new Error('Invalid rejection reason');
                }
                updates.rejectionReason = reason;
            }
        }

        await eventRef.update(updates);

        // 6. Create notification for event creator
        await admin.firestore().collection('notifications').add({
            userId: eventData.createdBy,
            type: action === 'approve' ? 'event_approved' : 'event_rejected',
            eventId: eventId,
            eventName: eventData.name,
            message: action === 'approve'
                ? `Your event "${eventData.name}" has been approved!`
                : `Your event "${eventData.name}" was rejected${reason ? `: ${reason}` : ''}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 7. Create audit log
        await createAuditLog(`${action}_event`, uid, {
            eventId: eventId,
            eventName: eventData.name,
            eventCreator: eventData.createdBy,
            reason: reason || null
        });

        // 8. Return success
        return {
            success: true,
            action: action,
            eventId: eventId,
            message: `Event ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        };

    } catch (error) {
        console.error('Approve event error:', error);
        throw new Error(error.message || 'Failed to process event');
    }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = approveEvent;
