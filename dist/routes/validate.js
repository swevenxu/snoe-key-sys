import { Router } from 'express';
import { validateKey, resetHwid } from '../services/keyService.js';
import { validateBody, schemas } from '../middleware/validate.js';
import { getClientIp } from '../middleware/auth.js';
const router = Router();
/**
 * POST /api/validate
 * Validate a license key (main endpoint for Lua scripts)
 *
 * Body: { key: string, hwid?: string }
 */
router.post('/', validateBody(schemas.validateKey), async (req, res) => {
    const { key, hwid } = req.body;
    const clientIp = getClientIp(req);
    const result = await validateKey(key, hwid, clientIp);
    if (result.success) {
        res.json(result);
    }
    else {
        // Return 200 even for invalid keys (so Lua can parse response)
        // The success: false indicates the key is invalid
        res.json(result);
    }
});
/**
 * POST /api/validate/reset-hwid
 * Reset HWID for a key (if user has resets available)
 *
 * Body: { key: string }
 */
router.post('/reset-hwid', validateBody(schemas.resetHwid), async (req, res) => {
    const { key } = req.body;
    const result = await resetHwid(key);
    res.json(result);
});
export default router;
//# sourceMappingURL=validate.js.map