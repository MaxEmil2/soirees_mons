/*
 * ROLE-BASED ACCESS CONTROL
 * Manages user roles and permissions
 */

import { auth, db, COLLECTIONS, ROLES } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ==========================================
// PERMISSION CACHE
// ==========================================

let currentUserData = null;
let permissionsCache = null;

// ==========================================
// GET CURRENT USER DATA
// ==========================================

export async function getCurrentUserData() {
    if (!auth.currentUser) {
        return null;
    }

    // Return cached data if available
    if (currentUserData && currentUserData.uid === auth.currentUser.uid) {
        return currentUserData;
    }

    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid));

        if (!userDoc.exists()) {
            console.warn('User document does not exist in Firestore');
            return null;
        }

        currentUserData = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            ...userDoc.data()
        };

        return currentUserData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// ==========================================
// CLEAR CACHE ON AUTH STATE CHANGE
// ==========================================

export function clearPermissionsCache() {
    currentUserData = null;
    permissionsCache = null;
}

// ==========================================
// GET USER ROLE
// ==========================================

export async function getUserRole() {
    const userData = await getCurrentUserData();

    if (!userData) {
        return null;
    }

    // Return role from user document
    return userData.role || ROLES.USER;
}

// ==========================================
// CHECK IF USER HAS ROLE
// ==========================================

export async function hasRole(role) {
    const userRole = await getUserRole();
    return userRole === role;
}

// ==========================================
// CHECK IF USER IS ADMIN
// ==========================================

export async function isAdmin() {
    const userData = await getCurrentUserData();
    return userData?.isAdmin === true || userData?.role === ROLES.ADMIN;
}

// ==========================================
// CHECK IF USER IS ORGANIZER
// ==========================================

export async function isOrganizer() {
    const userData = await getCurrentUserData();
    return userData?.role === ROLES.ORGANIZER || userData?.isAdmin === true;
}

// ==========================================
// CHECK IF USER IS SCANNER
// ==========================================

export async function isScanner() {
    const userData = await getCurrentUserData();
    return userData?.role === ROLES.SCANNER || userData?.isAdmin === true;
}

// ==========================================
// CHECK IF USER CAN MANAGE EVENT
// ==========================================

export async function canManageEvent(eventCreatorId) {
    if (!auth.currentUser) {
        return false;
    }

    const userData = await getCurrentUserData();

    // Admin can manage all events
    if (userData?.isAdmin === true) {
        return true;
    }

    // Organizer can manage only their own events
    return userData?.role === ROLES.ORGANIZER && auth.currentUser.uid === eventCreatorId;
}

// ==========================================
// CHECK IF USER CAN SCAN TICKETS
// ==========================================

export async function canScanTickets(eventCreatorId) {
    if (!auth.currentUser) {
        return false;
    }

    const userData = await getCurrentUserData();

    // Admin can scan all tickets
    if (userData?.isAdmin === true) {
        return true;
    }

    // Scanner can scan tickets for their assigned events
    if (userData?.role === ROLES.SCANNER) {
        return true;
    }

    // Event creator can scan their own event tickets
    return auth.currentUser.uid === eventCreatorId;
}

// ==========================================
// PERMISSION DEFINITIONS
// ==========================================

const PERMISSIONS = {
    // User permissions
    VIEW_EVENTS: 'view_events',
    LIKE_EVENTS: 'like_events',
    BUY_PRESALES: 'buy_presales',
    VIEW_OWN_PRESALES: 'view_own_presales',
    PROPOSE_EVENT: 'propose_event',
    SUBMIT_SUGGESTION: 'submit_suggestion',

    // Organizer permissions
    CREATE_EVENT: 'create_event',
    MANAGE_OWN_EVENTS: 'manage_own_events',
    VIEW_OWN_STATS: 'view_own_stats',
    SCAN_OWN_TICKETS: 'scan_own_tickets',
    CONFIGURE_STRIPE: 'configure_stripe',

    // Scanner permissions
    SCAN_TICKETS: 'scan_tickets',
    VIEW_SCANNER_PAGE: 'view_scanner_page',

    // Admin permissions
    APPROVE_EVENTS: 'approve_events',
    REJECT_EVENTS: 'reject_events',
    DELETE_ANY_EVENT: 'delete_any_event',
    MANAGE_USERS: 'manage_users',
    MANAGE_PARTNERS: 'manage_partners',
    VIEW_ALL_STATS: 'view_all_stats',
    MANAGE_SUGGESTIONS: 'manage_suggestions',
    FULL_ACCESS: 'full_access'
};

// ==========================================
// ROLE PERMISSION MAP
// ==========================================

const ROLE_PERMISSIONS = {
    [ROLES.USER]: [
        PERMISSIONS.VIEW_EVENTS,
        PERMISSIONS.LIKE_EVENTS,
        PERMISSIONS.BUY_PRESALES,
        PERMISSIONS.VIEW_OWN_PRESALES,
        PERMISSIONS.PROPOSE_EVENT,
        PERMISSIONS.SUBMIT_SUGGESTION
    ],
    [ROLES.ORGANIZER]: [
        PERMISSIONS.VIEW_EVENTS,
        PERMISSIONS.LIKE_EVENTS,
        PERMISSIONS.BUY_PRESALES,
        PERMISSIONS.VIEW_OWN_PRESALES,
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.MANAGE_OWN_EVENTS,
        PERMISSIONS.VIEW_OWN_STATS,
        PERMISSIONS.SCAN_OWN_TICKETS,
        PERMISSIONS.CONFIGURE_STRIPE,
        PERMISSIONS.SUBMIT_SUGGESTION
    ],
    [ROLES.SCANNER]: [
        PERMISSIONS.VIEW_EVENTS,
        PERMISSIONS.SCAN_TICKETS,
        PERMISSIONS.VIEW_SCANNER_PAGE
    ],
    [ROLES.ADMIN]: [
        PERMISSIONS.FULL_ACCESS,
        PERMISSIONS.VIEW_EVENTS,
        PERMISSIONS.LIKE_EVENTS,
        PERMISSIONS.BUY_PRESALES,
        PERMISSIONS.VIEW_OWN_PRESALES,
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.MANAGE_OWN_EVENTS,
        PERMISSIONS.APPROVE_EVENTS,
        PERMISSIONS.REJECT_EVENTS,
        PERMISSIONS.DELETE_ANY_EVENT,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_PARTNERS,
        PERMISSIONS.VIEW_ALL_STATS,
        PERMISSIONS.SCAN_TICKETS,
        PERMISSIONS.VIEW_SCANNER_PAGE,
        PERMISSIONS.MANAGE_SUGGESTIONS
    ]
};

// ==========================================
// CHECK IF USER HAS PERMISSION
// ==========================================

export async function hasPermission(permission) {
    const userData = await getCurrentUserData();

    if (!userData) {
        return false;
    }

    const userRole = userData.role || ROLES.USER;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    // Admin with isAdmin flag has full access
    if (userData.isAdmin === true) {
        return true;
    }

    return rolePermissions.includes(permission) || rolePermissions.includes(PERMISSIONS.FULL_ACCESS);
}

// ==========================================
// GET USER PERMISSIONS
// ==========================================

export async function getUserPermissions() {
    if (permissionsCache) {
        return permissionsCache;
    }

    const userData = await getCurrentUserData();

    if (!userData) {
        return [];
    }

    const userRole = userData.role || ROLES.USER;

    // Admin with isAdmin flag gets all permissions
    if (userData.isAdmin === true) {
        permissionsCache = ROLE_PERMISSIONS[ROLES.ADMIN];
        return permissionsCache;
    }

    permissionsCache = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[ROLES.USER];
    return permissionsCache;
}

// ==========================================
// REDIRECT IF NO PERMISSION
// ==========================================

export async function requirePermission(permission, redirectUrl = '/index.html') {
    const allowed = await hasPermission(permission);

    if (!allowed) {
        console.warn(`Permission denied: ${permission}`);
        window.location.href = redirectUrl;
        return false;
    }

    return true;
}

// ==========================================
// REDIRECT IF NOT ADMIN
// ==========================================

export async function requireAdmin(redirectUrl = '/index.html') {
    const admin = await isAdmin();

    if (!admin) {
        console.warn('Admin access required');
        window.location.href = redirectUrl;
        return false;
    }

    return true;
}

// ==========================================
// REDIRECT IF NOT ORGANIZER
// ==========================================

export async function requireOrganizer(redirectUrl = '/index.html') {
    const organizer = await isOrganizer();

    if (!organizer) {
        console.warn('Organizer access required');
        window.location.href = redirectUrl;
        return false;
    }

    return true;
}

// ==========================================
// REDIRECT IF NOT SCANNER
// ==========================================

export async function requireScanner(redirectUrl = '/index.html') {
    const scanner = await isScanner();

    if (!scanner) {
        console.warn('Scanner access required');
        window.location.href = redirectUrl;
        return false;
    }

    return true;
}

// ==========================================
// EXPORT PERMISSIONS CONSTANTS
// ==========================================

export { PERMISSIONS };
