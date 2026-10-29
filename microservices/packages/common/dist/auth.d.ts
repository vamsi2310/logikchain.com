import * as admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';
import { ClientContext, UserRole } from './types';
export declare function getFirebaseAdmin(): admin.app.App;
export declare function extractClientContext(req: Request): ClientContext;
/**
 * Middleware to verify App Check tokens across PWA (reCAPTCHA), Android (Play Integrity), and iOS (DeviceCheck/App Attest)
 */
export declare function appCheckMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to verify Firebase Auth ID Token and check role/status
 */
export declare function authMiddleware(requiredRoles?: UserRole[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
