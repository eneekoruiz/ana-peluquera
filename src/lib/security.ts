/**
 * Security utilities for XSS prevention and input sanitization
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML input to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitizes text input by removing potentially dangerous characters
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeText = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates email format and sanitizes it
 * @param email - The email string to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  const sanitized = sanitizeText(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(sanitized) ? sanitized : null;
};

/**
 * Sanitizes phone number by keeping only digits, spaces, and common separators
 * @param phone - The phone number string to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d\s\-\+\(\)\.]/g, '').trim();
};

/**
 * Rate limiting helper for form submissions
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);

    if (validAttempts.length >= maxAttempts) {
      return false;
    }

    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    return true;
  }
}

export const rateLimiter = new RateLimiter();