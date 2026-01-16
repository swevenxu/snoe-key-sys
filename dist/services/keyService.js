import { query } from '../db/index.js';
import { generateKey, normalizeKey } from './keyGenerator.js';
/**
 * Create a new license key
 */
export async function createKey(options = {}) {
    const key = options.customKey ? normalizeKey(options.customKey) : generateKey();
    const result = await query(`INSERT INTO keys (key, note, duration_days, max_hwid_resets, max_uses)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [
        key,
        options.note || null,
        options.durationDays ?? null,
        options.maxHwidResets ?? 0,
        options.maxUses ?? null,
    ]);
    return result.rows[0];
}
/**
 * Create multiple keys at once
 */
export async function createKeys(count, options = {}) {
    const keys = [];
    for (let i = 0; i < count; i++) {
        const key = await createKey(options);
        keys.push(key);
    }
    return keys;
}
/**
 * Get a key by its string value
 */
export async function getKeyByValue(keyValue) {
    const result = await query('SELECT * FROM keys WHERE key = $1', [normalizeKey(keyValue)]);
    return result.rows[0] || null;
}
/**
 * Get a key by ID
 */
export async function getKeyById(id) {
    const result = await query('SELECT * FROM keys WHERE id = $1', [id]);
    return result.rows[0] || null;
}
/**
 * Get all keys with optional filters
 */
export async function getAllKeys(filters) {
    let sql = 'SELECT * FROM keys WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    if (filters?.isActive !== undefined) {
        sql += ` AND is_active = $${paramIndex++}`;
        params.push(filters.isActive);
    }
    sql += ' ORDER BY created_at DESC';
    if (filters?.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
    }
    if (filters?.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
    }
    const result = await query(sql, params);
    return result.rows;
}
/**
 * Validate a key and optionally bind HWID
 */
export async function validateKey(keyValue, hwid, clientIp) {
    const key = await getKeyByValue(keyValue);
    // Key doesn't exist
    if (!key) {
        await logValidation(null, hwid, clientIp, false, 'invalid_key');
        return {
            success: false,
            message: 'Invalid key',
        };
    }
    // Key is disabled/revoked
    if (!key.is_active) {
        await logValidation(key.id, hwid, clientIp, false, 'key_disabled');
        return {
            success: false,
            message: 'This key has been disabled',
        };
    }
    // Check expiration
    if (key.expires_at && new Date() > new Date(key.expires_at)) {
        await logValidation(key.id, hwid, clientIp, false, 'key_expired');
        return {
            success: false,
            message: 'This key has expired',
        };
    }
    // Check usage limits
    if (key.max_uses !== null && key.current_uses >= key.max_uses) {
        await logValidation(key.id, hwid, clientIp, false, 'max_uses_exceeded');
        return {
            success: false,
            message: 'This key has reached its maximum uses',
        };
    }
    // HWID validation
    if (hwid) {
        if (key.hwid && key.hwid !== hwid) {
            await logValidation(key.id, hwid, clientIp, false, 'hwid_mismatch');
            return {
                success: false,
                message: 'This key is bound to a different device',
            };
        }
    }
    // All checks passed - update key
    const now = new Date();
    let expiresAt = key.expires_at;
    // Set expiration on first use if duration is set
    if (!key.activated_at && key.duration_days) {
        expiresAt = new Date(now.getTime() + key.duration_days * 24 * 60 * 60 * 1000);
    }
    // Bind HWID on first use if provided
    const boundHwid = key.hwid || hwid || null;
    await query(`UPDATE keys SET
       hwid = COALESCE(hwid, $1),
       current_uses = current_uses + 1,
       activated_at = COALESCE(activated_at, $2),
       expires_at = COALESCE(expires_at, $3),
       last_used_at = $2,
       last_ip = $4
     WHERE id = $5`, [boundHwid, now, expiresAt, clientIp, key.id]);
    await logValidation(key.id, hwid, clientIp, true, null);
    return {
        success: true,
        message: 'Key validated successfully',
        data: {
            expiresAt,
            usesRemaining: key.max_uses ? key.max_uses - key.current_uses - 1 : null,
            hwidBound: !!boundHwid,
        },
    };
}
/**
 * Reset HWID for a key (if resets are available)
 */
export async function resetHwid(keyValue) {
    const key = await getKeyByValue(keyValue);
    if (!key) {
        return { success: false, message: 'Key not found' };
    }
    if (key.hwid_resets_used >= key.max_hwid_resets) {
        return { success: false, message: 'No HWID resets remaining' };
    }
    await query(`UPDATE keys SET hwid = NULL, hwid_resets_used = hwid_resets_used + 1 WHERE id = $1`, [key.id]);
    return {
        success: true,
        message: `HWID reset successful. ${key.max_hwid_resets - key.hwid_resets_used - 1} resets remaining`,
    };
}
/**
 * Revoke/disable a key
 */
export async function revokeKey(keyValue) {
    const result = await query('UPDATE keys SET is_active = false WHERE key = $1', [normalizeKey(keyValue)]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Reactivate a key
 */
export async function activateKey(keyValue) {
    const result = await query('UPDATE keys SET is_active = true WHERE key = $1', [normalizeKey(keyValue)]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Extend a key's expiration
 */
export async function extendKey(keyValue, additionalDays) {
    const key = await getKeyByValue(keyValue);
    if (!key) {
        return false;
    }
    const baseDate = key.expires_at ? new Date(key.expires_at) : new Date();
    const newExpiry = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    const result = await query('UPDATE keys SET expires_at = $1 WHERE id = $2', [newExpiry, key.id]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Delete a key permanently
 */
export async function deleteKey(keyValue) {
    const result = await query('DELETE FROM keys WHERE key = $1', [normalizeKey(keyValue)]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Log a validation attempt
 */
async function logValidation(keyId, hwid, ip, success, failureReason) {
    try {
        await query(`INSERT INTO validation_logs (key_id, hwid, ip_address, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`, [keyId, hwid || null, ip || null, success, failureReason]);
    }
    catch (error) {
        // Don't fail validation if logging fails
        console.error('Failed to log validation:', error);
    }
}
/**
 * Get validation logs for a key
 */
export async function getKeyLogs(keyValue, limit = 50) {
    const key = await getKeyByValue(keyValue);
    if (!key) {
        return [];
    }
    const result = await query(`SELECT * FROM validation_logs WHERE key_id = $1 ORDER BY created_at DESC LIMIT $2`, [key.id, limit]);
    return result.rows;
}
/**
 * Get key statistics
 */
export async function getKeyStats() {
    const statsResult = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active,
      COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired
    FROM keys
  `);
    const todayResult = await query(`
    SELECT COUNT(*) as count 
    FROM validation_logs 
    WHERE created_at >= CURRENT_DATE
  `);
    return {
        total: parseInt(statsResult.rows[0].total),
        active: parseInt(statsResult.rows[0].active),
        expired: parseInt(statsResult.rows[0].expired),
        validationsToday: parseInt(todayResult.rows[0].count),
    };
}
//# sourceMappingURL=keyService.js.map