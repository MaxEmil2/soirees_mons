// ========================================
// SYSTÈME DE MODALS RÉUTILISABLE
// ========================================

/**
 * Crée et affiche un modal de notification
 * @param {string} type - Type de modal: 'success', 'error', 'warning', 'info'
 * @param {string} title - Titre du modal
 * @param {string} message - Message à afficher
 * @param {Function} onClose - Callback optionnel à exécuter à la fermeture
 */
export function showModal(type, title, message, onClose = null) {
    // Supprimer un modal existant s'il y en a un
    const existingModal = document.getElementById('notification-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Icônes par type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    // Couleurs par type
    const colors = {
        success: '#52c41a',
        error: '#ff4d4f',
        warning: '#faad14',
        info: '#6c63ff'
    };

    // Créer le modal
    const modal = document.createElement('div');
    modal.id = 'notification-modal';
    modal.className = 'notification-modal';
    modal.innerHTML = `
        <div class="notification-modal-content">
            <div class="notification-icon" style="color: ${colors[type]}">${icons[type]}</div>
            <h3 class="notification-title">${title}</h3>
            <p class="notification-message">${message}</p>
            <button class="btn btn-primary notification-btn">OK</button>
        </div>
    `;

    // Ajouter au DOM
    document.body.appendChild(modal);

    // Afficher avec animation
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });

    // Gérer la fermeture
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            if (onClose) onClose();
        }, 200);
    };

    // Bouton OK
    modal.querySelector('.notification-btn').addEventListener('click', closeModal);

    // Clic en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Touche Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Affiche un modal de succès
 */
export function showSuccess(message, onClose = null) {
    showModal('success', 'Succès', message, onClose);
}

/**
 * Affiche un modal d'erreur
 */
export function showError(message, onClose = null) {
    showModal('error', 'Erreur', message, onClose);
}

/**
 * Affiche un modal d'avertissement
 */
export function showWarning(message, onClose = null) {
    showModal('warning', 'Attention', message, onClose);
}

/**
 * Affiche un modal d'information
 */
export function showInfo(message, onClose = null) {
    showModal('info', 'Information', message, onClose);
}

/**
 * Affiche un modal de confirmation avec Oui/Non
 * @param {string} message - Message de confirmation
 * @returns {Promise<boolean>} - true si confirmé, false sinon
 */
export function showConfirm(message) {
    return new Promise((resolve) => {
        // Supprimer un modal existant
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'notification-modal';
        modal.innerHTML = `
            <div class="notification-modal-content">
                <div class="notification-icon" style="color: #faad14">⚠️</div>
                <h3 class="notification-title">Confirmation</h3>
                <p class="notification-message">${message}</p>
                <div class="notification-buttons">
                    <button class="btn btn-secondary" id="confirm-cancel">Annuler</button>
                    <button class="btn btn-primary" id="confirm-ok">Confirmer</button>
                </div>
            </div>
        `;

        // Ajouter au DOM
        document.body.appendChild(modal);

        // Afficher avec animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Gérer la fermeture
        const closeModal = (result) => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 200);
        };

        // Boutons
        modal.querySelector('#confirm-ok').addEventListener('click', () => closeModal(true));
        modal.querySelector('#confirm-cancel').addEventListener('click', () => closeModal(false));

        // Clic en dehors = annuler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });

        // Touche Escape = annuler
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Affiche un modal avec input (pour remplacer prompt)
 * @param {string} message - Message à afficher
 * @param {string} defaultValue - Valeur par défaut
 * @returns {Promise<string|null>} - Valeur entrée ou null si annulé
 */
export function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        // Supprimer un modal existant
        const existingModal = document.getElementById('prompt-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'prompt-modal';
        modal.className = 'notification-modal';
        modal.innerHTML = `
            <div class="notification-modal-content">
                <div class="notification-icon" style="color: #6c63ff">✏️</div>
                <h3 class="notification-title">Saisie requise</h3>
                <p class="notification-message">${message}</p>
                <input type="text" class="prompt-input" id="prompt-input" value="${defaultValue}" placeholder="Votre réponse...">
                <div class="notification-buttons">
                    <button class="btn btn-secondary" id="prompt-cancel">Annuler</button>
                    <button class="btn btn-primary" id="prompt-ok">Valider</button>
                </div>
            </div>
        `;

        // Ajouter au DOM
        document.body.appendChild(modal);

        // Afficher avec animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
            // Focus sur l'input
            document.getElementById('prompt-input').focus();
        });

        // Gérer la fermeture
        const closeModal = (value) => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                resolve(value);
            }, 200);
        };

        // Boutons
        const input = document.getElementById('prompt-input');
        modal.querySelector('#prompt-ok').addEventListener('click', () => closeModal(input.value));
        modal.querySelector('#prompt-cancel').addEventListener('click', () => closeModal(null));

        // Entrée pour valider
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') closeModal(input.value);
        });

        // Clic en dehors = annuler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(null);
        });

        // Touche Escape = annuler
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(null);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}
