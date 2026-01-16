import type { Key, CreateKeyOptions, ValidateKeyResponse } from '../types/index.js';
/**
 * Create a new license key
 */
export declare function createKey(options?: CreateKeyOptions): Promise<Key>;
/**
 * Create multiple keys at once
 */
export declare function createKeys(count: number, options?: Omit<CreateKeyOptions, 'customKey'>): Promise<Key[]>;
/**
 * Get a key by its string value
 */
export declare function getKeyByValue(keyValue: string): Promise<Key | null>;
/**
 * Get a key by ID
 */
export declare function getKeyById(id: number): Promise<Key | null>;
/**
 * Get all keys with optional filters
 */
export declare function getAllKeys(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
}): Promise<Key[]>;
/**
 * Validate a key and optionally bind HWID
 */
export declare function validateKey(keyValue: string, hwid?: string, clientIp?: string): Promise<ValidateKeyResponse>;
/**
 * Reset HWID for a key (if resets are available)
 */
export declare function resetHwid(keyValue: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Revoke/disable a key
 */
export declare function revokeKey(keyValue: string): Promise<boolean>;
/**
 * Reactivate a key
 */
export declare function activateKey(keyValue: string): Promise<boolean>;
/**
 * Extend a key's expiration
 */
export declare function extendKey(keyValue: string, additionalDays: number): Promise<boolean>;
/**
 * Delete a key permanently
 */
export declare function deleteKey(keyValue: string): Promise<boolean>;
/**
 * Get validation logs for a key
 */
export declare function getKeyLogs(keyValue: string, limit?: number): Promise<any[]>;
/**
 * Get key statistics
 */
export declare function getKeyStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    validationsToday: number;
}>;
//# sourceMappingURL=keyService.d.ts.map