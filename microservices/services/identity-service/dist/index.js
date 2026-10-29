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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin = __importStar(require("firebase-admin"));
const common_1 = require("@logikchain/common");
const db_1 = require("./db");
dotenv_1.default.config();
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = (0, common_1.createPeriodicSyncer)({
    serviceName: 'identity-service',
    pool: db_1.pool,
    firestoreCollection: 'UserProfiles',
    inboundTable: 'user_profiles',
    idColumn: 'user_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'identity-service',
            timestamp: new Date().toISOString(),
            sync: syncer.getStats(),
        });
    }
    catch (err) {
        res.status(500).json({ status: 'degraded', error: err.message });
    }
});
app.get('/sync/status', (req, res) => {
    res.json(syncer.getStats());
});
app.post('/sync/trigger', async (req, res) => {
    const syncedOutbox = await syncer.syncOutbox();
    const syncedStorage = await syncer.syncStorage();
    res.json({ triggered: true, syncedOutbox, syncedStorage, stats: syncer.getStats() });
});
/**
 * Update user role & set Firebase custom claims
 */
app.post('/buyer/:buyerId/role', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { buyerId } = req.params;
        const { targetRole } = req.body;
        if (!['merchant', 'driver', 'supplier', 'support'].includes(targetRole)) {
            throw new common_1.AppError('INVALID_ARGUMENT', `Unsupported role: ${targetRole}`);
        }
        await client.query('BEGIN');
        await admin.auth().setCustomUserClaims(buyerId, { role: targetRole, status: 'active' });
        const upsertRes = await client.query(`INSERT INTO user_profiles (user_id, role, status, updated_at)
       VALUES ($1, $2, 'active', NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
       RETURNING *`, [buyerId, targetRole]);
        const profile = upsertRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: buyerId,
            operation: 'UPDATE',
            payload: profile,
            firestoreCollection: 'UserProfiles',
            firestoreDocId: buyerId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ userId: buyerId, targetRole }, 'Successfully converted user role and updated claims');
        res.json({ user: profile });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Suspend user
 */
app.post('/users/:userId/suspension', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        await client.query('BEGIN');
        const existingClaims = (await admin.auth().getUser(userId)).customClaims || {};
        await admin.auth().setCustomUserClaims(userId, { ...existingClaims, status: 'suspended' });
        const updateRes = await client.query(`UPDATE user_profiles SET status = 'suspended', updated_at = NOW() WHERE user_id = $1 RETURNING *`, [userId]);
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: userId,
            operation: 'UPDATE',
            payload: { userId, status: 'suspended', reason },
            firestoreCollection: 'UserProfiles',
            firestoreDocId: userId,
        });
        await client.query('COMMIT');
        res.json({ status: 'suspended', userId });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Register mobile/PWA FCM device token
 */
app.post('/device-tokens', async (req, res, next) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token)
            throw new common_1.AppError('INVALID_ARGUMENT', 'Missing userId or token');
        await db_1.pool.query(`UPDATE user_profiles
       SET device_tokens = array_append(array_remove(device_tokens, $2), $2), updated_at = NOW()
       WHERE user_id = $1`, [userId, token]);
        res.json({ success: true, userId });
    }
    catch (err) {
        next(err);
    }
});
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4001;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Identity Microservice listening on port ${PORT} with independent periodic sync active`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
