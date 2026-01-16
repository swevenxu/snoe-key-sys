import { describe, it, expect } from 'vitest';
import { generateKey, generateKeys, isValidKeyFormat, normalizeKey, generateSecureToken, } from '../services/keyGenerator.js';
describe('Key Generator', () => {
    describe('generateKey', () => {
        it('should generate a key in correct format', () => {
            const key = generateKey();
            expect(key).toMatch(/^KEY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        });
        it('should generate unique keys', () => {
            const keys = new Set();
            for (let i = 0; i < 100; i++) {
                keys.add(generateKey());
            }
            expect(keys.size).toBe(100);
        });
        it('should not contain confusing characters (0, O, 1, I, L) in generated segments', () => {
            for (let i = 0; i < 50; i++) {
                const key = generateKey();
                // Only check the generated segments, not the prefix
                const segments = key.split('-').slice(1).join('');
                expect(segments).not.toMatch(/[0OIL1]/);
            }
        });
    });
    describe('generateKeys', () => {
        it('should generate the requested number of keys', () => {
            const keys = generateKeys(10);
            expect(keys).toHaveLength(10);
        });
        it('should generate all unique keys', () => {
            const keys = generateKeys(50);
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(50);
        });
    });
    describe('isValidKeyFormat', () => {
        it('should return true for valid key format', () => {
            expect(isValidKeyFormat('KEY-ABCD-EFGH-JKMN')).toBe(true);
            expect(isValidKeyFormat('KEY-2345-6789-NPQR')).toBe(true);
        });
        it('should return false for invalid formats', () => {
            expect(isValidKeyFormat('INVALID')).toBe(false);
            expect(isValidKeyFormat('KEY-ABC-DEFG-HJKM')).toBe(false); // Short segment
            expect(isValidKeyFormat('KEY-ABCDE-FGHI-JKMN')).toBe(false); // Long segment
            expect(isValidKeyFormat('')).toBe(false);
        });
        it('should handle case insensitivity', () => {
            expect(isValidKeyFormat('key-abcd-efgh-jkmn')).toBe(true);
        });
    });
    describe('normalizeKey', () => {
        it('should uppercase the key', () => {
            expect(normalizeKey('key-abcd-efgh-jklm')).toBe('KEY-ABCD-EFGH-JKLM');
        });
        it('should trim whitespace', () => {
            expect(normalizeKey('  KEY-ABCD-EFGH-JKLM  ')).toBe('KEY-ABCD-EFGH-JKLM');
        });
    });
    describe('generateSecureToken', () => {
        it('should generate token of specified length', () => {
            expect(generateSecureToken(16)).toHaveLength(16);
            expect(generateSecureToken(32)).toHaveLength(32);
            expect(generateSecureToken(64)).toHaveLength(64);
        });
        it('should generate unique tokens', () => {
            const tokens = new Set();
            for (let i = 0; i < 100; i++) {
                tokens.add(generateSecureToken());
            }
            expect(tokens.size).toBe(100);
        });
    });
});
//# sourceMappingURL=keyGenerator.test.js.map