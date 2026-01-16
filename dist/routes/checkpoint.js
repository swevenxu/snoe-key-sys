import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
const router = Router();
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
router.post('/start', (req, res) => {
    const { visitorId, hwid } = req.body;
    if (!visitorId) {
        res.status(400).json({ error: 'visitorId is required' });
        return;
    }
    const token = generateCheckpointToken();
    pendingCheckpoints.set(token, {
        visitorId,
        completedProviders: new Set(),
        createdAt: new Date(),
        hwid,
    });
    res.json({
        success: true,
        token,
        message: 'Checkpoint session started',
    });
});
/**
 * POST /api/checkpoint/verify
 * Verify that a checkpoint was completed
 */
router.post('/verify', (req, res) => {
    const { token, provider } = req.body;
    if (!token || !provider) {
        res.status(400).json({ error: 'token and provider are required' });
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
    const { click_id, uid } = req.query;
    // uid is our session token
    const token = (uid || click_id);
    if (!token) {
        res.status(400).send('Missing token');
        return;
    }
    const checkpoint = pendingCheckpoints.get(token);
    if (checkpoint) {
        checkpoint.completedProviders.add('lootlabs');
        console.log(`[Lootlabs Postback] Verified completion for token: ${token}`);
    }
    // Always return OK to Lootlabs
    res.status(200).send('OK');
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
    // Remove the checkpoint session
    pendingCheckpoints.delete(token);
    res.json({
        success: true,
        key: key.key,
        expiresIn: `${config.checkpointKeyDuration || 1} day(s)`,
        message: 'Key claimed successfully!',
    });
});
export default router;
//# sourceMappingURL=checkpoint.js.map