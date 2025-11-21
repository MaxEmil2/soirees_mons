/*
 * AUTHENTICATION SYSTEM
 * Manages user authentication with role-based access
 */

import {
    auth,
    db,
    googleProvider,
    COLLECTIONS,
    ROLES
} from './firebase-config.js';

import {
    signInWithEmailAndPassword,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { clearPermissionsCache } from './permissions.js';

// ==========================================
// AUTH STATE OBSERVERS
// ==========================================

const authStateCallbacks = [];

export function onAuthChange(callback) {
    authStateCallbacks.push(callback);
}

// Setup auth state observer
onAuthStateChanged(auth, async (user) => {
    // Clear permissions cache when auth state changes
    clearPermissionsCache();

    // Call all registered callbacks
    for (const callback of authStateCallbacks) {
        await callback(user);
    }
});

// ==========================================
// SIGN UP WITH EMAIL
// ==========================================

export async function signUpWithEmail(email, password, displayName) {
    try {
        // Input validation
        if (!email || !password || !displayName) {
            throw new Error('All fields are required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, {
            displayName: displayName
        });

        // Create user document in Firestore
        await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            photoURL: user.photoURL || null,
            role: ROLES.USER,
            isAdmin: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            emailVerified: user.emailVerified,
            stripeAccountId: null,
            stripeAccountStatus: null,
            stripeCanReceivePayments: false
        });

        return {
            success: true,
            user: user
        };
    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// SIGN IN WITH EMAIL
// ==========================================

export async function signInWithEmail(email, password) {
    try {
        // Input validation
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// SIGN IN WITH GOOGLE
// ==========================================

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user document exists
        const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // Create new user document for Google sign-in
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: ROLES.USER,
                isAdmin: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                emailVerified: user.emailVerified,
                stripeAccountId: null,
                stripeAccountStatus: null,
                stripeCanReceivePayments: false,
                authProvider: 'google'
            });
        } else {
            // Update existing user with latest Google info
            await updateDoc(userDocRef, {
                photoURL: user.photoURL,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                updatedAt: serverTimestamp()
            });
        }

        return {
            success: true,
            user: user
        };
    } catch (error) {
        console.error('Google sign in error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// SIGN OUT
// ==========================================

export async function signOutUser() {
    try {
        await signOut(auth);
        clearPermissionsCache();
        return {
            success: true
        };
    } catch (error) {
        console.error('Sign out error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// RESET PASSWORD
// ==========================================

export async function resetPassword(email) {
    try {
        if (!email) {
            throw new Error('Email is required');
        }

        await sendPasswordResetEmail(auth, email);

        return {
            success: true,
            message: 'Password reset email sent successfully'
        };
    } catch (error) {
        console.error('Password reset error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// UPDATE USER PROFILE
// ==========================================

export async function updateUserProfile(updates) {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is signed in');
        }

        const uid = auth.currentUser.uid;
        const userDocRef = doc(db, COLLECTIONS.USERS, uid);

        // Update Firebase Auth profile
        const authUpdates = {};
        if (updates.displayName !== undefined) {
            authUpdates.displayName = updates.displayName;
        }
        if (updates.photoURL !== undefined) {
            authUpdates.photoURL = updates.photoURL;
        }

        if (Object.keys(authUpdates).length > 0) {
            await updateProfile(auth.currentUser, authUpdates);
        }

        // Update email if changed
        if (updates.email && updates.email !== auth.currentUser.email) {
            await updateEmail(auth.currentUser, updates.email);
        }

        // Update Firestore document
        const firestoreUpdates = {
            ...updates,
            updatedAt: serverTimestamp()
        };

        // Remove sensitive fields that shouldn't be updated directly
        delete firestoreUpdates.role;
        delete firestoreUpdates.isAdmin;
        delete firestoreUpdates.uid;

        await updateDoc(userDocRef, firestoreUpdates);

        clearPermissionsCache();

        return {
            success: true,
            message: 'Profile updated successfully'
        };
    } catch (error) {
        console.error('Profile update error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// CHANGE PASSWORD
// ==========================================

export async function changePassword(newPassword) {
    try {
        if (!auth.currentUser) {
            throw new Error('No user is signed in');
        }

        if (newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        await updatePassword(auth.currentUser, newPassword);

        return {
            success: true,
            message: 'Password changed successfully'
        };
    } catch (error) {
        console.error('Password change error:', error);
        return {
            success: false,
            error: getFriendlyErrorMessage(error)
        };
    }
}

// ==========================================
// GET CURRENT USER
// ==========================================

export function getCurrentUser() {
    return auth.currentUser;
}

// ==========================================
// CHECK IF USER IS AUTHENTICATED
// ==========================================

export function isAuthenticated() {
    return !!auth.currentUser;
}

// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

export function requireAuth(redirectUrl = '/login.html') {
    if (!isAuthenticated()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// ==========================================
// FRIENDLY ERROR MESSAGES
// ==========================================

function getFriendlyErrorMessage(error) {
    const errorCode = error.code;
    const errorMessages = {
        // Auth errors
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/weak-password': 'Password is too weak',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'auth/popup-closed-by-user': 'Sign in cancelled',
        'auth/cancelled-popup-request': 'Sign in cancelled',
        'auth/requires-recent-login': 'Please sign in again to complete this action',

        // Firestore errors
        'permission-denied': 'You do not have permission to perform this action',
        'not-found': 'Resource not found',
        'already-exists': 'Resource already exists',
        'unauthenticated': 'Please sign in to continue'
    };

    return errorMessages[errorCode] || error.message || 'An error occurred. Please try again';
}

// ==========================================
// INPUT SANITIZATION
// ==========================================

export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }

    // Remove HTML tags and script content
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}

// ==========================================
// VALIDATE EMAIL
// ==========================================

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==========================================
// VALIDATE PASSWORD
// ==========================================

export function validatePassword(password) {
    return {
        isValid: password.length >= 6,
        errors: password.length < 6 ? ['Password must be at least 6 characters'] : []
    };
}

// ==========================================
// EXPORT AUTH INSTANCE
// ==========================================

export { auth };
