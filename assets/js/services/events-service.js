/*
 * EVENTS SERVICE
 * Handles all event-related operations via Cloud Functions
 * Optimized with caching and lazy loading
 */

import { db, functions, COLLECTIONS, EVENT_STATUS } from '../core/firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// ==========================================
// CACHE
// ==========================================

const eventsCache = {
    data: null,
    timestamp: null,
    duration: 5 * 60 * 1000 // 5 minutes
};

function isCacheValid() {
    return eventsCache.data &&
           eventsCache.timestamp &&
           (Date.now() - eventsCache.timestamp) < eventsCache.duration;
}

function updateCache(data) {
    eventsCache.data = data;
    eventsCache.timestamp = Date.now();
}

function clearCache() {
    eventsCache.data = null;
    eventsCache.timestamp = null;
}

// ==========================================
// GET APPROVED EVENTS
// ==========================================

export async function getApprovedEvents(options = {}) {
    try {
        const {
            useCache = true,
            limitCount = 50,
            orderField = 'date',
            orderDirection = 'desc'
        } = options;

        // Try cache first
        if (useCache && isCacheValid()) {
            console.log('✅ Using cached events');
            return {
                success: true,
                events: eventsCache.data,
                fromCache: true
            };
        }

        console.log('📡 Fetching events from Firestore...');

        // Query approved events
        const eventsQuery = query(
            collection(db, COLLECTIONS.EVENTS),
            where('status', '==', EVENT_STATUS.APPROVED),
            orderBy(orderField, orderDirection),
            limit(limitCount)
        );

        const snapshot = await getDocs(eventsQuery);

        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            presalesEndDate: doc.data().presalesEndDate?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate()
        }));

        // Update cache
        updateCache(events);

        return {
            success: true,
            events: events,
            fromCache: false
        };

    } catch (error) {
        console.error('Error fetching events:', error);
        return {
            success: false,
            error: error.message,
            events: []
        };
    }
}

// ==========================================
// GET EVENT BY ID
// ==========================================

export async function getEventById(eventId) {
    try {
        const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));

        if (!eventDoc.exists()) {
            return {
                success: false,
                error: 'Event not found'
            };
        }

        const eventData = eventDoc.data();

        return {
            success: true,
            event: {
                id: eventDoc.id,
                ...eventData,
                date: eventData.date?.toDate(),
                presalesEndDate: eventData.presalesEndDate?.toDate(),
                createdAt: eventData.createdAt?.toDate(),
                approvedAt: eventData.approvedAt?.toDate()
            }
        };

    } catch (error) {
        console.error('Error fetching event:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==========================================
// LISTEN TO EVENTS (REAL-TIME)
// ==========================================

export function listenToEvents(callback, options = {}) {
    const {
        limitCount = 50,
        orderField = 'date',
        orderDirection = 'desc'
    } = options;

    const eventsQuery = query(
        collection(db, COLLECTIONS.EVENTS),
        where('status', '==', EVENT_STATUS.APPROVED),
        orderBy(orderField, orderDirection),
        limit(limitCount)
    );

    const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate(),
                presalesEndDate: doc.data().presalesEndDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                approvedAt: doc.data().approvedAt?.toDate()
            }));

            // Update cache
            updateCache(events);

            callback({
                success: true,
                events: events
            });
        },
        (error) => {
            console.error('Error listening to events:', error);
            callback({
                success: false,
                error: error.message,
                events: []
            });
        }
    );

    return unsubscribe;
}

// ==========================================
// CREATE EVENT (VIA CLOUD FUNCTION)
// ==========================================

export async function createEvent(eventData) {
    try {
        const createEventFunc = httpsCallable(functions, 'createEvent');

        const result = await createEventFunc(eventData);

        // Clear cache since data changed
        clearCache();

        return {
            success: true,
            ...result.data
        };

    } catch (error) {
        console.error('Error creating event:', error);
        return {
            success: false,
            error: error.message || 'Failed to create event'
        };
    }
}

// ==========================================
// UPDATE EVENT (VIA CLOUD FUNCTION)
// ==========================================

export async function updateEvent(eventId, updates) {
    try {
        const updateEventFunc = httpsCallable(functions, 'updateEvent');

        const result = await updateEventFunc({
            eventId,
            updates
        });

        // Clear cache since data changed
        clearCache();

        return {
            success: true,
            ...result.data
        };

    } catch (error) {
        console.error('Error updating event:', error);
        return {
            success: false,
            error: error.message || 'Failed to update event'
        };
    }
}

// ==========================================
// DELETE EVENT (VIA CLOUD FUNCTION)
// ==========================================

export async function deleteEvent(eventId) {
    try {
        const deleteEventFunc = httpsCallable(functions, 'deleteEvent');

        const result = await deleteEventFunc({ eventId });

        // Clear cache since data changed
        clearCache();

        return {
            success: true,
            ...result.data
        };

    } catch (error) {
        console.error('Error deleting event:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete event'
        };
    }
}

// ==========================================
// APPROVE/REJECT EVENT (ADMIN ONLY)
// ==========================================

export async function approveEvent(eventId, action, reason = null) {
    try {
        const approveEventFunc = httpsCallable(functions, 'approveEvent');

        const result = await approveEventFunc({
            eventId,
            action, // 'approve' or 'reject'
            reason
        });

        // Clear cache since data changed
        clearCache();

        return {
            success: true,
            ...result.data
        };

    } catch (error) {
        console.error('Error approving event:', error);
        return {
            success: false,
            error: error.message || 'Failed to process event'
        };
    }
}

// ==========================================
// FILTER EVENTS
// ==========================================

export function filterEvents(events, filters) {
    let filtered = [...events];

    // Filter by search term
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(event =>
            event.name.toLowerCase().includes(searchLower) ||
            event.description.toLowerCase().includes(searchLower) ||
            event.location.toLowerCase().includes(searchLower)
        );
    }

    // Filter by date range
    if (filters.dateFrom) {
        filtered = filtered.filter(event => event.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
        filtered = filtered.filter(event => event.date <= filters.dateTo);
    }

    // Filter by price range
    if (filters.priceMin !== undefined) {
        filtered = filtered.filter(event => event.price >= filters.priceMin);
    }

    if (filters.priceMax !== undefined) {
        filtered = filtered.filter(event => event.price <= filters.priceMax);
    }

    // Filter by presales
    if (filters.presalesOnly) {
        filtered = filtered.filter(event => event.presales === true);
    }

    // Filter by age
    if (filters.minAge !== undefined) {
        filtered = filtered.filter(event => event.age >= filters.minAge);
    }

    return filtered;
}

// ==========================================
// SORT EVENTS
// ==========================================

export function sortEvents(events, sortBy) {
    const sorted = [...events];

    switch (sortBy) {
        case 'date-asc':
            return sorted.sort((a, b) => a.date - b.date);

        case 'date-desc':
            return sorted.sort((a, b) => b.date - a.date);

        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);

        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);

        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));

        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));

        case 'priority':
            return sorted.sort((a, b) => {
                if (a.isPriority && !b.isPriority) return -1;
                if (!a.isPriority && b.isPriority) return 1;
                return b.date - a.date; // Then by date
            });

        default:
            return sorted;
    }
}

// ==========================================
// FORMAT EVENT DATA
// ==========================================

export function formatEventDate(date) {
    if (!(date instanceof Date)) return '';

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('fr-FR', options);
}

export function formatEventPrice(price) {
    if (price === 0) {
        return 'Gratuit';
    }
    return `${price}€`;
}

export function isEventUpcoming(event) {
    return event.date > new Date();
}

export function isEventPast(event) {
    return event.date <= new Date();
}

export function canBuyPresale(event) {
    if (!event.presales) return false;
    if (!event.presalesEndDate) return true;
    return new Date() <= event.presalesEndDate;
}

// ==========================================
// EXPORT
// ==========================================

export default {
    getApprovedEvents,
    getEventById,
    listenToEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    approveEvent,
    filterEvents,
    sortEvents,
    formatEventDate,
    formatEventPrice,
    isEventUpcoming,
    isEventPast,
    canBuyPresale,
    clearCache
};
