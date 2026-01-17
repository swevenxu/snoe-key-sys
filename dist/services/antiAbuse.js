import { query } from '../db/index.js';
import { config } from '../config/index.js';
/**
 * Check if a user is allowed to claim a key
 */
export async function checkCanClaim(data) {
    if (!config.antiAbuse.enabled) {
        return { allowed: true };
    }
    const { ipAddress, fingerprint, hwid } = data;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cooldownAgo = new Date(now.getTime() - config.antiAbuse.cooldownHours * 60 * 60 * 1000);
    try {
        // Check cooldown - most recent claim from any matching identifier
        const cooldownResult = await query(`
      SELECT created_at 
      FROM key_claims 
      WHERE (ip_address = $1 OR ($2::text IS NOT NULL AND fingerprint = $2) OR ($3::text IS NOT NULL AND hwid = $3))
        AND created_at > $4
      ORDER BY created_at DESC 
      LIMIT 1
    `, [ipAddress, fingerprint || null, hwid || null, cooldownAgo]);
        if (cooldownResult.rows.length > 0) {
            const lastClaim = new Date(cooldownResult.rows[0].created_at);
            const cooldownEnd = new Date(lastClaim.getTime() + config.antiAbuse.cooldownHours * 60 * 60 * 1000);
            const remainingMs = cooldownEnd.getTime() - now.getTime();
            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
            const remainingHours = Math.floor(remainingMinutes / 60);
            const remainingMins = remainingMinutes % 60;
            return {
                allowed: false,
                reason: `Cooldown active. Please wait ${remainingHours}h ${remainingMins}m before claiming another key.`,
                cooldownRemaining: remainingMinutes,
            };
        }
        // Count claims in last 24 hours by IP
        const ipCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM key_claims 
      WHERE ip_address = $1 AND created_at > $2
    `, [ipAddress, oneDayAgo]);
        const ipClaimsToday = parseInt(ipCountResult.rows[0].count);
        if (ipClaimsToday >= config.antiAbuse.maxKeysPerIpPerDay) {
            return {
                allowed: false,
                reason: `Daily limit reached. You can only claim ${config.antiAbuse.maxKeysPerIpPerDay} keys per day.`,
                claimsToday: { byIp: ipClaimsToday, byFingerprint: 0, byHwid: 0 },
            };
        }
        // Count claims in last 24 hours by fingerprint
        let fingerprintClaimsToday = 0;
        if (fingerprint) {
            const fpCountResult = await query(`
        SELECT COUNT(*) as count 
        FROM key_claims 
        WHERE fingerprint = $1 AND created_at > $2
      `, [fingerprint, oneDayAgo]);
            fingerprintClaimsToday = parseInt(fpCountResult.rows[0].count);
            if (fingerprintClaimsToday >= config.antiAbuse.maxKeysPerFingerprintPerDay) {
                return {
                    allowed: false,
                    reason: `Daily limit reached for this device. Maximum ${config.antiAbuse.maxKeysPerFingerprintPerDay} keys per day.`,
                    claimsToday: { byIp: ipClaimsToday, byFingerprint: fingerprintClaimsToday, byHwid: 0 },
                };
            }
        }
        // Count claims in last 24 hours by HWID
        let hwidClaimsToday = 0;
        if (hwid) {
            const hwidCountResult = await query(`
        SELECT COUNT(*) as count 
        FROM key_claims 
        WHERE hwid = $1 AND created_at > $2
      `, [hwid, oneDayAgo]);
            hwidClaimsToday = parseInt(hwidCountResult.rows[0].count);
            if (hwidClaimsToday >= config.antiAbuse.maxKeysPerHwidPerDay) {
                return {
                    allowed: false,
                    reason: `Daily limit reached for this computer. Maximum ${config.antiAbuse.maxKeysPerHwidPerDay} keys per day.`,
                    claimsToday: { byIp: ipClaimsToday, byFingerprint: fingerprintClaimsToday, byHwid: hwidClaimsToday },
                };
            }
        }
        return {
            allowed: true,
            claimsToday: { byIp: ipClaimsToday, byFingerprint: fingerprintClaimsToday, byHwid: hwidClaimsToday },
        };
    }
    catch (error) {
        console.error('[AntiAbuse] Error checking claim eligibility:', error);
        // On error, allow the claim (fail open) but log it
        return { allowed: true };
    }
}
/**
 * Record a key claim for tracking
 */
export async function recordClaim(data) {
    if (!config.antiAbuse.enabled) {
        return;
    }
    try {
        await query(`
      INSERT INTO key_claims (ip_address, fingerprint, hwid, visitor_id, user_agent, session_token, key_id, key_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            data.ipAddress,
            data.fingerprint || null,
            data.hwid || null,
            data.visitorId || null,
            data.userAgent || null,
            data.sessionToken || null,
            data.keyId,
            data.keyValue,
        ]);
        console.log(`[AntiAbuse] Recorded claim: IP=${data.ipAddress}, HWID=${data.hwid || 'none'}, Key=${data.keyValue}`);
    }
    catch (error) {
        console.error('[AntiAbuse] Error recording claim:', error);
        // Don't fail the claim if we can't record it
    }
}
/**
 * Get claim statistics for an identifier
 */
export async function getClaimStats(ipAddress) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    try {
        const result = await query(`
      SELECT COUNT(*) as count, MAX(created_at) as last_claim
      FROM key_claims 
      WHERE ip_address = $1 AND created_at > $2
    `, [ipAddress, oneDayAgo]);
        const claimsLast24h = parseInt(result.rows[0].count);
        const lastClaimAt = result.rows[0].last_claim ? new Date(result.rows[0].last_claim) : null;
        let cooldownEndsAt = null;
        if (lastClaimAt) {
            cooldownEndsAt = new Date(lastClaimAt.getTime() + config.antiAbuse.cooldownHours * 60 * 60 * 1000);
            if (cooldownEndsAt <= now) {
                cooldownEndsAt = null;
            }
        }
        return { claimsLast24h, lastClaimAt, cooldownEndsAt };
    }
    catch (error) {
        console.error('[AntiAbuse] Error getting claim stats:', error);
        return { claimsLast24h: 0, lastClaimAt: null, cooldownEndsAt: null };
    }
}
//# sourceMappingURL=antiAbuse.js.map