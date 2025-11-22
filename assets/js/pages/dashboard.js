/*
 * DASHBOARD PAGE - OPTIMIZED JAVASCRIPT
 * User account management with role-based features
 */

// ==========================================
// IMPORTS
// ==========================================

import { auth, storage, onAuthChange, updateUserProfile, changePassword, getCurrentUser } from '../core/auth.js';
import { getUserRole, isAdmin, isOrganizer, getCurrentUserData } from '../core/permissions.js';
import Modal, { showAlert, showConfirm, showError, showSuccess, showLoading } from '../components/modal.js';
import { compressProfilePhoto, previewImage, validateImage } from '../components/image-optimizer.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// ==========================================
// STATE
// ==========================================

const state = {
    user: null,
    userData: null,
    stats: {
        eventsCreated: 0,
        presalesSold: 0,
        totalRevenue: 0,
        likesReceived: 0
    },
    isUpdating: false
};

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Dashboard...');

    // Check authentication
    setupAuthListener();

    // Setup event listeners
    setupEventListeners();

    console.log('✅ Dashboard initialized!');
});

// ==========================================
// AUTH LISTENER
// ==========================================

function setupAuthListener() {
    onAuthChange(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            console.log('❌ Not authenticated, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        state.user = user;
        console.log('👤 User authenticated:', user.email);

        // Hide loading, show content
        hideDashboardLoading();

        // Load user data
        await loadUserData();

        // Render profile
        renderProfile();

        // Load stats (if organizer or admin)
        const role = await getUserRole();
        if (role === 'organizer' || role === 'admin') {
            await loadStats();
            renderStats();
        }
    });
}

// ==========================================
// LOAD USER DATA
// ==========================================

async function loadUserData() {
    try {
        const userData = await getCurrentUserData();

        if (userData) {
            state.userData = userData;
            console.log('📋 User data loaded:', userData.role);
        } else {
            console.warn('⚠️ User data not found in Firestore');
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

// ==========================================
// LOAD STATS
// ==========================================

async function loadStats() {
    try {
        // TODO: Call Cloud Function to get stats
        // For now, using mock data
        state.stats = {
            eventsCreated: 12,
            presalesSold: 247,
            totalRevenue: 3542.50,
            likesReceived: 1834
        };

        console.log('📊 Stats loaded');
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

// ==========================================
// RENDER PROFILE
// ==========================================

function renderProfile() {
    const { user, userData } = state;

    // Avatar
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) {
        avatarImg.src = user.photoURL || getDefaultAvatar(user.email);
    }

    // Name
    const nameElement = document.getElementById('profile-name');
    if (nameElement) {
        nameElement.textContent = user.displayName || 'Utilisateur';
    }

    // Email
    const emailElement = document.getElementById('profile-email');
    if (emailElement) {
        emailElement.textContent = user.email;
    }

    // Role
    const roleElement = document.getElementById('profile-role');
    if (roleElement && userData) {
        const role = userData.role || 'user';
        roleElement.className = `profile-role ${role}`;
        roleElement.innerHTML = `
            ${getRoleIcon(role)}
            ${getRoleLabel(role)}
        `;
    }

    // Form fields
    const nameInput = document.getElementById('input-name');
    if (nameInput) nameInput.value = user.displayName || '';

    const emailInput = document.getElementById('input-email');
    if (emailInput) emailInput.value = user.email || '';

    // Show/hide sections based on role
    if (userData) {
        updateRoleBasedUI(userData.role);
    }
}

// ==========================================
// RENDER STATS
// ==========================================

function renderStats() {
    const { stats } = state;

    // Events created
    const eventsElement = document.getElementById('stat-events');
    if (eventsElement) eventsElement.textContent = stats.eventsCreated;

    // Presales sold
    const presalesElement = document.getElementById('stat-presales');
    if (presalesElement) presalesElement.textContent = stats.presalesSold;

    // Total revenue
    const revenueElement = document.getElementById('stat-revenue');
    if (revenueElement) revenueElement.textContent = `€${stats.totalRevenue.toFixed(2)}`;

    // Likes received
    const likesElement = document.getElementById('stat-likes');
    if (likesElement) likesElement.textContent = stats.likesReceived;

    // Show stats section
    const statsSection = document.getElementById('stats-section');
    if (statsSection) statsSection.style.display = 'grid';
}

// ==========================================
// UPDATE ROLE-BASED UI
// ==========================================

function updateRoleBasedUI(role) {
    // Stats section (only for organizer/admin)
    const statsSection = document.getElementById('stats-section');
    if (statsSection) {
        statsSection.style.display = (role === 'organizer' || role === 'admin') ? 'grid' : 'none';
    }

    // Stripe section (only for organizer/admin)
    const stripeSection = document.getElementById('stripe-section');
    if (stripeSection) {
        stripeSection.style.display = (role === 'organizer' || role === 'admin') ? 'block' : 'none';
    }

    // Scanner section (only for scanner/admin)
    const scannerSection = document.getElementById('scanner-section');
    if (scannerSection) {
        scannerSection.style.display = (role === 'scanner' || role === 'admin') ? 'block' : 'none';
    }

    // Admin section (only for admin)
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = (role === 'admin') ? 'block' : 'none';
    }
}

// ==========================================
// SETUP EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Avatar upload
    const avatarInput = document.getElementById('avatar-input');
    const avatarUploadBtn = document.getElementById('avatar-upload-btn');

    if (avatarInput && avatarUploadBtn) {
        avatarUploadBtn.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', handleAvatarUpload);
    }

    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Delete account
    const deleteAccountBtn = document.getElementById('btn-delete-account');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }

    // Stripe Connect
    const stripeConnectBtn = document.getElementById('btn-stripe-connect');
    if (stripeConnectBtn) {
        stripeConnectBtn.addEventListener('click', handleStripeConnect);
    }
}

// ==========================================
// HANDLE AVATAR UPLOAD
// ==========================================

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Validate image
        const validation = await validateImage(file, {
            maxSizeMB: 2,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
            minWidth: 100,
            minHeight: 100,
            maxWidth: 2000,
            maxHeight: 2000
        });

        if (!validation.valid) {
            showError(validation.error, 'Invalid Image');
            return;
        }

        const loadingModal = showLoading('Uploading avatar...');

        // Compress image
        const compressionResult = await compressProfilePhoto(file);

        if (!compressionResult.success) {
            loadingModal.close();
            showError(compressionResult.error, 'Compression Failed');
            return;
        }

        console.log(`✅ Image compressed: ${compressionResult.reductionPercent}% reduction`);

        // Upload to Firebase Storage
        const storageRef = ref(storage, `avatars/${state.user.uid}.jpg`);
        await uploadBytes(storageRef, compressionResult.file);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Update user profile
        const result = await updateUserProfile({ photoURL: downloadURL });

        loadingModal.close();

        if (result.success) {
            showSuccess('Avatar updated successfully!');

            // Update UI
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg) avatarImg.src = downloadURL;

        } else {
            showError(result.error, 'Update Failed');
        }

    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        showError('Failed to upload avatar');
    }
}

// ==========================================
// HANDLE PROFILE UPDATE
// ==========================================

async function handleProfileUpdate(e) {
    e.preventDefault();

    if (state.isUpdating) return;

    const nameInput = document.getElementById('input-name');
    const emailInput = document.getElementById('input-email');

    const newName = nameInput.value.trim();
    const newEmail = emailInput.value.trim();

    if (!newName) {
        showError('Name is required');
        return;
    }

    const confirmed = await showConfirm(
        'Do you want to update your profile?',
        'Confirm Update'
    );

    if (!confirmed) return;

    state.isUpdating = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const updates = {
            displayName: newName
        };

        // Only update email if changed
        if (newEmail !== state.user.email) {
            updates.email = newEmail;
        }

        const result = await updateUserProfile(updates);

        if (result.success) {
            showSuccess('Profile updated successfully!');

            // Update local state
            state.user = getCurrentUser();
            renderProfile();

        } else {
            showError(result.error, 'Update Failed');
        }

    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showError('Failed to update profile');
    } finally {
        state.isUpdating = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ==========================================
// HANDLE PASSWORD CHANGE
// ==========================================

async function handlePasswordChange(e) {
    e.preventDefault();

    const newPasswordInput = document.getElementById('input-new-password');
    const confirmPasswordInput = document.getElementById('input-confirm-password');

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate
    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    const confirmed = await showConfirm(
        'Are you sure you want to change your password?',
        'Confirm Password Change'
    );

    if (!confirmed) return;

    const loadingModal = showLoading('Changing password...');

    try {
        const result = await changePassword(newPassword);

        loadingModal.close();

        if (result.success) {
            showSuccess('Password changed successfully!');

            // Clear form
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';

        } else {
            showError(result.error, 'Password Change Failed');
        }

    } catch (error) {
        loadingModal.close();
        console.error('❌ Error changing password:', error);
        showError('Failed to change password');
    }
}

// ==========================================
// HANDLE DELETE ACCOUNT
// ==========================================

async function handleDeleteAccount() {
    const confirmed = await showConfirm(
        'Are you sure you want to delete your account? This action cannot be undone.',
        'Delete Account',
        {
            confirmText: 'Delete',
            cancelText: 'Cancel'
        }
    );

    if (!confirmed) return;

    // Double confirm
    const doubleConfirmed = await showConfirm(
        'This will permanently delete all your data. Are you absolutely sure?',
        'Final Confirmation',
        {
            confirmText: 'Yes, Delete Everything',
            cancelText: 'Cancel'
        }
    );

    if (!doubleConfirmed) return;

    const loadingModal = showLoading('Deleting account...');

    try {
        // TODO: Call Cloud Function to delete account
        // This should delete:
        // - User document
        // - User's events
        // - User's likes
        // - User's presales
        // - User's notifications
        // - User's avatar from Storage
        // - Auth account

        console.warn('⚠️ Account deletion not implemented yet (Cloud Function needed)');

        loadingModal.close();
        showAlert('Account deletion feature coming soon. Please contact support.');

    } catch (error) {
        loadingModal.close();
        console.error('❌ Error deleting account:', error);
        showError('Failed to delete account');
    }
}

// ==========================================
// HANDLE STRIPE CONNECT
// ==========================================

async function handleStripeConnect() {
    const loadingModal = showLoading('Setting up Stripe Connect...');

    try {
        // TODO: Call Cloud Function to create Stripe Connect account link
        console.warn('⚠️ Stripe Connect not implemented yet (Cloud Function needed)');

        loadingModal.close();
        showAlert('Stripe Connect feature coming soon!');

    } catch (error) {
        loadingModal.close();
        console.error('❌ Error setting up Stripe:', error);
        showError('Failed to setup Stripe Connect');
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getRoleIcon(role) {
    const icons = {
        admin: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
        organizer: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        scanner: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
        user: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    };

    return icons[role] || icons.user;
}

function getRoleLabel(role) {
    const labels = {
        admin: 'Administrator',
        organizer: 'Organizer',
        scanner: 'Scanner',
        user: 'User'
    };

    return labels[role] || 'User';
}

function getDefaultAvatar(email) {
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

function showDashboardLoading() {
    const loadingElement = document.getElementById('dashboard-loading');
    const contentElement = document.getElementById('dashboard-content');

    if (loadingElement) loadingElement.style.display = 'flex';
    if (contentElement) contentElement.style.display = 'none';
}

function hideDashboardLoading() {
    const loadingElement = document.getElementById('dashboard-loading');
    const contentElement = document.getElementById('dashboard-content');

    if (loadingElement) loadingElement.style.display = 'none';
    if (contentElement) contentElement.style.display = 'block';
}

// ==========================================
// EXPORT FOR DEBUGGING
// ==========================================

window.dashboardDebug = {
    state,
    loadUserData,
    loadStats,
    renderProfile,
    renderStats
};
