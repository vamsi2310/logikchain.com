import type { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown;
    constructor(code: string, message: string, statusCode?: number, details?: unknown);
}
export declare function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void;
