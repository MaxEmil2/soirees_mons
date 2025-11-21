/**
 * CREATE EVENT CLOUD FUNCTION
 * Secure server-side event creation with validation
 */

const admin = require('firebase-admin');
const { requireAuth, isAdmin, isOrganizer, createAuditLog, checkRateLimit } = require('../utils/auth');
const { validateEventData, sanitizeHTML } = require('../utils/validation');

// ==========================================
// CREATE EVENT
// ==========================================

async function createEvent(data, context) {
    try {
        // 1. Require authentication
        const uid = await requireAuth(context);

        // 2. Rate limiting (max 5 events per hour)
        const rateLimitCheck = checkRateLimit(`create_event_${uid}`, 5, 3600000);
        if (!rateLimitCheck.allowed) {
            throw new Error(rateLimitCheck.error);
        }

        // 3. Get user data
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();

        // 4. Check if user is organizer or admin
        const isOrganizerUser = await isOrganizer(uid);
        const isAdminUser = await isAdmin(uid);

        if (!isOrganizerUser && !isAdminUser) {
            // Regular users can only propose events (status: pending)
            if (!data.name || !data.description || !data.location || !data.date) {
                throw new Error('Missing required fields');
            }
        }

        // 5. Validate event data
        const validation = validateEventData(data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => e.error).join(', ')}`);
        }

        // 6. Sanitize HTML inputs
        const sanitizedData = {
            name: sanitizeHTML(data.name),
            description: sanitizeHTML(data.description),
            location: sanitizeHTML(data.location),
            date: admin.firestore.Timestamp.fromDate(new Date(data.date)),
            price: Number(data.price),
            age: Number(data.age),
            link: data.link ? sanitizeHTML(data.link) : '',
            imageURL: data.imageURL || null,
            imagePath: data.imagePath || null,
            presales: data.presales === true,
            presalesEndDate: data.presalesEndDate ? admin.firestore.Timestamp.fromDate(new Date(data.presalesEndDate)) : null,
            ticketPrice: data.ticketPrice ? Number(data.ticketPrice) : null,
            createdBy: uid,
            createdByEmail: userData.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // 7. Set event status based on user role
        if (isAdminUser || isOrganizerUser) {
            // Admins and organizers: approved automatically
            sanitizedData.status = 'approved';
            sanitizedData.approvedAt = admin.firestore.FieldValue.serverTimestamp();
        } else {
            // Regular users: pending approval
            sanitizedData.status = 'pending';
        }

        // 8. Set priority flag (admin only)
        sanitizedData.isPriority = isAdminUser && data.isPriority === true;

        // 9. Create event in Firestore
        const eventRef = await admin.firestore().collection('events').add(sanitizedData);

        // 10. Create notification for user
        await admin.firestore().collection('notifications').add({
            userId: uid,
            type: sanitizedData.status === 'approved' ? 'event_created' : 'event_submitted',
            eventId: eventRef.id,
            eventName: sanitizedData.name,
            message: sanitizedData.status === 'approved'
                ? `Your event "${sanitizedData.name}" has been created successfully`
                : `Your event "${sanitizedData.name}" has been submitted for approval`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 11. Create audit log
        await createAuditLog('create_event', uid, {
            eventId: eventRef.id,
            eventName: sanitizedData.name,
            status: sanitizedData.status
        });

        // 12. Return success
        return {
            success: true,
            eventId: eventRef.id,
            status: sanitizedData.status,
            message: sanitizedData.status === 'approved'
                ? 'Event created successfully'
                : 'Event submitted for approval'
        };

    } catch (error) {
        console.error('Create event error:', error);
        throw new Error(error.message || 'Failed to create event');
    }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = createEvent;
