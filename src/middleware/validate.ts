import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// Common validation schemas
export const schemas = {
  // Key validation request
  validateKey: z.object({
    key: z.string().min(1, 'Key is required'),
    hwid: z.string().optional(),
  }),
  
  // Create key request
  createKey: z.object({
    note: z.string().max(255).optional(),
    durationDays: z.number().int().positive().optional().nullable(),
    maxHwidResets: z.number().int().min(0).default(0),
    maxUses: z.number().int().positive().optional().nullable(),
    customKey: z.string().max(64).optional(),
  }),
  
  // Batch create keys
  createKeys: z.object({
    count: z.number().int().min(1).max(100),
    note: z.string().max(255).optional(),
    durationDays: z.number().int().positive().optional().nullable(),
    maxHwidResets: z.number().int().min(0).default(0),
    maxUses: z.number().int().positive().optional().nullable(),
  }),
  
  // Extend key request
  extendKey: z.object({
    days: z.number().int().positive(),
  }),
  
  // HWID reset request
  resetHwid: z.object({
    key: z.string().min(1),
  }),
};
