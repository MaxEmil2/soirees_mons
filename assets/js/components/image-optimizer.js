/*
 * IMAGE OPTIMIZER
 * Handles image compression, lazy loading, and CDN optimization
 */

import imageCompression from 'https://cdn.skypack.dev/browser-image-compression@2.0.2';

// ==========================================
// COMPRESSION OPTIONS
// ==========================================

const DEFAULT_COMPRESSION_OPTIONS = {
    maxSizeMB: 0.2, // 200KB max
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85
};

const PROFILE_PHOTO_OPTIONS = {
    maxSizeMB: 0.1, // 100KB max
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85
};

const EVENT_IMAGE_OPTIONS = {
    maxSizeMB: 0.3, // 300KB max
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.9
};

// ==========================================
// COMPRESS IMAGE
// ==========================================

export async function compressImage(file, options = {}) {
    try {
        // Validate file
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('Invalid image file');
        }

        // Merge options with defaults
        const compressionOptions = {
            ...DEFAULT_COMPRESSION_OPTIONS,
            ...options
        };

        console.log(`🖼️ Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        // Compress
        const compressedFile = await imageCompression(file, compressionOptions);

        console.log(`✅ Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reduction)`);

        return {
            success: true,
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            reductionPercent: ((1 - compressedFile.size / file.size) * 100).toFixed(0)
        };

    } catch (error) {
        console.error('Image compression error:', error);
        return {
            success: false,
            error: error.message || 'Failed to compress image',
            file: file
        };
    }
}

// ==========================================
// COMPRESS PROFILE PHOTO
// ==========================================

export async function compressProfilePhoto(file) {
    return await compressImage(file, PROFILE_PHOTO_OPTIONS);
}

// ==========================================
// COMPRESS EVENT IMAGE
// ==========================================

export async function compressEventImage(file) {
    return await compressImage(file, EVENT_IMAGE_OPTIONS);
}

// ==========================================
// LAZY LOADING SETUP
// ==========================================

let lazyLoadObserver = null;

export function setupLazyLoading() {
    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
        console.warn('IntersectionObserver not supported, loading all images immediately');
        loadAllImages();
        return;
    }

    // Create observer
    lazyLoadObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    observer.unobserve(img);
                }
            });
        },
        {
            rootMargin: '50px 0px', // Start loading 50px before image enters viewport
            threshold: 0.01
        }
    );

    // Observe all lazy images
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
        lazyLoadObserver.observe(img);
    });

    console.log(`👁️ Lazy loading enabled for ${lazyImages.length} images`);
}

// ==========================================
// LOAD IMAGE
// ==========================================

function loadImage(img) {
    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');

    if (!src) return;

    // Create a new image to preload
    const preloader = new Image();

    preloader.onload = () => {
        img.src = src;
        if (srcset) {
            img.srcset = srcset;
        }
        img.classList.add('loaded');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
    };

    preloader.onerror = () => {
        console.error('Failed to load image:', src);
        img.classList.add('error');
    };

    preloader.src = src;
    if (srcset) {
        preloader.srcset = srcset;
    }
}

// ==========================================
// LOAD ALL IMAGES (FALLBACK)
// ==========================================

function loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => loadImage(img));
}

// ==========================================
// CREATE LAZY IMAGE ELEMENT
// ==========================================

export function createLazyImage(src, alt = '', className = '') {
    const img = document.createElement('img');

    // Set data-src for lazy loading
    img.setAttribute('data-src', src);
    img.alt = alt;
    img.className = className;

    // Add placeholder (low-quality or blur-up technique)
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"%3E%3C/svg%3E';
    img.style.backgroundColor = 'var(--bg-tertiary)';

    // Observe if lazy loading is enabled
    if (lazyLoadObserver) {
        lazyLoadObserver.observe(img);
    } else {
        // Fallback: load immediately
        loadImage(img);
    }

    return img;
}

// ==========================================
// GENERATE RESPONSIVE SRCSET
// ==========================================

export function generateSrcset(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
    // Assumes your storage bucket can resize images on-the-fly
    // Or you've pre-generated multiple sizes
    return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

// ==========================================
// GET OPTIMIZED IMAGE URL
// ==========================================

export function getOptimizedImageUrl(url, options = {}) {
    const {
        width,
        height,
        quality = 85,
        format = 'webp'
    } = options;

    // If using Firebase Storage or CDN that supports transforms
    const params = new URLSearchParams();

    if (width) params.append('w', width);
    if (height) params.append('h', height);
    if (quality) params.append('q', quality);
    if (format) params.append('fm', format);

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
}

// ==========================================
// PREVIEW IMAGE BEFORE UPLOAD
// ==========================================

export function previewImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
        callback({ success: false, error: 'Invalid image file' });
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        callback({
            success: true,
            dataUrl: e.target.result
        });
    };

    reader.onerror = () => {
        callback({
            success: false,
            error: 'Failed to read image file'
        });
    };

    reader.readAsDataURL(file);
}

// ==========================================
// CREATE THUMBNAIL
// ==========================================

export async function createThumbnail(file, maxSize = 150) {
    return await compressImage(file, {
        maxSizeMB: 0.05, // 50KB
        maxWidthOrHeight: maxSize,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.7
    });
}

// ==========================================
// VALIDATE IMAGE
// ==========================================

export function validateImage(file, options = {}) {
    const {
        maxSizeMB = 5,
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        minWidth = 0,
        minHeight = 0,
        maxWidth = 10000,
        maxHeight = 10000
    } = options;

    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
        };
    }

    // Check file size
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
        return {
            valid: false,
            error: `File too large. Maximum: ${maxSizeMB}MB (current: ${fileSizeMB.toFixed(2)}MB)`
        };
    }

    // Check dimensions (requires image to be loaded)
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            if (img.width < minWidth || img.height < minHeight) {
                resolve({
                    valid: false,
                    error: `Image too small. Minimum: ${minWidth}x${minHeight}px (current: ${img.width}x${img.height}px)`
                });
                return;
            }

            if (img.width > maxWidth || img.height > maxHeight) {
                resolve({
                    valid: false,
                    error: `Image too large. Maximum: ${maxWidth}x${maxHeight}px (current: ${img.width}x${img.height}px)`
                });
                return;
            }

            resolve({
                valid: true,
                width: img.width,
                height: img.height
            });
        };

        img.onerror = () => {
            resolve({
                valid: false,
                error: 'Failed to load image for validation'
            });
        };

        img.src = URL.createObjectURL(file);
    });
}

// ==========================================
// BATCH COMPRESS IMAGES
// ==========================================

export async function batchCompressImages(files, options = {}, onProgress = null) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const result = await compressImage(files[i], options);
        results.push(result);

        if (typeof onProgress === 'function') {
            onProgress({
                current: i + 1,
                total: files.length,
                percent: ((i + 1) / files.length * 100).toFixed(0)
            });
        }
    }

    return results;
}

// ==========================================
// CLEANUP
// ==========================================

export function destroyLazyLoading() {
    if (lazyLoadObserver) {
        lazyLoadObserver.disconnect();
        lazyLoadObserver = null;
    }
}

// ==========================================
// EXPORT
// ==========================================

export default {
    compressImage,
    compressProfilePhoto,
    compressEventImage,
    setupLazyLoading,
    destroyLazyLoading,
    createLazyImage,
    generateSrcset,
    getOptimizedImageUrl,
    previewImage,
    createThumbnail,
    validateImage,
    batchCompressImages
};
