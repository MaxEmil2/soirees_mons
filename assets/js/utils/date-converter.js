/**
 * DATE CONVERTER UTILITY
 * Universal date conversion for Firestore data
 */

/**
 * Convert various date formats to JavaScript Date object
 * Handles Firestore Timestamps, ISO strings, Unix timestamps, etc.
 * @param {*} value - The value to convert
 * @returns {Date|null} - JavaScript Date object or null
 */
export function convertToDate(value) {
    if (!value) return null;

    // If it's already a Date object
    if (value instanceof Date) return value;

    // If it's a Firestore Timestamp
    if (value && typeof value.toDate === 'function') {
        return value.toDate();
    }

    // If it's a string or number, try to parse it
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    return null;
}

/**
 * Convert Firestore document data with date fields
 * @param {Object} data - Firestore document data
 * @param {Array} dateFields - Array of field names that contain dates
 * @returns {Object} - Data with converted dates
 */
export function convertDocumentDates(data, dateFields = []) {
    const result = { ...data };

    for (const field of dateFields) {
        if (result[field]) {
            result[field] = convertToDate(result[field]);
        }
    }

    return result;
}
