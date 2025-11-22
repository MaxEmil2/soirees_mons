/*
 * LIKES SERVICE
 * Handles event likes with real-time updates
 */

import { db, auth, COLLECTIONS } from '../core/firebase-config.js';
import {
    collection,
    query,
    where,
    addDoc,
    deleteDoc,
    getDocs,
    doc,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Helper function to convert various date formats to Date object
function convertToDate(value) {
    if (!value) return null;

    // If it's already a Date object
    if (value instanceof Date) return value;

    // If it's a Firestore Timestamp
    if (value && typeof value.toDate === 'function') {
        return value.toDate();
    }

    // If it's a string or number, try to parse it
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    return null;
}

// ==========================================
// CACHE FOR LIKES
// ==========================================

const likesCache = new Map(); // eventId -> likes data

// ==========================================
// GET LIKES FOR EVENT
// ==========================================

export async function getEventLikes(eventId) {
    try {
        const likesQuery = query(
            collection(db, COLLECTIONS.LIKES),
            where('eventId', '==', eventId)
        );

        const snapshot = await getDocs(likesQuery);

        const likes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: convertToDate(data.createdAt)
            };
        });

        // Update cache
        likesCache.set(eventId, likes);

        return {
            success: true,
            likes: likes,
            count: likes.length
        };

    } catch (error) {
        console.error('Error fetching likes:', error);
        return {
            success: false,
            error: error.message,
            likes: [],
            count: 0
        };
    }
}

// ==========================================
// GET LIKES COUNT
// ==========================================

export async function getEventLikesCount(eventId) {
    try {
        // Try cache first
        if (likesCache.has(eventId)) {
            return {
                success: true,
                count: likesCache.get(eventId).length,
                fromCache: true
            };
        }

        const result = await getEventLikes(eventId);
        return {
            success: result.success,
            count: result.count,
            fromCache: false
        };

    } catch (error) {
        console.error('Error getting likes count:', error);
        return {
            success: false,
            count: 0
        };
    }
}

// ==========================================
// CHECK IF USER LIKED EVENT
// ==========================================

export async function hasUserLiked(eventId, userId) {
    try {
        if (!userId) return false;

        const likesQuery = query(
            collection(db, COLLECTIONS.LIKES),
            where('eventId', '==', eventId),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(likesQuery);

        return !snapshot.empty;

    } catch (error) {
        console.error('Error checking if user liked:', error);
        return false;
    }
}

// ==========================================
// LIKE EVENT
// ==========================================

export async function likeEvent(eventId, isPublic = true) {
    try {
        if (!auth.currentUser) {
            return {
                success: false,
                error: 'You must be signed in to like events'
            };
        }

        const userId = auth.currentUser.uid;
        const userEmail = auth.currentUser.email;
        const userPhotoURL = auth.currentUser.photoURL;

        // Check if already liked
        const alreadyLiked = await hasUserLiked(eventId, userId);
        if (alreadyLiked) {
            return {
                success: false,
                error: 'You already liked this event'
            };
        }

        // Create like document
        await addDoc(collection(db, COLLECTIONS.LIKES), {
            eventId,
            userId,
            userEmail,
            userPhotoURL: userPhotoURL || null,
            isPublic,
            createdAt: serverTimestamp()
        });

        // Clear cache for this event
        likesCache.delete(eventId);

        return {
            success: true,
            message: 'Event liked successfully'
        };

    } catch (error) {
        console.error('Error liking event:', error);
        return {
            success: false,
            error: error.message || 'Failed to like event'
        };
    }
}

// ==========================================
// UNLIKE EVENT
// ==========================================

export async function unlikeEvent(eventId) {
    try {
        if (!auth.currentUser) {
            return {
                success: false,
                error: 'You must be signed in to unlike events'
            };
        }

        const userId = auth.currentUser.uid;

        // Find the like document
        const likesQuery = query(
            collection(db, COLLECTIONS.LIKES),
            where('eventId', '==', eventId),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(likesQuery);

        if (snapshot.empty) {
            return {
                success: false,
                error: 'You have not liked this event'
            };
        }

        // Delete the like document
        const likeDoc = snapshot.docs[0];
        await deleteDoc(doc(db, COLLECTIONS.LIKES, likeDoc.id));

        // Clear cache for this event
        likesCache.delete(eventId);

        return {
            success: true,
            message: 'Event unliked successfully'
        };

    } catch (error) {
        console.error('Error unliking event:', error);
        return {
            success: false,
            error: error.message || 'Failed to unlike event'
        };
    }
}

// ==========================================
// TOGGLE LIKE
// ==========================================

export async function toggleLike(eventId, isPublic = true) {
    try {
        if (!auth.currentUser) {
            return {
                success: false,
                error: 'You must be signed in to like events'
            };
        }

        const userId = auth.currentUser.uid;
        const alreadyLiked = await hasUserLiked(eventId, userId);

        if (alreadyLiked) {
            return await unlikeEvent(eventId);
        } else {
            return await likeEvent(eventId, isPublic);
        }

    } catch (error) {
        console.error('Error toggling like:', error);
        return {
            success: false,
            error: error.message || 'Failed to toggle like'
        };
    }
}

// ==========================================
// LISTEN TO EVENT LIKES (REAL-TIME)
// ==========================================

export function listenToEventLikes(eventId, callback) {
    const likesQuery = query(
        collection(db, COLLECTIONS.LIKES),
        where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(
        likesQuery,
        (snapshot) => {
            const likes = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: convertToDate(data.createdAt)
                };
            });

            // Update cache
            likesCache.set(eventId, likes);

            callback({
                success: true,
                likes: likes,
                count: likes.length
            });
        },
        (error) => {
            console.error('Error listening to likes:', error);
            callback({
                success: false,
                error: error.message,
                likes: [],
                count: 0
            });
        }
    );

    return unsubscribe;
}

// ==========================================
// GET PUBLIC LIKERS (FOR DISPLAY)
// ==========================================

export function getPublicLikers(likes, maxCount = 3) {
    return likes
        .filter(like => like.isPublic && like.userPhotoURL)
        .slice(0, maxCount);
}

// ==========================================
// FORMAT LIKES FOR DISPLAY
// ==========================================

export function formatLikesDisplay(likes, maxPhotos = 3) {
    const publicLikers = getPublicLikers(likes, maxPhotos);
    const totalCount = likes.length;
    const remainingCount = Math.max(0, totalCount - publicLikers.length);

    return {
        photos: publicLikers.map(like => ({
            url: like.userPhotoURL,
            email: like.userEmail
        })),
        totalCount,
        remainingCount,
        hasMore: remainingCount > 0
    };
}

// ==========================================
// GET USER'S LIKED EVENTS
// ==========================================

export async function getUserLikedEvents(userId) {
    try {
        if (!userId) {
            return {
                success: false,
                error: 'User ID required',
                eventIds: []
            };
        }

        const likesQuery = query(
            collection(db, COLLECTIONS.LIKES),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(likesQuery);

        const eventIds = snapshot.docs.map(doc => doc.data().eventId);

        return {
            success: true,
            eventIds: eventIds
        };

    } catch (error) {
        console.error('Error fetching user liked events:', error);
        return {
            success: false,
            error: error.message,
            eventIds: []
        };
    }
}

// ==========================================
// CLEAR CACHE
// ==========================================

export function clearLikesCache() {
    likesCache.clear();
}

// ==========================================
// EXPORT
// ==========================================

export default {
    getEventLikes,
    getEventLikesCount,
    hasUserLiked,
    likeEvent,
    unlikeEvent,
    toggleLike,
    listenToEventLikes,
    getPublicLikers,
    formatLikesDisplay,
    getUserLikedEvents,
    clearLikesCache
};
