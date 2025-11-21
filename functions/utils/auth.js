/**
 * AUTHENTICATION & AUTHORIZATION UTILITIES
 * Role-based access control for Cloud Functions
 */

const admin = require('firebase-admin');

// ==========================================
// VERIFY ID TOKEN
// ==========================================

async function verifyIdToken(idToken) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return { valid: true, uid: decodedToken.uid, email: decodedToken.email };
    } catch (error) {
        console.error('Invalid ID token:', error);
        return { valid: false, error: 'Invalid or expired token' };
    }
}

// ==========================================
// GET USER DATA
// ==========================================

async function getUserData(uid) {
    try {
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return { valid: false, error: 'User not found' };
        }

        return { valid: true, data: userDoc.data() };
    } catch (error) {
        console.error('Error fetching user data:', error);
        return { valid: false, error: 'Failed to fetch user data' };
    }
}

// ==========================================
// CHECK IF USER IS ADMIN
// ==========================================

async function isAdmin(uid) {
    const result = await getUserData(uid);

    if (!result.valid) {
        return false;
    }

    return result.data.isAdmin === true || result.data.role === 'admin';
}

// ==========================================
// CHECK IF USER HAS ROLE
// ==========================================

async function hasRole(uid, role) {
    const result = await getUserData(uid);

    if (!result.valid) {
        return false;
    }

    return result.data.role === role || result.data.isAdmin === true;
}

// ==========================================
// CHECK IF USER IS ORGANIZER
// ==========================================

async function isOrganizer(uid) {
    return await hasRole(uid, 'organizer');
}

// ==========================================
// CHECK IF USER IS SCANNER
// ==========================================

async function isScanner(uid) {
    return await hasRole(uid, 'scanner');
}

// ==========================================
// CHECK IF USER CAN MANAGE EVENT
// ==========================================

async function canManageEvent(uid, eventCreatorId) {
    // Admin can manage all events
    if (await isAdmin(uid)) {
        return true;
    }

    // Event creator can manage their own event
    return uid === eventCreatorId;
}

// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

async function requireAuth(context) {
    if (!context.auth) {
        throw new Error('Authentication required');
    }

    return context.auth.uid;
}

// ==========================================
// REQUIRE ADMIN
// ==========================================

async function requireAdmin(context) {
    const uid = await requireAuth(context);

    if (!(await isAdmin(uid))) {
        throw new Error('Admin access required');
    }

    return uid;
}

// ==========================================
// REQUIRE ORGANIZER
// ==========================================

async function requireOrganizer(context) {
    const uid = await requireAuth(context);

    if (!(await isOrganizer(uid))) {
        throw new Error('Organizer access required');
    }

    return uid;
}

// ==========================================
// REQUIRE SCANNER
// ==========================================

async function requireScanner(context) {
    const uid = await requireAuth(context);

    if (!(await isScanner(uid))) {
        throw new Error('Scanner access required');
    }

    return uid;
}

// ==========================================
// REQUIRE EVENT OWNERSHIP
// ==========================================

async function requireEventOwnership(context, eventCreatorId) {
    const uid = await requireAuth(context);

    if (!(await canManageEvent(uid, eventCreatorId))) {
        throw new Error('You do not have permission to manage this event');
    }

    return uid;
}

// ==========================================
// CREATE AUDIT LOG
// ==========================================

async function createAuditLog(action, uid, details = {}) {
    try {
        await admin.firestore().collection('audit_logs').add({
            action,
            uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ...details
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}

// ==========================================
// RATE LIMITING (Simple in-memory implementation)
// ==========================================

const rateLimitMap = new Map();

function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const userRequests = rateLimitMap.get(identifier) || [];

    // Remove requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
        return { allowed: false, error: 'Too many requests. Please try again later.' };
    }

    recentRequests.push(now);
    rateLimitMap.set(identifier, recentRequests);

    return { allowed: true };
}

// Clean up old entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [identifier, requests] of rateLimitMap.entries()) {
        const recentRequests = requests.filter(time => now - time < 60000);
        if (recentRequests.length === 0) {
            rateLimitMap.delete(identifier);
        } else {
            rateLimitMap.set(identifier, recentRequests);
        }
    }
}, 60000);

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    verifyIdToken,
    getUserData,
    isAdmin,
    hasRole,
    isOrganizer,
    isScanner,
    canManageEvent,
    requireAuth,
    requireAdmin,
    requireOrganizer,
    requireScanner,
    requireEventOwnership,
    createAuditLog,
    checkRateLimit
};
