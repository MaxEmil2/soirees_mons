/*
 * MODAL COMPONENT
 * Professional modal system with proper scroll lock and mobile support
 * Fixes all modal bugs (close button, mobile scroll, backdrop, etc.)
 */

// ==========================================
// MODAL CLASS
// ==========================================

export class Modal {
    constructor(options = {}) {
        this.options = {
            title: options.title || '',
            content: options.content || '',
            size: options.size || 'md', // 'sm', 'md', 'lg', 'xl'
            closeOnBackdrop: options.closeOnBackdrop !== false,
            closeOnEscape: options.closeOnEscape !== false,
            showCloseButton: options.showCloseButton !== false,
            footer: options.footer || null,
            onOpen: options.onOpen || null,
            onClose: options.onClose || null,
            className: options.className || ''
        };

        this.isOpen = false;
        this.backdrop = null;
        this.modal = null;
        this.previousActiveElement = null;

        this.create();
        this.attachEvents();
    }

    // ==========================================
    // CREATE MODAL ELEMENTS
    // ==========================================

    create() {
        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'modal-backdrop';
        this.backdrop.setAttribute('role', 'presentation');

        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = `modal modal-${this.options.size} ${this.options.className}`;
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('tabindex', '-1');

        // Create modal structure
        this.modal.innerHTML = `
            ${this.options.title ? `
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title}</h3>
                    ${this.options.showCloseButton ? `
                        <button class="modal-close" aria-label="Close modal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            <div class="modal-body">
                ${this.options.content}
            </div>
            ${this.options.footer ? `
                <div class="modal-footer">
                    ${this.options.footer}
                </div>
            ` : ''}
        `;

        // Append to body
        this.backdrop.appendChild(this.modal);
    }

    // ==========================================
    // ATTACH EVENT LISTENERS
    // ==========================================

    attachEvents() {
        // Close button
        const closeButton = this.modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }

        // Backdrop click
        if (this.options.closeOnBackdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.close();
                }
            });
        }

        // Escape key
        if (this.options.closeOnEscape) {
            this.handleEscape = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.handleEscape);
        }

        // Prevent modal click from closing
        this.modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // ==========================================
    // OPEN MODAL
    // ==========================================

    open() {
        if (this.isOpen) return;

        // Store currently focused element
        this.previousActiveElement = document.activeElement;

        // Add to DOM
        document.body.appendChild(this.backdrop);

        // Prevent body scroll (fix mobile scroll bug)
        this.lockScroll();

        // Trigger reflow
        this.backdrop.offsetHeight;

        // Add active class (for animation)
        this.backdrop.classList.add('active');
        this.modal.classList.add('active');

        // Focus modal
        this.modal.focus();

        this.isOpen = true;

        // Call onOpen callback
        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen(this);
        }
    }

    // ==========================================
    // CLOSE MODAL
    // ==========================================

    close() {
        if (!this.isOpen) return;

        // Remove active class (for animation)
        this.backdrop.classList.remove('active');
        this.modal.classList.remove('active');

        // Wait for animation to complete
        setTimeout(() => {
            // Remove from DOM
            if (this.backdrop.parentNode) {
                document.body.removeChild(this.backdrop);
            }

            // Restore body scroll
            this.unlockScroll();

            // Restore focus
            if (this.previousActiveElement && this.previousActiveElement.focus) {
                this.previousActiveElement.focus();
            }

            this.isOpen = false;

            // Call onClose callback
            if (typeof this.options.onClose === 'function') {
                this.options.onClose(this);
            }
        }, 250); // Match CSS transition duration
    }

    // ==========================================
    // LOCK BODY SCROLL (FIX MOBILE SCROLL BUG)
    // ==========================================

    lockScroll() {
        // Save current scroll position
        this.scrollPosition = window.pageYOffset;

        // Add modal-open class to body
        document.body.classList.add('modal-open');

        // Fix for iOS Safari
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }

    // ==========================================
    // UNLOCK BODY SCROLL
    // ==========================================

    unlockScroll() {
        // Remove modal-open class
        document.body.classList.remove('modal-open');

        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.scrollPosition);
    }

    // ==========================================
    // UPDATE CONTENT
    // ==========================================

    setContent(content) {
        const body = this.modal.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    }

    // ==========================================
    // UPDATE TITLE
    // ==========================================

    setTitle(title) {
        const titleEl = this.modal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    // ==========================================
    // DESTROY MODAL
    // ==========================================

    destroy() {
        if (this.isOpen) {
            this.close();
        }

        // Remove event listeners
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
        }

        // Clear references
        this.backdrop = null;
        this.modal = null;
        this.previousActiveElement = null;
    }
}

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

/**
 * Show a simple alert modal
 */
export function showAlert(message, title = 'Alert') {
    const modal = new Modal({
        title: title,
        content: `<p style="margin: 0;">${message}</p>`,
        footer: `<button class="btn btn-primary btn-block" onclick="this.closest('.modal-backdrop').dispatchEvent(new Event('click'))">OK</button>`,
        size: 'sm'
    });

    modal.open();
    return modal;
}

/**
 * Show a confirm modal
 */
export function showConfirm(message, title = 'Confirm', options = {}) {
    return new Promise((resolve) => {
        const modal = new Modal({
            title: title,
            content: `<p style="margin: 0;">${message}</p>`,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">
                    ${options.cancelText || 'Cancel'}
                </button>
                <button class="btn btn-primary" data-action="confirm">
                    ${options.confirmText || 'Confirm'}
                </button>
            `,
            size: 'sm',
            onClose: () => resolve(false)
        });

        modal.open();

        // Add event listeners to buttons
        const confirmBtn = modal.modal.querySelector('[data-action="confirm"]');
        const cancelBtn = modal.modal.querySelector('[data-action="cancel"]');

        confirmBtn.addEventListener('click', () => {
            modal.close();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            modal.close();
            resolve(false);
        });
    });
}

/**
 * Show a loading modal
 */
export function showLoading(message = 'Loading...') {
    const modal = new Modal({
        content: `
            <div style="text-align: center; padding: 2rem;">
                <div class="loader" style="margin: 0 auto 1rem;"></div>
                <p style="margin: 0; color: var(--text-secondary);">${message}</p>
            </div>
        `,
        size: 'sm',
        showCloseButton: false,
        closeOnBackdrop: false,
        closeOnEscape: false
    });

    modal.open();
    return modal;
}

/**
 * Show an error modal
 */
export function showError(message, title = 'Error') {
    const modal = new Modal({
        title: title,
        content: `
            <div class="alert alert-danger">
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="alert-content">
                    <p style="margin: 0;">${message}</p>
                </div>
            </div>
        `,
        footer: `<button class="btn btn-danger btn-block" onclick="this.closest('.modal-backdrop').dispatchEvent(new Event('click'))">Close</button>`,
        size: 'sm'
    });

    modal.open();
    return modal;
}

/**
 * Show a success modal
 */
export function showSuccess(message, title = 'Success') {
    const modal = new Modal({
        title: title,
        content: `
            <div class="alert alert-success">
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="alert-content">
                    <p style="margin: 0;">${message}</p>
                </div>
            </div>
        `,
        footer: `<button class="btn btn-success btn-block" onclick="this.closest('.modal-backdrop').dispatchEvent(new Event('click'))">OK</button>`,
        size: 'sm'
    });

    modal.open();

    // Auto-close after 3 seconds
    setTimeout(() => modal.close(), 3000);

    return modal;
}

// ==========================================
// EXPORT
// ==========================================

export default Modal;
