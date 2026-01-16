import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export declare function validateBody<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate query parameters
 */
export declare function validateQuery<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare const schemas: {
    validateKey: z.ZodObject<{
        key: z.ZodString;
        hwid: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        hwid?: string | undefined;
    }, {
        key: string;
        hwid?: string | undefined;
    }>;
    createKey: z.ZodObject<{
        note: z.ZodOptional<z.ZodString>;
        durationDays: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        maxHwidResets: z.ZodDefault<z.ZodNumber>;
        maxUses: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        customKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        maxHwidResets: number;
        customKey?: string | undefined;
        note?: string | undefined;
        durationDays?: number | null | undefined;
        maxUses?: number | null | undefined;
    }, {
        customKey?: string | undefined;
        note?: string | undefined;
        durationDays?: number | null | undefined;
        maxHwidResets?: number | undefined;
        maxUses?: number | null | undefined;
    }>;
    createKeys: z.ZodObject<{
        count: z.ZodNumber;
        note: z.ZodOptional<z.ZodString>;
        durationDays: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        maxHwidResets: z.ZodDefault<z.ZodNumber>;
        maxUses: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        maxHwidResets: number;
        count: number;
        note?: string | undefined;
        durationDays?: number | null | undefined;
        maxUses?: number | null | undefined;
    }, {
        count: number;
        note?: string | undefined;
        durationDays?: number | null | undefined;
        maxHwidResets?: number | undefined;
        maxUses?: number | null | undefined;
    }>;
    extendKey: z.ZodObject<{
        days: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        days: number;
    }, {
        days: number;
    }>;
    resetHwid: z.ZodObject<{
        key: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        key: string;
    }, {
        key: string;
    }>;
};
//# sourceMappingURL=validate.d.ts.map