export interface Key {
    id: number;
    key: string;
    note: string | null;
    is_active: boolean;
    duration_days: number | null;
    expires_at: Date | null;
    max_hwid_resets: number;
    hwid_resets_used: number;
    hwid: string | null;
    max_uses: number | null;
    current_uses: number;
    created_at: Date;
    activated_at: Date | null;
    last_used_at: Date | null;
    last_ip: string | null;
}
export interface CreateKeyOptions {
    note?: string;
    durationDays?: number | null;
    maxHwidResets?: number;
    maxUses?: number | null;
    customKey?: string;
}
export interface ValidateKeyRequest {
    key: string;
    hwid?: string;
}
export interface ValidateKeyResponse {
    success: boolean;
    message: string;
    data?: {
        expiresAt: Date | null;
        usesRemaining: number | null;
        hwidBound: boolean;
    };
}
export interface ValidationLog {
    id: number;
    key_id: number;
    hwid: string | null;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    failure_reason: string | null;
    created_at: Date;
}
export interface ApiError {
    error: string;
    message: string;
    statusCode: number;
}
export interface KeyStats {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    usedToday: number;
}
//# sourceMappingURL=index.d.ts.map