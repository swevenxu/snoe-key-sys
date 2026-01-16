/**
 * Generate a license key in format: PREFIX-XXXX-XXXX-XXXX
 * Example: KEY-A2B3-C4D5-E6F7
 */
export declare function generateKey(): string;
/**
 * Generate multiple keys at once
 */
export declare function generateKeys(count: number): string[];
/**
 * Validate key format (doesn't check database)
 */
export declare function isValidKeyFormat(key: string): boolean;
/**
 * Normalize a key (uppercase, trim whitespace)
 */
export declare function normalizeKey(key: string): string;
/**
 * Generate a secure random token (for admin API keys, etc.)
 */
export declare function generateSecureToken(length?: number): string;
//# sourceMappingURL=keyGenerator.d.ts.map