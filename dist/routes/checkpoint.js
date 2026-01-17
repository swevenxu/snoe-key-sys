import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { checkCanClaim, recordClaim } from '../services/antiAbuse.js';
const router = Router();
// Helper to get client IP
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
// Store pending checkpoints (in production, use Redis or database)
const pendingCheckpoints = new Map();
// Clean up old checkpoints every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of pendingCheckpoints.entries()) {
        // Remove checkpoints older than 1 hour
        if (now - data.createdAt.getTime() > 60 * 60 * 1000) {
            pendingCheckpoints.delete(token);
        }
    }
}, 10 * 60 * 1000);
/**
 * Generate a unique checkpoint token for a visitor
 */
function generateCheckpointToken() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * POST /api/checkpoint/start
 * Start a new checkpoint session
 */
router.post('/start', async (req, res) => {
    const { visitorId, hwid, fingerprint } = req.body;
    if (!visitorId) {
        res.status(400).json({ error: 'visitorId is required' });
        return;
    }
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || undefined;
    // Check if user can claim before starting session
    const canClaim = await checkCanClaim({
        ipAddress,
        fingerprint,
        hwid,
        visitorId,
    });
    const token = generateCheckpointToken();
    pendingCheckpoints.set(token, {
        visitorId,
        completedProviders: new Set(),
        createdAt: new Date(),
        hwid,
        ipAddress,
        fingerprint,
        userAgent,
    });
    res.json({
        success: true,
        token,
        message: 'Checkpoint session started',
        // Include eligibility info so frontend can show warnings early
        eligibility: {
            canClaim: canClaim.allowed,
            reason: canClaim.reason,
            cooldownRemaining: canClaim.cooldownRemaining,
        },
    });
});
/**
 * POST /api/checkpoint/verify
 * Verify that a checkpoint was completed
 * NOTE: LootLabs cannot be verified via this endpoint (must use postback)
 */
router.post('/verify', (req, res) => {
    const { token, provider } = req.body;
    if (!token || !provider) {
        res.status(400).json({ error: 'token and provider are required' });
        return;
    }
    // Block client-side verification for providers that require server-side postback
    const serverOnlyProviders = ['lootlabs'];
    if (serverOnlyProviders.includes(provider.toLowerCase())) {
        console.log(`[Verify] Blocked client verification attempt for ${provider}`);
        res.status(403).json({
            error: 'This provider requires server-side verification',
            message: 'Please complete the checkpoint properly. Verification will happen automatically.'
        });
        return;
    }
    const checkpoint = pendingCheckpoints.get(token);
    if (!checkpoint) {
        res.status(404).json({ error: 'Invalid or expired checkpoint token' });
        return;
    }
    // Mark provider as completed
    checkpoint.completedProviders.add(provider.toLowerCase());
    res.json({
        success: true,
        completedProviders: Array.from(checkpoint.completedProviders),
        message: `${provider} checkpoint completed`,
    });
});
/**
 * GET /api/checkpoint/postback/lootlabs
 * Lootlabs postback - called when user completes ad
 */
router.get('/postback/lootlabs', (req, res) => {
    console.log('[Lootlabs Postback] Received:', req.query);
    const { click_id, uid, unique_id } = req.query;
    // Try all possible token sources
    const token = (uid || unique_id || click_id);
    console.log('[Lootlabs Postback] Token:', token);
    console.log('[Lootlabs Postback] All sessions:', Array.from(pendingCheckpoints.keys()));
    if (!token) {
        console.log('[Lootlabs Postback] No token found');
        res.status(200).send('OK');
        return;
    }
    const checkpoint = pendingCheckpoints.get(token);
    if (checkpoint) {
        checkpoint.completedProviders.add('lootlabs');
        console.log(`[Lootlabs Postback] ✓ Verified completion for token: ${token}`);
    }
    else {
        console.log(`[Lootlabs Postback] ✗ No checkpoint found for token: ${token}`);
    }
    // Always return OK to Lootlabs
    res.status(200).send('OK');
});
/**
 * GET /api/checkpoint/complete/lootlabs
 * User redirect endpoint - just sends user back to getkey page
 * NOTE: This does NOT mark completion - only the postback can do that (anti-bypass)
 */
router.get('/complete/lootlabs', (req, res) => {
    const { uid, unique_id } = req.query;
    const token = (uid || unique_id);
    console.log('[Lootlabs Complete] User redirect received:', { uid, unique_id, token });
    // Check if postback already verified this session
    if (token) {
        const checkpoint = pendingCheckpoints.get(token);
        if (checkpoint && checkpoint.completedProviders.has('lootlabs')) {
            console.log(`[Lootlabs Complete] ✓ Already verified via postback for token: ${token}`);
            res.redirect(`/getkey?lootlabs_completed=true`);
            return;
        }
        else {
            // Postback hasn't arrived yet - redirect without completion flag
            // The client will poll for completion
            console.log(`[Lootlabs Complete] Postback not yet received for token: ${token}`);
        }
    }
    // Redirect back to getkey page - client will poll for postback verification
    res.redirect('/getkey');
});
/**
 * POST /api/checkpoint/verify-linkvertise
 * Verify Linkvertise hash using their anti-bypass API
 */
router.post('/verify-linkvertise', async (req, res) => {
    const { hash, token } = req.body;
    if (!hash || !token) {
        res.status(400).json({ error: 'hash and token are required' });
        return;
    }
    const LINKVERTISE_TOKEN = '75548935d867a96b626e7414463a3b22046ff96697698d008c34bbd3b68e2b4b';
    try {
        // Verify with Linkvertise API
        const response = await fetch(`https://publisher.linkvertise.com/api/v1/redirect/link/static?token=${LINKVERTISE_TOKEN}&hash=${hash}`);
        const data = await response.json();
        console.log('[Linkvertise Verify] Response:', data);
        if (data.success || data.valid) {
            // Hash is valid - user completed Linkvertise
            const checkpoint = pendingCheckpoints.get(token);
            if (checkpoint) {
                checkpoint.completedProviders.add('linkvertise');
                console.log(`[Linkvertise] Verified completion for token: ${token}`);
            }
            res.json({ success: true, message: 'Linkvertise completed' });
        }
        else {
            res.json({ success: false, message: 'Invalid hash - checkpoint not completed' });
        }
    }
    catch (error) {
        console.error('[Linkvertise Verify] Error:', error);
        res.status(500).json({ error: 'Failed to verify with Linkvertise' });
    }
});
/**
 * GET /api/checkpoint/status/:token
 * Check the status of a checkpoint session
 */
router.get('/status/:token', (req, res) => {
    const { token } = req.params;
    const checkpoint = pendingCheckpoints.get(token);
    if (!checkpoint) {
        res.status(404).json({ error: 'Invalid or expired checkpoint token' });
        return;
    }
    const requiredProviders = config.requiredCheckpoints || 1;
    const completed = checkpoint.completedProviders.size >= requiredProviders;
    res.json({
        success: true,
        completedProviders: Array.from(checkpoint.completedProviders),
        completedCount: checkpoint.completedProviders.size,
        requiredCount: requiredProviders,
        canGetKey: completed,
    });
});
/**
 * POST /api/checkpoint/claim
 * Claim a key after completing checkpoints
 */
router.post('/claim', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        res.status(400).json({ error: 'token is required' });
        return;
    }
    const checkpoint = pendingCheckpoints.get(token);
    if (!checkpoint) {
        res.status(404).json({ error: 'Invalid or expired checkpoint token' });
        return;
    }
    const requiredProviders = config.requiredCheckpoints || 1;
    if (checkpoint.completedProviders.size < requiredProviders) {
        res.status(400).json({
            error: 'Checkpoints not completed',
            completedCount: checkpoint.completedProviders.size,
            requiredCount: requiredProviders,
        });
        return;
    }
    // Get current IP (might be different from when session started)
    const currentIp = getClientIp(req);
    const ipAddress = checkpoint.ipAddress || currentIp;
    // Check anti-abuse limits before allowing claim
    const canClaim = await checkCanClaim({
        ipAddress,
        fingerprint: checkpoint.fingerprint,
        hwid: checkpoint.hwid,
        visitorId: checkpoint.visitorId,
    });
    if (!canClaim.allowed) {
        console.log(`[Checkpoint] Claim blocked: IP=${ipAddress}, HWID=${checkpoint.hwid}, Reason=${canClaim.reason}`);
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: canClaim.reason,
            cooldownRemaining: canClaim.cooldownRemaining,
        });
        return;
    }
    // Generate a new key for the user
    const { createKey } = await import('../services/keyService.js');
    const key = await createKey({
        note: `Checkpoint claim - ${checkpoint.visitorId}`,
        durationDays: config.checkpointKeyDuration || 1, // 1 day default for free keys
        maxHwidResets: 0,
    });
    // Bind HWID if provided
    if (checkpoint.hwid) {
        const { query } = await import('../db/index.js');
        await query('UPDATE keys SET hwid = $1 WHERE id = $2', [checkpoint.hwid, key.id]);
    }
    // Record the claim for rate limiting
    await recordClaim({
        ipAddress,
        fingerprint: checkpoint.fingerprint,
        hwid: checkpoint.hwid,
        visitorId: checkpoint.visitorId,
        userAgent: checkpoint.userAgent,
        sessionToken: token,
        keyId: key.id,
        keyValue: key.key,
    });
    // Remove the checkpoint session
    pendingCheckpoints.delete(token);
    console.log(`[Checkpoint] Key claimed: IP=${ipAddress}, HWID=${checkpoint.hwid}, Key=${key.key}`);
    res.json({
        success: true,
        key: key.key,
        expiresIn: `${config.checkpointKeyDuration || 1} day(s)`,
        message: 'Key claimed successfully!',
    });
});
export default router;
//# sourceMappingURL=checkpoint.js.map