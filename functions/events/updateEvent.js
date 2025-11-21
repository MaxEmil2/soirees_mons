/**
 * UPDATE EVENT CLOUD FUNCTION
 * Secure server-side event update with validation
 */

const admin = require('firebase-admin');
const { requireAuth, canManageEvent, createAuditLog } = require('../utils/auth');
const { validateEventData, sanitizeHTML } = require('../utils/validation');

// ==========================================
// UPDATE EVENT
// ==========================================

async function updateEvent(data, context) {
    try {
        // 1. Require authentication
        const uid = await requireAuth(context);

        // 2. Validate input
        const { eventId, updates } = data;

        if (!eventId) {
            throw new Error('Event ID is required');
        }

        if (!updates || typeof updates !== 'object') {
            throw new Error('Updates object is required');
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
            throw new Error('You do not have permission to update this event');
        }

        // 5. Validate update data (only validate provided fields)
        const allowedFields = [
            'name', 'description', 'location', 'date', 'price', 'age', 'link',
            'imageURL', 'imagePath', 'presales', 'presalesEndDate', 'ticketPrice',
            'isPriority'
        ];

        const sanitizedUpdates = {};

        for (const [key, value] of Object.entries(updates)) {
            if (!allowedFields.includes(key)) {
                throw new Error(`Field "${key}" cannot be updated`);
            }

            // Sanitize and validate each field
            switch (key) {
                case 'name':
                case 'description':
                case 'location':
                case 'link':
                    sanitizedUpdates[key] = sanitizeHTML(value);
                    break;

                case 'date':
                case 'presalesEndDate':
                    sanitizedUpdates[key] = admin.firestore.Timestamp.fromDate(new Date(value));
                    break;

                case 'price':
                case 'age':
                case 'ticketPrice':
                    sanitizedUpdates[key] = Number(value);
                    break;

                case 'presales':
                case 'isPriority':
                    sanitizedUpdates[key] = Boolean(value);
                    break;

                default:
                    sanitizedUpdates[key] = value;
            }
        }

        // 6. Add updatedAt timestamp
        sanitizedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // 7. Update event in Firestore
        await eventRef.update(sanitizedUpdates);

        // 8. Create audit log
        await createAuditLog('update_event', uid, {
            eventId: eventId,
            eventName: eventData.name,
            updatedFields: Object.keys(sanitizedUpdates)
        });

        // 9. Return success
        return {
            success: true,
            eventId: eventId,
            message: 'Event updated successfully'
        };

    } catch (error) {
        console.error('Update event error:', error);
        throw new Error(error.message || 'Failed to update event');
    }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = updateEvent;
