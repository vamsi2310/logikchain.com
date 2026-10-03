import * as admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';
import { ClientContext, ClientPlatform, AuthenticatedUser, UserRole } from './types';

// Lazily initialize Firebase Admin if not already initialized
export function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.app();
}

export function extractClientContext(req: Request): ClientContext {
  const rawPlatform = (req.header('X-Client-Platform') || 'web').toLowerCase();
  const platform: ClientPlatform =
    rawPlatform === 'android' ? 'android' :
    rawPlatform === 'ios' ? 'ios' :
    rawPlatform === 'web' ? 'web' : 'unknown';

  const correlationId = (req.header('X-Correlation-Id') || `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const idempotencyKey = req.header('Idempotency-Key') || undefined;
  const appVersion = req.header('X-Client-Version') || undefined;

  return {
    platform,
    appVersion,
    appCheckVerified: false,
    correlationId,
    idempotencyKey,
  };
}

/**
 * Middleware to verify App Check tokens across PWA (reCAPTCHA), Android (Play Integrity), and iOS (DeviceCheck/App Attest)
 */
export async function appCheckMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const appCheckToken = req.header('X-Firebase-AppCheck');
  const context = (req as any).clientContext as ClientContext || extractClientContext(req);
  (req as any).clientContext = context;

  // In production, enforce App Check unless explicitly bypassed in dev/test
  const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';

  if (!appCheckToken) {
    if (enforceAppCheck) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED_APP', message: 'Missing App Check attestation token.' }
      });
      return;
    }
    context.appCheckVerified = false;
    return next();
  }

  try {
    const adminApp = getFirebaseAdmin();
    const appCheckClaims = await adminApp.appCheck().verifyToken(appCheckToken);
    context.appCheckVerified = true;
    context.appId = appCheckClaims.appId;
    next();
  } catch (err: any) {
    if (enforceAppCheck) {
      res.status(401).json({
        error: { code: 'INVALID_APP_CHECK', message: 'App Check verification failed.' }
      });
      return;
    }
    context.appCheckVerified = false;
    next();
  }
}

/**
 * Middleware to verify Firebase Auth ID Token and check role/status
 */
export function authMiddleware(requiredRoles?: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header.' }
      });
      return;
    }

    const token = authHeader.substring(7);
    try {
      const adminApp = getFirebaseAdmin();
      const decoded = await adminApp.auth().verifyIdToken(token);

      const role = (decoded.role as UserRole) || 'buyer';
      const status = (decoded.status as 'active' | 'suspended' | 'pending') || 'active';

      if (status === 'suspended') {
        res.status(403).json({
          error: { code: 'USER_SUSPENDED', message: 'Your account is suspended.' }
        });
        return;
      }

      if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: `User role '${role}' is not authorized for this resource.`
          }
        });
        return;
      }

      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email,
        phoneNumber: decoded.phone_number,
        role,
        status,
        claims: decoded,
      };

      const context = (req as any).clientContext as ClientContext || extractClientContext(req);
      context.user = user;
      (req as any).clientContext = context;
      (req as any).user = user;

      next();
    } catch (err: any) {
      res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: err.message || 'Invalid or expired Firebase ID token.' }
      });
    }
  };
}
