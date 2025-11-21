/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                      STORAGE SERVICE                               ║
 * ║         Service pour l'upload d'images vers Firebase Storage       ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase.js';

/**
 * Service de gestion du stockage
 */
class StorageService {
  /**
   * Upload une image d'événement
   */
  async uploadEventImage(file, eventId) {
    try {
      // Validation du fichier
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Compression de l'image
      const compressedFile = await this.compressImage(file);

      // Création du chemin de stockage
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `events/${eventId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload du fichier
      await uploadBytes(storageRef, compressedFile);

      // Récupération de l'URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log('✅ Image uploaded:', downloadURL);
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return { success: false, error: 'Erreur lors de l\'upload de l\'image' };
    }
  }

  /**
   * Supprime une image d'événement
   */
  async deleteEventImage(imageUrl) {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);

      console.log('✅ Image deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'image' };
    }
  }

  /**
   * Valide un fichier image
   */
  validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5 MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!file) {
      return { valid: false, error: 'Aucun fichier sélectionné' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Format d\'image non supporté (JPG, PNG, WebP)' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image trop volumineuse (max 5 MB)' };
    }

    return { valid: true };
  }

  /**
   * Compresse une image avant upload
   */
  async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Redimensionnement si nécessaire
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, { type: file.type }));
            },
            file.type,
            quality
          );
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  }
}

// Export de l'instance unique
export const storageService = new StorageService();
