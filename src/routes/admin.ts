import { Router, Request, Response } from 'express';
import {
  createKey,
  createKeys,
  getKeyByValue,
  getAllKeys,
  revokeKey,
  activateKey,
  extendKey,
  deleteKey,
  getKeyLogs,
  getKeyStats,
  resetHwid,
} from '../services/keyService.js';
import { adminAuth } from '../middleware/auth.js';
import { validateBody, schemas } from '../middleware/validate.js';

const router = Router();

// All admin routes require authentication
router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Get key system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  const stats = await getKeyStats();
  res.json(stats);
});

/**
 * GET /api/admin/keys
 * List all keys with optional filters
 * 
 * Query: ?active=true&limit=50&offset=0
 */
router.get('/keys', async (req: Request, res: Response) => {
  const { active, limit, offset } = req.query;
  
  const keys = await getAllKeys({
    isActive: active === 'true' ? true : active === 'false' ? false : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });
  
  res.json({ keys, count: keys.length });
});

/**
 * POST /api/admin/keys
 * Create a new key
 * 
 * Body: { note?, durationDays?, maxHwidResets?, maxUses?, customKey? }
 */
router.post(
  '/keys',
  validateBody(schemas.createKey),
  async (req: Request, res: Response) => {
    const key = await createKey(req.body);
    res.status(201).json(key);
  }
);

/**
 * POST /api/admin/keys/batch
 * Create multiple keys at once
 * 
 * Body: { count: number, note?, durationDays?, maxHwidResets?, maxUses? }
 */
router.post(
  '/keys/batch',
  validateBody(schemas.createKeys),
  async (req: Request, res: Response) => {
    const { count, ...options } = req.body;
    const keys = await createKeys(count, options);
    res.status(201).json({ keys, count: keys.length });
  }
);

/**
 * GET /api/admin/keys/:key
 * Get details for a specific key
 */
router.get('/keys/:key', async (req: Request, res: Response) => {
  const key = await getKeyByValue(req.params.key);
  
  if (!key) {
    res.status(404).json({ error: 'Not Found', message: 'Key not found' });
    return;
  }
  
  res.json(key);
});

/**
 * DELETE /api/admin/keys/:key
 * Delete a key permanently
 */
router.delete('/keys/:key', async (req: Request, res: Response) => {
  const deleted = await deleteKey(req.params.key);
  
  if (!deleted) {
    res.status(404).json({ error: 'Not Found', message: 'Key not found' });
    return;
  }
  
  res.json({ success: true, message: 'Key deleted' });
});

/**
 * POST /api/admin/keys/:key/revoke
 * Disable/revoke a key
 */
router.post('/keys/:key/revoke', async (req: Request, res: Response) => {
  const revoked = await revokeKey(req.params.key);
  
  if (!revoked) {
    res.status(404).json({ error: 'Not Found', message: 'Key not found' });
    return;
  }
  
  res.json({ success: true, message: 'Key revoked' });
});

/**
 * POST /api/admin/keys/:key/activate
 * Re-enable a revoked key
 */
router.post('/keys/:key/activate', async (req: Request, res: Response) => {
  const activated = await activateKey(req.params.key);
  
  if (!activated) {
    res.status(404).json({ error: 'Not Found', message: 'Key not found' });
    return;
  }
  
  res.json({ success: true, message: 'Key activated' });
});

/**
 * POST /api/admin/keys/:key/extend
 * Extend a key's expiration
 * 
 * Body: { days: number }
 */
router.post(
  '/keys/:key/extend',
  validateBody(schemas.extendKey),
  async (req: Request, res: Response) => {
    const { days } = req.body;
    const extended = await extendKey(req.params.key, days);
    
    if (!extended) {
      res.status(404).json({ error: 'Not Found', message: 'Key not found' });
      return;
    }
    
    res.json({ success: true, message: `Key extended by ${days} days` });
  }
);

/**
 * POST /api/admin/keys/:key/reset-hwid
 * Admin force reset HWID (doesn't use up user's resets)
 */
router.post('/keys/:key/reset-hwid', async (req: Request, res: Response) => {
  const key = await getKeyByValue(req.params.key);
  
  if (!key) {
    res.status(404).json({ error: 'Not Found', message: 'Key not found' });
    return;
  }
  
  // Direct reset without using up reset count
  const { query } = await import('../db/index.js');
  await query('UPDATE keys SET hwid = NULL WHERE id = $1', [key.id]);
  
  res.json({ success: true, message: 'HWID reset by admin' });
});

/**
 * GET /api/admin/keys/:key/logs
 * Get validation logs for a key
 */
router.get('/keys/:key/logs', async (req: Request, res: Response) => {
  const logs = await getKeyLogs(req.params.key);
  res.json({ logs, count: logs.length });
});

export default router;
