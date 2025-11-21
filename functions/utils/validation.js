/**
 * INPUT VALIDATION UTILITIES
 * Server-side validation for all Cloud Functions
 */

const validator = require('validator');

// ==========================================
// STRING VALIDATION
// ==========================================

function validateString(value, minLength = 1, maxLength = 1000) {
    if (typeof value !== 'string') {
        return { valid: false, error: 'Must be a string' };
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength) {
        return { valid: false, error: `Must be at least ${minLength} characters` };
    }

    if (trimmed.length > maxLength) {
        return { valid: false, error: `Must be at most ${maxLength} characters` };
    }

    return { valid: true, value: trimmed };
}

// ==========================================
// EMAIL VALIDATION
// ==========================================

function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    if (!validator.isEmail(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, value: email.toLowerCase().trim() };
}

// ==========================================
// URL VALIDATION
// ==========================================

function validateURL(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }

    if (!validator.isURL(url, { require_protocol: true, protocols: ['http', 'https'] })) {
        return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true, value: url.trim() };
}

// ==========================================
// NUMBER VALIDATION
// ==========================================

function validateNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = Number(value);

    if (isNaN(num)) {
        return { valid: false, error: 'Must be a valid number' };
    }

    if (num < min) {
        return { valid: false, error: `Must be at least ${min}` };
    }

    if (num > max) {
        return { valid: false, error: `Must be at most ${max}` };
    }

    return { valid: true, value: num };
}

// ==========================================
// DATE VALIDATION
// ==========================================

function validateDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date format' };
    }

    return { valid: true, value: date };
}

function validateFutureDate(dateString) {
    const result = validateDate(dateString);

    if (!result.valid) {
        return result;
    }

    if (result.value <= new Date()) {
        return { valid: false, error: 'Date must be in the future' };
    }

    return result;
}

// ==========================================
// PRICE VALIDATION (IN CENTS)
// ==========================================

function validatePrice(price) {
    const result = validateNumber(price, 50, 1000000); // Min 0.50€, Max 10,000€

    if (!result.valid) {
        return result;
    }

    // Must be an integer (no decimals in cents)
    if (!Number.isInteger(result.value)) {
        return { valid: false, error: 'Price must be an integer (in cents)' };
    }

    return result;
}

// ==========================================
// AGE VALIDATION
// ==========================================

function validateAge(age) {
    return validateNumber(age, 0, 99);
}

// ==========================================
// ENUM VALIDATION
// ==========================================

function validateEnum(value, allowedValues) {
    if (!allowedValues.includes(value)) {
        return { valid: false, error: `Must be one of: ${allowedValues.join(', ')}` };
    }

    return { valid: true, value };
}

// ==========================================
// BOOLEAN VALIDATION
// ==========================================

function validateBoolean(value) {
    if (typeof value !== 'boolean') {
        return { valid: false, error: 'Must be a boolean' };
    }

    return { valid: true, value };
}

// ==========================================
// SANITIZE HTML
// ==========================================

function sanitizeHTML(html) {
    if (typeof html !== 'string') {
        return '';
    }

    // Remove script tags and event handlers
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
}

// ==========================================
// VALIDATE EVENT DATA
// ==========================================

function validateEventData(data) {
    const errors = [];

    // Name
    const nameResult = validateString(data.name, 3, 100);
    if (!nameResult.valid) {
        errors.push({ field: 'name', error: nameResult.error });
    }

    // Description
    const descResult = validateString(data.description, 10, 2000);
    if (!descResult.valid) {
        errors.push({ field: 'description', error: descResult.error });
    }

    // Location
    const locationResult = validateString(data.location, 3, 200);
    if (!locationResult.valid) {
        errors.push({ field: 'location', error: locationResult.error });
    }

    // Date (must be in future)
    const dateResult = validateFutureDate(data.date);
    if (!dateResult.valid) {
        errors.push({ field: 'date', error: dateResult.error });
    }

    // Price
    const priceResult = validateNumber(data.price, 0, 999);
    if (!priceResult.valid) {
        errors.push({ field: 'price', error: priceResult.error });
    }

    // Age
    const ageResult = validateAge(data.age);
    if (!ageResult.valid) {
        errors.push({ field: 'age', error: ageResult.error });
    }

    // Link (optional)
    if (data.link) {
        const linkResult = validateURL(data.link);
        if (!linkResult.valid) {
            errors.push({ field: 'link', error: linkResult.error });
        }
    }

    // Presales (optional)
    if (data.presales !== undefined) {
        const presalesResult = validateBoolean(data.presales);
        if (!presalesResult.valid) {
            errors.push({ field: 'presales', error: presalesResult.error });
        }

        // If presales enabled, validate ticket price and end date
        if (data.presales === true) {
            if (data.ticketPrice !== undefined) {
                const ticketPriceResult = validatePrice(data.ticketPrice);
                if (!ticketPriceResult.valid) {
                    errors.push({ field: 'ticketPrice', error: ticketPriceResult.error });
                }
            }

            if (data.presalesEndDate) {
                const endDateResult = validateFutureDate(data.presalesEndDate);
                if (!endDateResult.valid) {
                    errors.push({ field: 'presalesEndDate', error: endDateResult.error });
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    validateString,
    validateEmail,
    validateURL,
    validateNumber,
    validateDate,
    validateFutureDate,
    validatePrice,
    validateAge,
    validateEnum,
    validateBoolean,
    sanitizeHTML,
    validateEventData
};
