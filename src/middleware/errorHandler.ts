import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * Custom error class with status code
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Not found handler - catch 404s
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);
  
  // Handle known API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }
  
  // Handle validation errors from Zod
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: config.nodeEnv === 'development' ? err : undefined,
    });
    return;
  }
  
  // Handle database errors
  if ((err as any).code && (err as any).code.startsWith('23')) {
    res.status(400).json({
      error: 'Database Error',
      message: 'A database constraint was violated (possibly duplicate key)',
    });
    return;
  }
  
  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
}
