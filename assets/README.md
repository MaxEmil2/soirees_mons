# 🎨 SOIRÉES MONS - ASSETS DOCUMENTATION

## 📁 Structure

```
assets/
├── css/
│   ├── design-system.css          # Core design system (variables, utilities)
│   ├── components.css             # Reusable UI components
│   └── pages/
│       └── index.css              # Page-specific styles
│
├── js/
│   ├── core/
│   │   ├── firebase-config.js     # Centralized Firebase configuration
│   │   ├── auth.js                # Authentication system
│   │   └── permissions.js         # Role-based access control
│   │
│   ├── services/
│   │   ├── events-service.js      # Events operations (CRUD via Cloud Functions)
│   │   └── likes-service.js       # Likes system with real-time updates
│   │
│   └── components/
│       ├── modal.js               # Professional modal system (fixes all bugs)
│       └── image-optimizer.js     # Image compression & lazy loading
│
└── images/
    └── (optimized images)
```

---

## 🚀 Quick Start Guide

### **1. Include Design System in HTML**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <!-- Core Design System -->
    <link rel="stylesheet" href="/assets/css/design-system.css">

    <!-- UI Components -->
    <link rel="stylesheet" href="/assets/css/components.css">

    <!-- Page-specific styles -->
    <link rel="stylesheet" href="/assets/css/pages/index.css">
</head>
<body>
    <!-- Your content -->

    <!-- JavaScript Modules -->
    <script type="module" src="/your-script.js"></script>
</body>
</html>
```

---

## 📚 Usage Examples

### **🔐 Authentication**

```javascript
import {
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
    getCurrentUser,
    isAuthenticated
} from '/assets/js/core/auth.js';

// Sign up
const result = await signUpWithEmail('email@example.com', 'password123', 'John Doe');
if (result.success) {
    console.log('User created:', result.user);
} else {
    console.error('Error:', result.error);
}

// Sign in
const loginResult = await signInWithEmail('email@example.com', 'password123');

// Sign in with Google
const googleResult = await signInWithGoogle();

// Sign out
await signOutUser();

// Check if authenticated
if (isAuthenticated()) {
    const user = getCurrentUser();
    console.log('Current user:', user);
}
```

---

### **🛡️ Permissions & Roles**

```javascript
import {
    isAdmin,
    isOrganizer,
    hasPermission,
    requireAdmin,
    requireOrganizer,
    PERMISSIONS
} from '/assets/js/core/permissions.js';

// Check if user is admin
if (await isAdmin()) {
    // Show admin panel
}

// Check if user is organizer
if (await isOrganizer()) {
    // Show create event button
}

// Check specific permission
if (await hasPermission(PERMISSIONS.CREATE_EVENT)) {
    // Allow event creation
}

// Require admin (redirects if not)
await requireAdmin(); // Redirects to /index.html if not admin

// Require organizer (redirects if not)
await requireOrganizer();
```

---

### **🎉 Events Service**

```javascript
import {
    getApprovedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    listenToEvents,
    formatEventDate,
    formatEventPrice
} from '/assets/js/services/events-service.js';

// Get approved events (with caching)
const { success, events } = await getApprovedEvents({
    useCache: true,
    limitCount: 50,
    orderField: 'date',
    orderDirection: 'desc'
});

if (success) {
    events.forEach(event => {
        console.log(event.name, formatEventDate(event.date), formatEventPrice(event.price));
    });
}

// Create event (via Cloud Function)
const createResult = await createEvent({
    name: 'Summer Festival',
    description: 'Amazing summer party',
    location: 'Mons, Belgium',
    date: new Date('2025-07-01'),
    price: 10,
    age: 18,
    presales: true,
    ticketPrice: 1500 // €15 in cents
});

if (createResult.success) {
    console.log('Event created:', createResult.eventId);
}

// Listen to events in real-time
const unsubscribe = listenToEvents((result) => {
    if (result.success) {
        console.log('Events updated:', result.events);
        renderEvents(result.events);
    }
});

// Stop listening
unsubscribe();
```

---

### **❤️ Likes Service**

```javascript
import {
    toggleLike,
    getEventLikes,
    formatLikesDisplay,
    listenToEventLikes
} from '/assets/js/services/likes-service.js';

// Toggle like for event
const result = await toggleLike('event-id-123', isPublic = true);

if (result.success) {
    console.log(result.message); // "Event liked successfully" or "Event unliked successfully"
}

// Get likes for event
const { success, likes, count } = await getEventLikes('event-id-123');

if (success) {
    console.log(`${count} likes`);

    // Format for display
    const display = formatLikesDisplay(likes, maxPhotos = 3);
    console.log('Public likers photos:', display.photos);
    console.log('Total count:', display.totalCount);
    console.log('Remaining count:', display.remainingCount);
}

// Listen to likes in real-time
const unsubscribe = listenToEventLikes('event-id-123', (result) => {
    if (result.success) {
        console.log('Likes updated:', result.count);
        updateLikesUI(result.likes);
    }
});
```

---

### **💬 Modals**

```javascript
import Modal, {
    showAlert,
    showConfirm,
    showError,
    showSuccess,
    showLoading
} from '/assets/js/components/modal.js';

// Simple alert
showAlert('This is an alert message', 'Alert Title');

// Confirm dialog
const confirmed = await showConfirm(
    'Are you sure you want to delete this event?',
    'Confirm Deletion',
    {
        confirmText: 'Delete',
        cancelText: 'Cancel'
    }
);

if (confirmed) {
    // User clicked "Delete"
}

// Error modal
showError('Something went wrong!', 'Error');

// Success modal (auto-closes after 3s)
showSuccess('Event created successfully!', 'Success');

// Loading modal
const loadingModal = showLoading('Creating event...');
// ... do async work
loadingModal.close();

// Custom modal
const modal = new Modal({
    title: 'Custom Modal',
    content: '<p>Your custom content here</p>',
    footer: '<button class="btn btn-primary">OK</button>',
    size: 'lg', // 'sm', 'md', 'lg', 'xl'
    closeOnBackdrop: true,
    closeOnEscape: true,
    onOpen: () => console.log('Modal opened'),
    onClose: () => console.log('Modal closed')
});

modal.open();
```

---

### **🖼️ Image Optimization**

```javascript
import {
    compressImage,
    compressProfilePhoto,
    compressEventImage,
    setupLazyLoading,
    createLazyImage,
    previewImage,
    validateImage
} from '/assets/js/components/image-optimizer.js';

// Setup lazy loading on page load
document.addEventListener('DOMContentLoaded', () => {
    setupLazyLoading();
});

// Compress image before upload
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];

    // Validate
    const validation = await validateImage(file, {
        maxSizeMB: 5,
        minWidth: 300,
        minHeight: 300
    });

    if (!validation.valid) {
        showError(validation.error);
        return;
    }

    // Compress
    const result = await compressEventImage(file);

    if (result.success) {
        console.log(`Compressed: ${result.reductionPercent}% reduction`);
        // Upload result.file to Firebase Storage
        uploadToFirebase(result.file);
    }
});

// Preview image
previewImage(file, (result) => {
    if (result.success) {
        document.querySelector('#preview').src = result.dataUrl;
    }
});

// Create lazy image element
const img = createLazyImage('/path/to/image.jpg', 'Alt text', 'event-card-image');
document.querySelector('.container').appendChild(img);
```

---

## 🎨 Design System Classes

### **Layout**

```html
<!-- Container -->
<div class="container">Content</div>
<div class="container-sm">Smaller container</div>

<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-6">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
</div>
```

### **Typography**

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<p class="text-lg text-secondary">Large secondary text</p>
<small class="text-tertiary">Small tertiary text</small>
```

### **Buttons**

```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-danger btn-sm">Small Danger Button</button>
<button class="btn btn-primary btn-lg btn-block">Large Full Width</button>
<button class="btn btn-primary btn-loading">Loading...</button>
```

### **Cards**

```html
<div class="card card-hover">
    <div class="card-header">
        <h3>Card Title</h3>
    </div>
    <div class="card-body">
        <p>Card content goes here</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">Action</button>
    </div>
</div>
```

### **Forms**

```html
<div class="form-group">
    <label class="form-label">Email</label>
    <input type="email" class="form-input" placeholder="Enter email">
    <div class="form-help">We'll never share your email</div>
</div>

<div class="form-group">
    <label class="form-label">Description</label>
    <textarea class="form-textarea" placeholder="Enter description"></textarea>
    <div class="form-error">This field is required</div>
</div>
```

### **Badges**

```html
<span class="badge badge-primary">New</span>
<span class="badge badge-success">Approved</span>
<span class="badge badge-danger">Urgent</span>
<span class="badge badge-warning">Pending</span>
```

### **Alerts**

```html
<div class="alert alert-success">
    <div class="alert-icon">✓</div>
    <div class="alert-content">
        <div class="alert-title">Success!</div>
        <div class="alert-description">Your event was created.</div>
    </div>
</div>
```

### **Loaders**

```html
<!-- Spinner -->
<div class="loader"></div>
<div class="loader loader-lg"></div>

<!-- Skeleton -->
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-title"></div>
<div class="skeleton skeleton-card"></div>
```

---

## 🎯 CSS Variables

```css
/* Colors */
var(--primary-500)
var(--success)
var(--danger)
var(--warning)
var(--text-primary)
var(--text-secondary)
var(--bg-primary)
var(--bg-secondary)

/* Spacing */
var(--space-2)  /* 8px */
var(--space-4)  /* 16px */
var(--space-6)  /* 24px */
var(--space-8)  /* 32px */

/* Typography */
var(--font-size-sm)
var(--font-size-base)
var(--font-size-lg)
var(--font-weight-medium)
var(--font-weight-bold)

/* Borders */
var(--radius-sm)
var(--radius-md)
var(--radius-lg)
var(--border-primary)

/* Shadows */
var(--shadow-sm)
var(--shadow-md)
var(--shadow-lg)

/* Transitions */
var(--transition-fast)
var(--transition-base)
var(--transition-slow)
```

---

## 🔥 Performance Tips

1. **Always use lazy loading for images**
   ```javascript
   setupLazyLoading(); // Call on page load
   ```

2. **Use caching for events**
   ```javascript
   getApprovedEvents({ useCache: true }); // Will use 5-minute cache
   ```

3. **Compress images before upload**
   ```javascript
   const result = await compressEventImage(file);
   ```

4. **Use real-time listeners sparingly**
   ```javascript
   const unsubscribe = listenToEvents(callback);
   // Don't forget to unsubscribe when done!
   unsubscribe();
   ```

5. **Batch operations when possible**
   ```javascript
   // Use batch for multiple Firestore writes
   const batch = db.batch();
   // ... add operations
   await batch.commit();
   ```

---

## 🐛 Bug Fixes Included

✅ **Modal close button not working** - Fixed with proper event delegation
✅ **Mobile scroll inside modals** - Fixed with body scroll lock
✅ **Footer appearing incorrectly** - Fixed with proper z-index and positioning
✅ **Photo upload not working on mobile** - Fixed with proper file input handling
✅ **Modal backdrop not clickable** - Fixed with proper event handling
✅ **Navbar overflow on mobile** - Fixed with responsive design

---

## 📱 Mobile Optimization

All components are mobile-first and fully responsive:

- ✅ Touch-optimized buttons (44px minimum)
- ✅ Smooth scroll on mobile
- ✅ Hamburger menu for small screens
- ✅ Optimized images for mobile
- ✅ Fast tap responses (no 300ms delay)
- ✅ Proper viewport configuration

---

## 🎓 Best Practices

1. **Always import from core modules first**
   ```javascript
   import { db, auth } from '/assets/js/core/firebase-config.js';
   ```

2. **Use services for data operations**
   ```javascript
   import { createEvent } from '/assets/js/services/events-service.js';
   ```

3. **Use components for UI**
   ```javascript
   import { showSuccess } from '/assets/js/components/modal.js';
   ```

4. **Check permissions before showing UI**
   ```javascript
   if (await hasPermission(PERMISSIONS.CREATE_EVENT)) {
       showCreateButton();
   }
   ```

5. **Handle errors gracefully**
   ```javascript
   const result = await createEvent(data);
   if (!result.success) {
       showError(result.error);
       return;
   }
   ```

---

## 🔗 Links

- [Design System](./css/design-system.css)
- [Components](./css/components.css)
- [Firebase Config](./js/core/firebase-config.js)
- [Rebuild Documentation](../REBUILD_DOCUMENTATION.md)

---

**Built with ❤️ for Soirées Mons**
