/*
 * INDEX PAGE - OPTIMIZED JAVASCRIPT
 * Ultra-fast, secure, professional event listing
 */

// ==========================================
// IMPORTS
// ==========================================

import { auth, onAuthChange, getCurrentUser } from '../core/auth.js';
import { isAdmin, hasPermission, PERMISSIONS, getCurrentUserData } from '../core/permissions.js';
import {
    getApprovedEvents,
    listenToEvents,
    createEvent,
    deleteEvent,
    formatEventDate,
    formatEventPrice,
    filterEvents,
    sortEvents
} from '../services/events-service.js';
import {
    toggleLike,
    getEventLikes,
    formatLikesDisplay,
    listenToEventLikes,
    hasUserLiked
} from '../services/likes-service.js';
import Modal, { showAlert, showConfirm, showError, showSuccess, showLoading } from '../components/modal.js';
import { setupLazyLoading, compressEventImage, previewImage, validateImage } from '../components/image-optimizer.js';
import { storage } from '../core/firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// ==========================================
// STATE
// ==========================================

const state = {
    events: [],
    filteredEvents: [],
    currentFilter: 'all',
    isLoading: false,
    currentUser: null,
    userLikedEvents: new Set(),
    eventListeners: new Map(),
    createEventModal: null
};

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Soirées Mons...');

    // Setup lazy loading
    setupLazyLoading();

    // Setup auth listener
    setupAuthListener();

    // Load events
    await loadEvents();

    // Setup event listeners
    setupEventListeners();

    // Setup mobile menu
    setupMobileMenu();

    console.log('✅ Initialization complete!');
});

// ==========================================
// AUTH LISTENER
// ==========================================

function setupAuthListener() {
    onAuthChange(async (user) => {
        state.currentUser = user;

        if (user) {
            console.log('👤 User signed in:', user.email);

            // Get user data with role
            const userData = await getCurrentUserData();
            console.log('📋 User role:', userData?.role);

            // Update UI
            updateAuthUI(true, user, userData);

            // Load user's liked events
            await loadUserLikes();
        } else {
            console.log('👤 User signed out');
            updateAuthUI(false);
            state.userLikedEvents.clear();
        }

        // Re-render events to update like states
        renderEvents(state.filteredEvents);
    });
}

// ==========================================
// UPDATE AUTH UI
// ==========================================

function updateAuthUI(isAuthenticated, user = null, userData = null) {
    const signupBtn = document.getElementById('btn-signup');
    const authConnected = document.getElementById('nav-auth-connected');
    const addEventBtn = document.getElementById('btn-add-event');
    const userAvatar = document.getElementById('user-avatar');
    const userAvatarMobile = document.getElementById('user-avatar-mobile');

    if (isAuthenticated && user) {
        // Hide signup button
        if (signupBtn) signupBtn.style.display = 'none';

        // Show connected UI
        if (authConnected) authConnected.style.display = 'flex';

        // Update avatar
        const photoURL = user.photoURL || getDefaultAvatar(user.email);
        if (userAvatar) userAvatar.src = photoURL;
        if (userAvatarMobile) userAvatarMobile.src = photoURL;

        // Show/hide add event button based on permissions
        if (addEventBtn) {
            hasPermission(PERMISSIONS.CREATE_EVENT).then(canCreate => {
                addEventBtn.style.display = canCreate ? 'flex' : 'none';
            });
        }
    } else {
        // Show signup button
        if (signupBtn) signupBtn.style.display = 'inline-block';

        // Hide connected UI
        if (authConnected) authConnected.style.display = 'none';

        // Hide add event button
        if (addEventBtn) addEventBtn.style.display = 'none';
    }
}

// ==========================================
// LOAD EVENTS
// ==========================================

async function loadEvents() {
    try {
        state.isLoading = true;
        showLoader();

        console.log('📡 Loading events...');

        // Get events with caching
        const result = await getApprovedEvents({ useCache: true });

        if (result.success) {
            state.events = result.events;

            // Sort by priority first, then by date
            state.events = sortEvents(state.events, 'priority');

            console.log(`✅ Loaded ${state.events.length} events${result.fromCache ? ' (from cache)' : ''}`);

            // Apply current filter
            applyFilter(state.currentFilter);
        } else {
            console.error('❌ Failed to load events:', result.error);
            showError(result.error || 'Failed to load events');
        }

    } catch (error) {
        console.error('❌ Error loading events:', error);
        showError('An error occurred while loading events');
    } finally {
        state.isLoading = false;
        hideLoader();
    }
}

// ==========================================
// LOAD USER LIKES
// ==========================================

async function loadUserLikes() {
    if (!state.currentUser) return;

    try {
        const { getUserLikedEvents } = await import('../services/likes-service.js');
        const result = await getUserLikedEvents(state.currentUser.uid);

        if (result.success) {
            state.userLikedEvents = new Set(result.eventIds);
            console.log(`❤️ User has liked ${state.userLikedEvents.size} events`);
        }
    } catch (error) {
        console.error('Error loading user likes:', error);
    }
}

// ==========================================
// APPLY FILTER
// ==========================================

function applyFilter(filter) {
    state.currentFilter = filter;

    switch (filter) {
        case 'all':
            state.filteredEvents = state.events;
            break;

        case 'liked':
            if (!state.currentUser) {
                showAlert('Please sign in to view your liked events');
                state.currentFilter = 'all';
                updateActiveTab('all');
                state.filteredEvents = state.events;
            } else {
                state.filteredEvents = state.events.filter(event =>
                    state.userLikedEvents.has(event.id)
                );
            }
            break;

        case 'presales':
            state.filteredEvents = state.events.filter(event => event.presales === true);
            break;

        case 'free':
            state.filteredEvents = state.events.filter(event => event.price === 0);
            break;

        default:
            state.filteredEvents = state.events;
    }

    console.log(`🔍 Filter "${filter}": ${state.filteredEvents.length} events`);

    renderEvents(state.filteredEvents);
    updateActiveTab(filter);
}

// ==========================================
// UPDATE ACTIVE TAB
// ==========================================

function updateActiveTab(filter) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        const tabFilter = tab.getAttribute('data-filter');
        if (tabFilter === filter) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// ==========================================
// RENDER EVENTS
// ==========================================

function renderEvents(events) {
    const container = document.getElementById('events-grid');
    const countElement = document.getElementById('events-count');

    if (!container) return;

    // Update count
    if (countElement) {
        countElement.textContent = `${events.length} événement${events.length !== 1 ? 's' : ''}`;
    }

    // Clear container
    container.innerHTML = '';

    // Empty state
    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </div>
                <h3 class="empty-state-title">Aucun événement trouvé</h3>
                <p class="empty-state-description">
                    ${state.currentFilter === 'liked' ? 'Vous n\'avez pas encore aimé d\'événements' : 'Aucun événement ne correspond à votre filtre'}
                </p>
            </div>
        `;
        return;
    }

    // Render event cards
    events.forEach((event, index) => {
        const card = createEventCard(event, index);
        container.appendChild(card);
    });

    // Re-setup lazy loading for new images
    setupLazyLoading();

    // Load likes for each event
    events.forEach(event => {
        loadEventLikes(event.id);
    });
}

// ==========================================
// CREATE EVENT CARD
// ==========================================

function createEventCard(event, index) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.animationDelay = `${index * 50}ms`;

    const isLiked = state.userLikedEvents.has(event.id);
    const imageUrl = event.imageURL || '/assets/images/default-event.jpg';

    card.innerHTML = `
        <div class="event-card-image-wrapper">
            <img
                data-src="${imageUrl}"
                alt="${event.name}"
                class="event-card-image"
                loading="lazy"
            >

            ${event.isPriority ? '<div class="priority-badge">⭐ Priorité</div>' : ''}
            ${event.presales ? `
                <div class="presale-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Prévente
                </div>
            ` : ''}

            <div class="likes-container">
                <div class="likers-photos" id="likers-${event.id}">
                    <!-- Populated dynamically -->
                </div>
                <button
                    class="like-button ${isLiked ? 'liked' : ''}"
                    data-event-id="${event.id}"
                    aria-label="Like this event"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ${isLiked ? 'fill="currentColor"' : 'fill="none"'} stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="event-card-content">
            <h3 class="event-card-title">${event.name}</h3>

            <div class="event-card-meta">
                <div class="event-card-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatEventDate(event.date)}
                </div>

                <div class="event-card-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${event.location}
                </div>

                ${event.age > 0 ? `
                    <div class="event-card-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${event.age}+
                    </div>
                ` : ''}
            </div>

            ${event.description ? `
                <p class="event-card-description">${event.description}</p>
            ` : ''}

            <div class="event-card-footer">
                <div class="event-card-price ${event.price === 0 ? 'free' : ''}">
                    ${formatEventPrice(event.price)}
                </div>
                ${event.link ? `
                    <a href="${event.link}" target="_blank" class="btn btn-sm btn-primary">
                        Plus d'infos
                    </a>
                ` : ''}
            </div>
        </div>
    `;

    // Add click listener for like button
    const likeBtn = card.querySelector('.like-button');
    if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleLike(event.id, likeBtn);
        });
    }

    return card;
}

// ==========================================
// LOAD EVENT LIKES
// ==========================================

async function loadEventLikes(eventId) {
    try {
        const result = await getEventLikes(eventId);

        if (result.success) {
            updateLikesDisplay(eventId, result.likes);

            // Listen to real-time updates
            if (!state.eventListeners.has(eventId)) {
                const unsubscribe = listenToEventLikes(eventId, (result) => {
                    if (result.success) {
                        updateLikesDisplay(eventId, result.likes);
                    }
                });
                state.eventListeners.set(eventId, unsubscribe);
            }
        }
    } catch (error) {
        console.error('Error loading likes for event:', eventId, error);
    }
}

// ==========================================
// UPDATE LIKES DISPLAY
// ==========================================

function updateLikesDisplay(eventId, likes) {
    const container = document.getElementById(`likers-${eventId}`);
    if (!container) return;

    const display = formatLikesDisplay(likes, 3);

    let html = '';

    // Show photos
    display.photos.forEach((photo, index) => {
        html += `
            <img
                src="${photo.url}"
                alt="${photo.email}"
                class="liker-photo"
                style="z-index: ${10 - index};"
            >
        `;
    });

    // Show count if more likes
    if (display.totalCount > 0) {
        if (display.hasMore) {
            html += `<span class="likes-count">+${display.remainingCount}</span>`;
        } else if (display.photos.length === 0) {
            html += `<span class="likes-count">${display.totalCount}</span>`;
        }
    }

    container.innerHTML = html;
}

// ==========================================
// HANDLE LIKE
// ==========================================

async function handleLike(eventId, button) {
    if (!state.currentUser) {
        showAlert('Connectez-vous pour aimer cet événement');
        return;
    }

    // Disable button during request
    button.disabled = true;

    try {
        // Add animation
        button.classList.add('animating');

        const result = await toggleLike(eventId, true); // true = public like

        if (result.success) {
            // Update local state
            const wasLiked = state.userLikedEvents.has(eventId);

            if (wasLiked) {
                state.userLikedEvents.delete(eventId);
                button.classList.remove('liked');
                button.querySelector('svg').setAttribute('fill', 'none');
            } else {
                state.userLikedEvents.add(eventId);
                button.classList.add('liked');
                button.querySelector('svg').setAttribute('fill', 'currentColor');
            }

            // If we're on "liked" filter, re-filter
            if (state.currentFilter === 'liked') {
                applyFilter('liked');
            }
        } else {
            showError(result.error || 'Failed to like event');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showError('An error occurred');
    } finally {
        button.disabled = false;
        setTimeout(() => button.classList.remove('animating'), 400);
    }
}

// ==========================================
// SETUP EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Tab filters
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');
            applyFilter(filter);
        });
    });

    // Add event button
    const addEventBtn = document.getElementById('btn-add-event');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', showCreateEventModal);
    }

    // Suggestions button
    const suggestionsBtn = document.getElementById('btn-suggestions');
    if (suggestionsBtn) {
        suggestionsBtn.addEventListener('click', showSuggestionsModal);
    }

    // User dropdown toggle
    const userAvatarBtn = document.querySelector('.user-avatar-btn');
    if (userAvatarBtn) {
        userAvatarBtn.addEventListener('click', toggleUserDropdown);
    }

    // Logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ==========================================
// SHOW CREATE EVENT MODAL
// ==========================================

function showCreateEventModal() {
    // Modal content will be added in next iteration
    showAlert('Create event modal coming soon!', 'Add Event');
}

// ==========================================
// SHOW SUGGESTIONS MODAL
// ==========================================

function showSuggestionsModal() {
    showAlert('Suggestions feature coming soon!', 'Suggestions');
}

// ==========================================
// TOGGLE USER DROPDOWN
// ==========================================

function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// ==========================================
// HANDLE LOGOUT
// ==========================================

async function handleLogout() {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir vous déconnecter ?', 'Déconnexion');

    if (confirmed) {
        const { signOutUser } = await import('../core/auth.js');
        const result = await signOutUser();

        if (result.success) {
            showSuccess('Déconnexion réussie !');
            // Cleanup listeners
            state.eventListeners.forEach(unsubscribe => unsubscribe());
            state.eventListeners.clear();
        } else {
            showError(result.error || 'Erreur lors de la déconnexion');
        }
    }
}

// ==========================================
// MOBILE MENU
// ==========================================

function setupMobileMenu() {
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const menu = document.querySelector('.mobile-menu');
    const closeBtn = document.querySelector('.mobile-menu-close');

    if (!toggleBtn || !overlay || !menu || !closeBtn) return;

    const openMenu = () => {
        overlay.classList.add('active');
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
        overlay.classList.remove('active');
        menu.classList.remove('active');
        document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
            closeMenu();
        }
    });
}

// ==========================================
// LOADER
// ==========================================

function showLoader() {
    const container = document.getElementById('events-grid');
    if (container) {
        container.innerHTML = `
            <div class="loading-container" style="grid-column: 1 / -1;">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

function hideLoader() {
    // Loader will be removed when events are rendered
}

// ==========================================
// UTILITY
// ==========================================

function getDefaultAvatar(email) {
    // Generate a default avatar based on email
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const initial = email ? email.charAt(0).toUpperCase() : '?';
    const color = colors[email.charCodeAt(0) % colors.length];

    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="${color}"/>
            <text x="50" y="50" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dy=".3em">${initial}</text>
        </svg>
    `)}`;
}

// ==========================================
// CLEANUP ON PAGE UNLOAD
// ==========================================

window.addEventListener('beforeunload', () => {
    // Unsubscribe from all listeners
    state.eventListeners.forEach(unsubscribe => unsubscribe());
    state.eventListeners.clear();
});

// ==========================================
// EXPORT FOR DEBUGGING
// ==========================================

window.soireesDebug = {
    state,
    loadEvents,
    applyFilter,
    renderEvents
};
