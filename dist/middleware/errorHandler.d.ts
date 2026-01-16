import { Request, Response, NextFunction } from 'express';
/**
 * Custom error class with status code
 */
export declare class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
/**
 * Not found handler - catch 404s
 */
export declare function notFoundHandler(req: Request, res: Response): void;
/**
 * Global error handler
 */
export declare function errorHandler(err: Error | ApiError, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=errorHandler.d.ts.map