import { config } from '../config/index.js';
/**
 * Middleware to protect admin routes with API key
 */
export function adminAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing API key. Include X-API-Key header.',
        });
        return;
    }
    if (apiKey !== config.adminApiKey) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key',
        });
        return;
    }
    next();
}
/**
 * Get client IP address (handles proxies)
 */
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0];
    }
    return req.socket.remoteAddress || 'unknown';
}
//# sourceMappingURL=auth.js.map