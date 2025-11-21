/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                    VITE CONFIGURATION                              ║
 * ║              Build optimisé pour la production                     ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  // Dossier source
  root: '.',

  // Dossier de sortie
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // Optimisations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprime les console.log en production
        drop_debugger: true
      }
    },

    // Taille des chunks
    chunkSizeWarningLimit: 1000,

    // Split vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions'
          ],
          vendor: ['html5-qrcode', 'qrcode']
        }
      }
    }
  },

  // Plugins
  plugins: [
    // Compression Gzip
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Compresse seulement les fichiers > 10kb
      deleteOriginFile: false
    }),

    // Compression Brotli
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false
    })
  ],

  // Serveur de développement
  server: {
    port: 5173,
    open: true,
    cors: true
  },

  // Preview
  preview: {
    port: 4173,
    open: true
  }
});
