/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                        TOAST COMPONENT                             ║
 * ║              Composant de notifications élégant                    ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

/**
 * Système de notifications Toast
 */
class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * Initialise le conteneur de toasts
   */
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    }
  }

  /**
   * Affiche un toast de succès
   */
  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  /**
   * Affiche un toast d'erreur
   */
  error(message, duration = 5000) {
    this.show(message, 'error', duration);
  }

  /**
   * Affiche un toast d'information
   */
  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }

  /**
   * Affiche un toast d'avertissement
   */
  warning(message, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  /**
   * Affiche un toast
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const colors = {
      success: { bg: '#10b981', icon: '✓' },
      error: { bg: '#ef4444', icon: '✕' },
      info: { bg: '#3b82f6', icon: 'ℹ' },
      warning: { bg: '#f59e0b', icon: '⚠' }
    };

    const color = colors[type] || colors.info;

    toast.innerHTML = `
      <div style="
        background: ${color.bg};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out, slideOutRight 0.3s ease-in ${duration - 300}ms forwards;
      ">
        <span style="
          font-size: 20px;
          font-weight: bold;
        ">${color.icon}</span>
        <span style="
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
        ">${message}</span>
        <button onclick="this.closest('.toast').remove()" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        ">×</button>
      </div>
    `;

    this.container.appendChild(toast);

    // Auto-suppression
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, duration);
  }
}

// Ajoute les animations CSS si elles n'existent pas
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .toast button:hover {
      background: rgba(255, 255, 255, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
}

// Export de l'instance unique
export const toast = new Toast();
