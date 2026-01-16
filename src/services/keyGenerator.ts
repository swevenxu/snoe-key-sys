import { nanoid, customAlphabet } from 'nanoid';
import { config } from '../config/index.js';

// Custom alphabet for readable keys (no confusing characters like 0/O, 1/l/I/L)
const keyAlphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateSegment = customAlphabet(keyAlphabet, 4);

/**
 * Generate a license key in format: PREFIX-XXXX-XXXX-XXXX
 * Example: KEY-A2B3-C4D5-E6F7
 */
export function generateKey(): string {
  const prefix = config.keyPrefix;
  const segment1 = generateSegment();
  const segment2 = generateSegment();
  const segment3 = generateSegment();
  
  return `${prefix}-${segment1}-${segment2}-${segment3}`;
}

/**
 * Generate multiple keys at once
 */
export function generateKeys(count: number): string[] {
  const keys: string[] = [];
  const keySet = new Set<string>();
  
  while (keys.length < count) {
    const key = generateKey();
    // Ensure uniqueness within batch
    if (!keySet.has(key)) {
      keySet.add(key);
      keys.push(key);
    }
  }
  
  return keys;
}

/**
 * Validate key format (doesn't check database)
 */
export function isValidKeyFormat(key: string): boolean {
  // Match format: PREFIX-XXXX-XXXX-XXXX
  const pattern = new RegExp(`^[A-Z]+-[${keyAlphabet}]{4}-[${keyAlphabet}]{4}-[${keyAlphabet}]{4}$`);
  return pattern.test(key.toUpperCase());
}

/**
 * Normalize a key (uppercase, trim whitespace)
 */
export function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
}

/**
 * Generate a secure random token (for admin API keys, etc.)
 */
export function generateSecureToken(length: number = 32): string {
  return nanoid(length);
}
