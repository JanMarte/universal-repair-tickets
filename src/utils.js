// src/utils.js

export function formatPhoneNumber(value) {
    if (!value) return '';

    // 1. Strip all non-numeric characters
    const phoneNumber = value.toString().replace(/[^\d]/g, '');

    // 2. Return standard US format: (123) 456-7890
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;

    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }

    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}