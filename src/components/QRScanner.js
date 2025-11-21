/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                      QR SCANNER COMPONENT                          ║
 * ║              Composant de scan de QR codes optimisé               ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { Html5Qrcode } from 'html5-qrcode';
import { toast } from './Toast.js';
import { ticketsService } from '../services/tickets.service.js';

/**
 * Scanner de QR codes
 */
export class QRScanner {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.scanner = null;
    this.isScanning = false;
    this.onScanSuccess = options.onScanSuccess || null;
    this.onScanError = options.onScanError || null;
  }

  /**
   * Initialise le scanner
   */
  async init() {
    try {
      const container = document.getElementById(this.containerId);
      if (!container) {
        throw new Error('Container not found');
      }

      // Création de l'élément de scan
      container.innerHTML = `
        <div style="
          background: #1a1a2e;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        ">
          <div id="qr-reader" style="
            border-radius: 16px;
            overflow: hidden;
            border: 3px solid rgba(108, 99, 255, 0.3);
          "></div>

          <div style="
            margin-top: 20px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          ">
            <button id="start-scan-btn" style="
              flex: 1;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              padding: 14px 28px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            ">
              🎥 Démarrer le scan
            </button>

            <button id="stop-scan-btn" style="
              flex: 1;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              border: none;
              padding: 14px 28px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
              display: none;
            ">
              ⏹ Arrêter le scan
            </button>
          </div>

          <div id="scan-result" style="
            margin-top: 20px;
            padding: 20px;
            background: rgba(108, 99, 255, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(108, 99, 255, 0.3);
            display: none;
          ">
            <div style="color: white; font-weight: 600; margin-bottom: 8px;">
              Résultat du scan
            </div>
            <div id="scan-result-content" style="
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
            "></div>
          </div>
        </div>
      `;

      // Initialisation du scanner HTML5
      this.scanner = new Html5Qrcode('qr-reader');

      // Événements des boutons
      document.getElementById('start-scan-btn').addEventListener('click', () => this.start());
      document.getElementById('stop-scan-btn').addEventListener('click', () => this.stop());

      console.log('✅ QR Scanner initialized');
    } catch (error) {
      console.error('❌ Error initializing QR scanner:', error);
      toast.error('Erreur lors de l\'initialisation du scanner');
    }
  }

  /**
   * Démarre le scan
   */
  async start() {
    if (this.isScanning) return;

    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => this.handleScanSuccess(decodedText),
        (errorMessage) => {
          // Ignore les erreurs de scan répétitives
        }
      );

      this.isScanning = true;
      document.getElementById('start-scan-btn').style.display = 'none';
      document.getElementById('stop-scan-btn').style.display = 'block';

      console.log('✅ QR Scanner started');
      toast.info('Scanner démarré');
    } catch (error) {
      console.error('❌ Error starting scanner:', error);
      toast.error('Erreur lors du démarrage du scanner. Vérifiez les permissions de la caméra.');
    }
  }

  /**
   * Arrête le scan
   */
  async stop() {
    if (!this.isScanning) return;

    try {
      await this.scanner.stop();
      this.isScanning = false;

      document.getElementById('start-scan-btn').style.display = 'block';
      document.getElementById('stop-scan-btn').style.display = 'none';

      console.log('✅ QR Scanner stopped');
      toast.info('Scanner arrêté');
    } catch (error) {
      console.error('❌ Error stopping scanner:', error);
    }
  }

  /**
   * Gère le succès du scan
   */
  async handleScanSuccess(decodedText) {
    try {
      // Parse les données du QR code
      const qrData = JSON.parse(decodedText);
      const ticketId = qrData.ticketId;

      if (!ticketId) {
        throw new Error('QR code invalide');
      }

      // Arrête temporairement le scan pour éviter les doubles scans
      await this.stop();

      // Affichage du loader
      const resultDiv = document.getElementById('scan-result');
      const resultContent = document.getElementById('scan-result-content');
      resultDiv.style.display = 'block';
      resultContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid rgba(108, 99, 255, 0.3);
            border-top-color: #6c63ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          "></div>
          <div>Vérification du ticket...</div>
        </div>
      `;

      // Vérification du ticket
      const verifyResult = await ticketsService.verifyTicket(ticketId);

      if (verifyResult.success && verifyResult.valid) {
        // Ticket valide - Marquage comme utilisé
        const markResult = await ticketsService.markTicketUsed(ticketId);

        if (markResult.success) {
          resultContent.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
              <div style="color: #10b981; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                Ticket valide !
              </div>
              <div style="color: rgba(255, 255, 255, 0.7);">
                Événement : ${verifyResult.ticket.eventTitle}
              </div>
            </div>
          `;
          toast.success('Ticket validé avec succès !');

          if (this.onScanSuccess) {
            this.onScanSuccess(verifyResult.ticket);
          }
        } else {
          throw new Error(markResult.error || 'Erreur lors de la validation');
        }
      } else {
        // Ticket invalide
        resultContent.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 12px;">✕</div>
            <div style="color: #ef4444; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
              Ticket invalide !
            </div>
            <div style="color: rgba(255, 255, 255, 0.7);">
              ${verifyResult.error || 'Ce ticket ne peut pas être utilisé'}
            </div>
          </div>
        `;
        toast.error(verifyResult.error || 'Ticket invalide');

        if (this.onScanError) {
          this.onScanError(verifyResult.error);
        }
      }

      // Redémarre le scan après 3 secondes
      setTimeout(() => {
        this.start();
      }, 3000);
    } catch (error) {
      console.error('❌ Error processing QR code:', error);
      toast.error('QR code invalide');

      const resultDiv = document.getElementById('scan-result');
      const resultContent = document.getElementById('scan-result-content');
      resultDiv.style.display = 'block';
      resultContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 12px;">⚠</div>
          <div style="color: #f59e0b; font-size: 18px; font-weight: 600; margin-bottom: 8px;">
            Erreur de lecture
          </div>
          <div style="color: rgba(255, 255, 255, 0.7);">
            ${error.message}
          </div>
        </div>
      `;

      // Redémarre le scan après 3 secondes
      setTimeout(() => {
        this.start();
      }, 3000);
    }
  }

  /**
   * Nettoie le scanner
   */
  async cleanup() {
    if (this.isScanning) {
      await this.stop();
    }
    if (this.scanner) {
      await this.scanner.clear();
    }
  }
}

// Ajoute l'animation de spin si elle n'existe pas
if (!document.getElementById('qr-scanner-animations')) {
  const style = document.createElement('style');
  style.id = 'qr-scanner-animations';
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
