/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                        MODAL COMPONENT                             ║
 * ║             Composant de modal moderne et accessible               ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

/**
 * Système de modals
 */
class Modal {
  constructor(options = {}) {
    this.options = {
      title: options.title || '',
      content: options.content || '',
      showCloseButton: options.showCloseButton !== false,
      closeOnOverlayClick: options.closeOnOverlayClick !== false,
      onClose: options.onClose || null,
      maxWidth: options.maxWidth || '600px',
      ...options
    };

    this.modal = null;
    this.overlay = null;
  }

  /**
   * Affiche le modal
   */
  show() {
    // Création de l'overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
      padding: 20px;
      overflow-y: auto;
    `;

    // Création du modal
    this.modal = document.createElement('div');
    this.modal.className = 'modal';
    this.modal.style.cssText = `
      background: #1a1a2e;
      border-radius: 20px;
      max-width: ${this.options.maxWidth};
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease-out;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    `;

    // Header du modal
    if (this.options.title || this.options.showCloseButton) {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      if (this.options.title) {
        const title = document.createElement('h2');
        title.textContent = this.options.title;
        title.style.cssText = `
          margin: 0;
          color: white;
          font-size: 24px;
          font-weight: 600;
        `;
        header.appendChild(title);
      }

      if (this.options.showCloseButton) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        `;
        closeBtn.onmouseover = () => {
          closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        closeBtn.onmouseout = () => {
          closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        closeBtn.onclick = () => this.close();
        header.appendChild(closeBtn);
      }

      this.modal.appendChild(header);
    }

    // Contenu du modal
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
      padding: 24px;
      color: rgba(255, 255, 255, 0.9);
      overflow-y: auto;
      flex: 1;
    `;

    if (typeof this.options.content === 'string') {
      content.innerHTML = this.options.content;
    } else {
      content.appendChild(this.options.content);
    }

    this.modal.appendChild(content);

    // Ajout au DOM
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Événements
    if (this.options.closeOnOverlayClick) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    // Fermeture avec Escape
    this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.handleEscape);

    // Empêche le scroll du body
    document.body.style.overflow = 'hidden';

    return this;
  }

  /**
   * Ferme le modal
   */
  close() {
    if (this.overlay) {
      this.overlay.style.animation = 'fadeOut 0.2s ease-out';
      this.modal.style.animation = 'slideDown 0.2s ease-out';

      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.remove();
        }
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this.handleEscape);

        if (this.options.onClose) {
          this.options.onClose();
        }
      }, 200);
    }
  }

  /**
   * Met à jour le contenu du modal
   */
  updateContent(content) {
    const contentDiv = this.modal.querySelector('.modal-content');
    if (contentDiv) {
      if (typeof content === 'string') {
        contentDiv.innerHTML = content;
      } else {
        contentDiv.innerHTML = '';
        contentDiv.appendChild(content);
      }
    }
  }
}

// Ajoute les animations CSS si elles n'existent pas
if (!document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideDown {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(50px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export de la classe
export { Modal };
