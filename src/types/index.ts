// Key entity from database
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

// Options for creating a new key
export interface CreateKeyOptions {
  note?: string;
  durationDays?: number | null;  // null = lifetime
  maxHwidResets?: number;
  maxUses?: number | null;       // null = unlimited
  customKey?: string;            // Optionally provide your own key
}

// Validation request from client
export interface ValidateKeyRequest {
  key: string;
  hwid?: string;
}

// Validation response
export interface ValidateKeyResponse {
  success: boolean;
  message: string;
  data?: {
    expiresAt: Date | null;
    usesRemaining: number | null;
    hwidBound: boolean;
  };
}

// Validation log entry
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

// API error response
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Key stats for admin dashboard
export interface KeyStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  usedToday: number;
}
