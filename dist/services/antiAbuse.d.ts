interface ClaimCheck {
    allowed: boolean;
    reason?: string;
    cooldownRemaining?: number;
    claimsToday?: {
        byIp: number;
        byFingerprint: number;
        byHwid: number;
    };
}
interface ClaimData {
    ipAddress: string;
    fingerprint?: string;
    hwid?: string;
    visitorId?: string;
    userAgent?: string;
    sessionToken?: string;
}
/**
 * Check if a user is allowed to claim a key
 */
export declare function checkCanClaim(data: ClaimData): Promise<ClaimCheck>;
/**
 * Record a key claim for tracking
 */
export declare function recordClaim(data: ClaimData & {
    keyId: number;
    keyValue: string;
}): Promise<void>;
/**
 * Get claim statistics for an identifier
 */
export declare function getClaimStats(ipAddress: string): Promise<{
    claimsLast24h: number;
    lastClaimAt: Date | null;
    cooldownEndsAt: Date | null;
}>;
export {};
//# sourceMappingURL=antiAbuse.d.ts.map