// src/utils.js

// 1. Phone Formatter (Your version is great, kept it)
export function formatPhoneNumber(value) {
    if (!value) return '';

    // Strip all non-numeric characters
    const phoneNumber = value.toString().replace(/[^\d]/g, '');

    // Return standard US format: (123) 456-7890
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;

    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }

    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

// 2. Currency Formatter (Add this!)
// This ensures all prices look like "$150.00" instead of "150"
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
}