import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to protect admin routes with API key
 */
export declare function adminAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Get client IP address (handles proxies)
 */
export declare function getClientIp(req: Request): string;
//# sourceMappingURL=auth.d.ts.map