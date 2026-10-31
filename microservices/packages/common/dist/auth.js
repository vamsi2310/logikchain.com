"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseAdmin = getFirebaseAdmin;
exports.extractClientContext = extractClientContext;
exports.appCheckMiddleware = appCheckMiddleware;
exports.authMiddleware = authMiddleware;
const admin = __importStar(require("firebase-admin"));
// Lazily initialize Firebase Admin if not already initialized
function getFirebaseAdmin() {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    return admin.app();
}
function extractClientContext(req) {
    const rawPlatform = (req.header('X-Client-Platform') || 'web').toLowerCase();
    const platform = rawPlatform === 'android' ? 'android' :
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
async function appCheckMiddleware(req, res, next) {
    const appCheckToken = req.header('X-Firebase-AppCheck');
    const context = req.clientContext || extractClientContext(req);
    req.clientContext = context;
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
    }
    catch (err) {
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
function authMiddleware(requiredRoles) {
    return async (req, res, next) => {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header.' }
            });
            return;
        }
        const token = authHeader.substring(7);
        // Development & Testing Token Bypass for local integration testing
        if (process.env.NODE_ENV !== 'production' && token.startsWith('dev-token')) {
            const parts = token.split(':');
            const uid = parts[1] || 'dev-user-001';
            const role = parts[2] || req.header('X-User-Role') || 'buyer';
            const user = {
                uid,
                email: `${uid}@logikchain.dev`,
                role,
                status: 'active',
                claims: { uid, role, status: 'active' },
            };
            const context = req.clientContext || extractClientContext(req);
            context.user = user;
            req.clientContext = context;
            req.user = user;
            return next();
        }
        try {
            const adminApp = getFirebaseAdmin();
            const decoded = await adminApp.auth().verifyIdToken(token);
            const role = decoded.role || 'buyer';
            const status = decoded.status || 'active';
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
            const user = {
                uid: decoded.uid,
                email: decoded.email,
                phoneNumber: decoded.phone_number,
                role,
                status,
                claims: decoded,
            };
            const context = req.clientContext || extractClientContext(req);
            context.user = user;
            req.clientContext = context;
            req.user = user;
            next();
        }
        catch (err) {
            res.status(401).json({
                error: { code: 'INVALID_TOKEN', message: err.message || 'Invalid or expired Firebase ID token.' }
            });
        }
    };
}
