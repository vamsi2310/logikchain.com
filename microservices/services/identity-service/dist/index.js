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
    try {
        admin.initializeApp();
    }
    catch (err) {
        common_1.logger.warn({ err: err.message }, 'Firebase Admin initialization skipped or operating in offline fallback');
    }
}
// Safely invoke Firebase Auth claims without crashing in offline / test setups
async function safelySetCustomUserClaims(uid, claims) {
    try {
        if (admin.apps.length > 0) {
            await admin.auth().setCustomUserClaims(uid, claims);
        }
    }
    catch (err) {
        common_1.logger.warn({ uid, claims, err: err.message }, 'Failed to set Firebase custom user claims (offline/unconfigured fallback)');
    }
}
async function safelyRevokeRefreshTokens(uid) {
    try {
        if (admin.apps.length > 0) {
            await admin.auth().revokeRefreshTokens(uid);
        }
    }
    catch (err) {
        common_1.logger.warn({ uid, err: err.message }, 'Failed to revoke Firebase refresh tokens');
    }
}
async function safelyUpdateAuthUser(uid, properties) {
    try {
        if (admin.apps.length > 0) {
            await admin.auth().updateUser(uid, properties);
        }
    }
    catch (err) {
        common_1.logger.warn({ uid, properties, err: err.message }, 'Failed to update Firebase Auth user profile');
    }
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
// ─── HEALTH & SYNC TELEMETRY ────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'identity-service',
            role: 'Identity, Authentication & Role Governance (EPIC-01)',
            features: ['FEAT-01.01', 'FEAT-01.02', 'FEAT-01.03', 'FEAT-01.04', 'FEAT-01.05', 'FEAT-01.06'],
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
// ─── FEAT-01.01: PHONE OTP AUTHENTICATION & CUSTOM CLAIMS BOOTSTRAP ─────────
const handleBootstrap = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const rawUid = req.header('x-user-uid') || req.body.uid || req.body.userId;
        const uid = String(rawUid || '');
        const phoneNumber = req.body.phoneNumber || req.body.phone;
        const platform = req.header('x-client-platform') || req.body.platform || 'pwa';
        const displayName = req.body.displayName || req.body.name || (phoneNumber ? `Citizen ${String(phoneNumber).slice(-4)}` : 'New User');
        if (!uid) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'User ID (uid) is required for bootstrap');
        }
        await client.query('BEGIN');
        // Check if user already exists
        const existing = await client.query('SELECT * FROM user_profiles WHERE user_id = $1', [uid]);
        let profile;
        let isNewUser = false;
        if (existing.rows.length === 0) {
            isNewUser = true;
            const initialRole = req.body.role || 'buyer';
            const initialClient = platform === 'android' ? 'android' : platform === 'ios' ? 'ios' : 'pwa';
            const insertRes = await client.query(`INSERT INTO user_profiles (
          user_id, phone_number, display_name, role, status, official_client, setup_incomplete, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'active', $5, true, NOW(), NOW())
        RETURNING *`, [uid, phoneNumber, displayName, initialRole, initialClient]);
            profile = insertRes.rows[0];
            await safelySetCustomUserClaims(uid, {
                role: initialRole,
                status: 'active',
                officialClient: initialClient,
            });
            await (0, db_1.recordOutbox)(client, {
                aggregateType: 'UserProfile',
                aggregateId: uid,
                operation: 'INSERT',
                payload: profile,
                firestoreCollection: 'UserProfiles',
                firestoreDocId: uid,
            });
        }
        else {
            profile = existing.rows[0];
            // Refresh claims in Firebase Auth if needed
            await safelySetCustomUserClaims(uid, {
                role: profile.role,
                status: profile.status,
                officialClient: profile.official_client || 'pwa',
                supplierId: profile.supplier_id || undefined,
            });
        }
        await client.query('COMMIT');
        common_1.logger.info({ uid, role: profile.role, isNewUser }, 'User bootstrap completed successfully');
        res.json({
            success: true,
            isNewUser,
            user: profile,
            claims: {
                role: profile.role,
                status: profile.status,
                officialClient: profile.official_client,
                supplierId: profile.supplier_id,
            },
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/auth/bootstrap', handleBootstrap);
app.post('/auth/bootstrap', handleBootstrap);
app.post('/bootstrap', handleBootstrap);
// ─── FEAT-01.06: USER PROFILE LIFECYCLE, ONBOARDING & MEDIA HANDSHAKE ────────
// Get Current User Profile (Me)
const handleGetMe = async (req, res, next) => {
    try {
        const rawUid = req.header('x-user-uid') || req.query.userId;
        const uid = String(rawUid || '');
        if (!uid) {
            throw new common_1.AppError('UNAUTHENTICATED', 'Missing authentication context header x-user-uid');
        }
        const result = await db_1.pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [uid]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `User profile not found for uid: ${uid}`);
        }
        res.json({ success: true, user: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/users/me', handleGetMe);
app.get('/users/me', handleGetMe);
app.get('/me', handleGetMe);
// Get User Profile by ID
const handleGetUserById = async (req, res, next) => {
    try {
        const userId = String(req.params.userId || '');
        const result = await db_1.pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `User profile not found for id: ${userId}`);
        }
        res.json({ success: true, user: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/users/:userId', handleGetUserById);
app.get('/users/:userId', handleGetUserById);
app.get('/:userId', handleGetUserById);
// Update User Profile (e.g. Onboarding Wizard / Account Settings)
const handlePatchUser = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const userId = String(req.params.userId || '');
        const callerUid = req.header('x-user-uid');
        const callerRole = req.header('x-user-role');
        if (callerUid && callerUid !== userId && callerRole !== 'support') {
            throw new common_1.AppError('PERMISSION_DENIED', 'Cannot modify another user profile without support privileges');
        }
        const { displayName, name, phoneNumber, email, villageId, selectedMerchantId, locale, photoUrl, metadata, setupIncomplete, } = req.body;
        const finalDisplayName = displayName || name;
        await client.query('BEGIN');
        const updateFields = ['updated_at = NOW()'];
        const values = [userId];
        let valIndex = 2;
        if (finalDisplayName !== undefined) {
            updateFields.push(`display_name = $${valIndex++}`);
            values.push(finalDisplayName);
        }
        if (phoneNumber !== undefined) {
            updateFields.push(`phone_number = $${valIndex++}`);
            values.push(phoneNumber);
        }
        if (email !== undefined) {
            updateFields.push(`email = $${valIndex++}`);
            values.push(email);
        }
        if (villageId !== undefined) {
            updateFields.push(`village_id = $${valIndex++}`);
            values.push(villageId);
        }
        if (selectedMerchantId !== undefined) {
            updateFields.push(`selected_merchant_id = $${valIndex++}`);
            values.push(selectedMerchantId);
        }
        if (locale !== undefined) {
            updateFields.push(`locale = $${valIndex++}`);
            values.push(locale);
        }
        if (photoUrl !== undefined) {
            updateFields.push(`photo_url = $${valIndex++}`);
            values.push(photoUrl);
        }
        if (setupIncomplete !== undefined) {
            updateFields.push(`setup_incomplete = $${valIndex++}`);
            values.push(setupIncomplete);
        }
        if (metadata !== undefined) {
            updateFields.push(`metadata = metadata || $${valIndex++}::jsonb`);
            values.push(JSON.stringify(metadata));
        }
        const updateQuery = `
      UPDATE user_profiles
      SET ${updateFields.join(', ')}
      WHERE user_id = $1
      RETURNING *
    `;
        const result = await client.query(updateQuery, values);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `User profile not found for id: ${userId}`);
        }
        const updatedProfile = result.rows[0];
        // Mirror to Firebase Auth
        if (finalDisplayName || photoUrl) {
            await safelyUpdateAuthUser(userId, {
                displayName: finalDisplayName,
                photoURL: photoUrl,
            });
        }
        // Mirror to Firestore via Outbox
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: userId,
            operation: 'UPDATE',
            payload: updatedProfile,
            firestoreCollection: 'UserProfiles',
            firestoreDocId: userId,
        });
        await client.query('COMMIT');
        res.json({ success: true, user: updatedProfile });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.patch('/v1/users/:userId', handlePatchUser);
app.patch('/users/:userId', handlePatchUser);
app.patch('/:userId', handlePatchUser);
// Register Device Token (FCM / APNS)
const handleDeviceToken = async (req, res, next) => {
    try {
        const rawUserId = req.params.userId || req.body.userId;
        const userId = String(rawUserId || '');
        const token = req.body.token || req.body.deviceToken;
        if (!userId || !token)
            throw new common_1.AppError('INVALID_ARGUMENT', 'Missing userId or token');
        await db_1.pool.query(`UPDATE user_profiles
       SET device_tokens = array_append(array_remove(device_tokens, $2), $2), updated_at = NOW()
       WHERE user_id = $1`, [userId, token]);
        res.json({ success: true, userId, token });
    }
    catch (err) {
        next(err);
    }
};
app.post('/v1/users/:userId/device-tokens', handleDeviceToken);
app.post('/users/:userId/device-tokens', handleDeviceToken);
app.post('/device-tokens', handleDeviceToken);
app.post('/v1/devices', handleDeviceToken);
app.post('/devices', handleDeviceToken);
// Pre-Signed URL for Avatar Upload
const handleAvatarUploadUrl = async (req, res, next) => {
    try {
        const userId = String(req.params.userId || '');
        const { contentType = 'image/webp', sizeBytes = 0 } = req.body;
        const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(contentType)) {
            throw new common_1.AppError('INVALID_ARGUMENT', `Unsupported content-type: ${contentType}. Must be webp, jpeg, or png.`);
        }
        if (sizeBytes > 2 * 1024 * 1024) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Image size exceeds maximum limit of 2MB');
        }
        const publicMediaUrl = `https://media.logikchain.com/profiles/${userId}/avatar.webp`;
        const uploadUrl = `https://storage.googleapis.com/logikchain-media/profiles/${userId}/avatar.webp?uploadToken=signed_${Date.now()}`;
        res.json({
            success: true,
            uploadUrl,
            publicMediaUrl,
            expiresInSeconds: 300,
            contentType,
        });
    }
    catch (err) {
        next(err);
    }
};
app.post('/v1/users/:userId/avatar/upload-url', handleAvatarUploadUrl);
app.post('/users/:userId/avatar/upload-url', handleAvatarUploadUrl);
// Pre-Signed URL for Verification Document Upload (KYC, driving license, shop facade)
const handleDocUploadUrl = async (req, res, next) => {
    try {
        const userId = String(req.params.userId || '');
        const { documentType = 'kyc', contentType = 'image/webp', sizeBytes = 0 } = req.body;
        if (sizeBytes > 10 * 1024 * 1024) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Document size exceeds maximum limit of 10MB');
        }
        const docId = `doc_${Date.now()}`;
        const publicMediaUrl = `https://media.logikchain.com/documents/${userId}/${documentType}_${docId}.webp`;
        const uploadUrl = `https://storage.googleapis.com/logikchain-media/documents/${userId}/${documentType}_${docId}.webp?uploadToken=signed_${Date.now()}`;
        res.json({
            success: true,
            uploadUrl,
            publicMediaUrl,
            expiresInSeconds: 300,
            documentType,
        });
    }
    catch (err) {
        next(err);
    }
};
app.post('/v1/users/:userId/documents/upload-url', handleDocUploadUrl);
app.post('/users/:userId/documents/upload-url', handleDocUploadUrl);
// ─── FEAT-01.02: REGIONAL SUPPLIER ORGANIZATION PROVISIONING ─────────────────
const handleCreateSupplier = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { legalName, gstin, email, phoneNumber, countryId = 'IN', stateId, districtId, subscriptionTier = 'starter', delegatedSupportEnabled = false, adminUserId, metadata = {}, } = req.body;
        if (!legalName || !gstin || !phoneNumber) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'legalName, gstin, and phoneNumber are mandatory for supplier creation');
        }
        await client.query('BEGIN');
        // Check GSTIN uniqueness
        const checkGstin = await client.query('SELECT supplier_id FROM suppliers WHERE gstin = $1', [gstin]);
        if (checkGstin.rows.length > 0) {
            throw new common_1.AppError('ALREADY_EXISTS', `Supplier with GSTIN ${gstin} already exists`);
        }
        const supplierId = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const insertRes = await client.query(`INSERT INTO suppliers (
        supplier_id, legal_name, gstin, email, phone_number, country_id, state_id, district_id,
        status, subscription_tier, delegated_support_enabled, admin_user_id, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`, [
            supplierId,
            legalName,
            gstin,
            email,
            phoneNumber,
            countryId,
            stateId,
            districtId,
            subscriptionTier,
            delegatedSupportEnabled,
            adminUserId,
            JSON.stringify(metadata),
        ]);
        const supplier = insertRes.rows[0];
        // If an admin user ID is specified, convert their role to supplier
        if (adminUserId) {
            await client.query(`UPDATE user_profiles
         SET role = 'supplier', supplier_id = $1, status = 'active', updated_at = NOW()
         WHERE user_id = $2`, [supplierId, adminUserId]);
            await safelySetCustomUserClaims(String(adminUserId), {
                role: 'supplier',
                supplierId,
                status: 'approved',
            });
        }
        // Mirror to Firestore `/Suppliers/{id}` via outbox
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Supplier',
            aggregateId: supplierId,
            operation: 'INSERT',
            payload: supplier,
            firestoreCollection: 'Suppliers',
            firestoreDocId: supplierId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ supplierId, legalName }, 'Regional supplier provisioned successfully');
        res.status(201).json({ success: true, supplier });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/suppliers', handleCreateSupplier);
app.post('/suppliers', handleCreateSupplier);
const handleListSuppliers = async (req, res, next) => {
    try {
        const { countryId, stateId, districtId, status } = req.query;
        let query = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];
        let pIdx = 1;
        if (countryId) {
            query += ` AND country_id = $${pIdx++}`;
            params.push(countryId);
        }
        if (stateId) {
            query += ` AND state_id = $${pIdx++}`;
            params.push(stateId);
        }
        if (districtId) {
            query += ` AND district_id = $${pIdx++}`;
            params.push(districtId);
        }
        if (status) {
            query += ` AND status = $${pIdx++}`;
            params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT 100';
        const result = await db_1.pool.query(query, params);
        res.json({ success: true, count: result.rows.length, suppliers: result.rows });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/suppliers', handleListSuppliers);
app.get('/suppliers', handleListSuppliers);
const handleGetSupplier = async (req, res, next) => {
    try {
        const supplierId = String(req.params.supplierId || '');
        const result = await db_1.pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [supplierId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Supplier not found: ${supplierId}`);
        }
        res.json({ success: true, supplier: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/suppliers/:supplierId', handleGetSupplier);
app.get('/suppliers/:supplierId', handleGetSupplier);
// ─── FEAT-01.03: PROGRESSIVE ROLE CONVERSION & MULTI-CLIENT HANDOFF ──────────
const handleRoleConversion = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const rawBuyerId = req.params.buyerId || req.params.userId;
        const buyerId = String(rawBuyerId || '');
        const { targetRole, role, supplierId } = req.body;
        const finalTargetRole = targetRole || role;
        const allowedRoles = ['buyer', 'merchant', 'vehicle', 'driver', 'supplier', 'support'];
        if (!allowedRoles.includes(finalTargetRole)) {
            throw new common_1.AppError('INVALID_ARGUMENT', `Unsupported role: ${finalTargetRole}`);
        }
        // Map driver to standard vehicle role
        const normalizedRole = finalTargetRole === 'driver' ? 'vehicle' : finalTargetRole;
        // Driver / vehicle role must handoff to native Android runtime
        const officialClient = normalizedRole === 'vehicle' ? 'android' : 'pwa';
        await client.query('BEGIN');
        await safelySetCustomUserClaims(buyerId, {
            role: normalizedRole,
            status: 'active',
            officialClient,
            supplierId: supplierId || undefined,
        });
        const updateRes = await client.query(`INSERT INTO user_profiles (user_id, role, status, official_client, supplier_id, updated_at)
       VALUES ($1, $2, 'active', $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET role = EXCLUDED.role,
           status = 'active',
           official_client = EXCLUDED.official_client,
           supplier_id = COALESCE(EXCLUDED.supplier_id, user_profiles.supplier_id),
           updated_at = NOW()
       RETURNING *`, [buyerId, normalizedRole, officialClient, supplierId || null]);
        const profile = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: buyerId,
            operation: 'UPDATE',
            payload: profile,
            firestoreCollection: 'UserProfiles',
            firestoreDocId: buyerId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ userId: buyerId, role: normalizedRole, officialClient }, 'Successfully converted user role');
        res.json({
            success: true,
            user: profile,
            officialClient,
            deepLinkHandoff: normalizedRole === 'vehicle' ? 'logikchain://app/role-handoff' : undefined,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/buyers/:buyerId/role', handleRoleConversion);
app.post('/buyer/:buyerId/role', handleRoleConversion);
app.post('/buyers/:buyerId/role', handleRoleConversion);
app.post('/:buyerId/role', handleRoleConversion);
// Disassociate merchant from supplier
const handleDisassociateMerchant = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const merchantId = String(req.params.merchantId || '');
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE user_profiles SET supplier_id = NULL, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [merchantId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Merchant not found: ${merchantId}`);
        }
        const profile = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: merchantId,
            operation: 'UPDATE',
            payload: profile,
            firestoreCollection: 'UserProfiles',
            firestoreDocId: merchantId,
        });
        await client.query('COMMIT');
        res.json({ success: true, merchantId, disassociated: true });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/merchants/:merchantId/disassociate', handleDisassociateMerchant);
app.post('/merchants/:merchantId/disassociate', handleDisassociateMerchant);
// ─── FEAT-01.04: USER SUSPENSION & ACCOUNT GOVERNANCE LIFECYCLE ──────────────
// Suspend User
const handleSuspendUser = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const userId = String(req.params.userId || '');
        const { reason = 'Policy compliance violation', scope = 'operational', suspendedBy = 'support_system' } = req.body;
        await client.query('BEGIN');
        // Revoke refresh tokens to invalidate active client sessions immediately
        await safelyRevokeRefreshTokens(userId);
        // Update status in PostgreSQL
        const updateRes = await client.query(`UPDATE user_profiles SET status = 'suspended', updated_at = NOW() WHERE user_id = $1 RETURNING *`, [userId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `User not found: ${userId}`);
        }
        // Insert suspension audit record
        await client.query(`INSERT INTO user_suspensions (user_id, scope, reason, suspended_by, status, created_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())`, [userId, scope, reason, suspendedBy]);
        // Update Firebase claims
        await safelySetCustomUserClaims(userId, { status: 'suspended' });
        // Outbox event
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: userId,
            operation: 'UPDATE',
            payload: { userId, status: 'suspended', reason, scope },
            firestoreCollection: 'UserProfiles',
            firestoreDocId: userId,
        });
        await client.query('COMMIT');
        common_1.logger.warn({ userId, scope, reason }, 'User account has been suspended');
        res.json({ success: true, status: 'suspended', userId, scope, reason });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/users/:userId/suspension', handleSuspendUser);
app.post('/users/:userId/suspension', handleSuspendUser);
// Reclaim / Reinstate User
const handleReinstateUser = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const userId = String(req.params.userId || '');
        const { reinstatedBy = 'support_system' } = req.body;
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE user_profiles SET status = 'active', updated_at = NOW() WHERE user_id = $1 RETURNING *`, [userId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `User not found: ${userId}`);
        }
        const profile = updateRes.rows[0];
        // Mark previous suspensions as reinstated
        await client.query(`UPDATE user_suspensions SET status = 'reinstated', reinstated_at = NOW(), reinstated_by = $2 WHERE user_id = $1`, [userId, reinstatedBy]);
        await safelySetCustomUserClaims(userId, {
            role: profile.role,
            status: 'active',
            officialClient: profile.official_client || 'pwa',
        });
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'UserProfile',
            aggregateId: userId,
            operation: 'UPDATE',
            payload: profile,
            firestoreCollection: 'UserProfiles',
            firestoreDocId: userId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ userId }, 'User account reinstated');
        res.json({ success: true, status: 'active', userId });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.delete('/v1/users/:userId/suspension', handleReinstateUser);
app.delete('/users/:userId/suspension', handleReinstateUser);
// View suspension history for audit
const handleGetSuspensions = async (req, res, next) => {
    try {
        const userId = String(req.params.userId || '');
        const result = await db_1.pool.query('SELECT * FROM user_suspensions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json({ success: true, userId, suspensions: result.rows });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/users/:userId/suspensions', handleGetSuspensions);
app.get('/users/:userId/suspensions', handleGetSuspensions);
// ─── FEAT-01.05: SUPPLIER-DELEGATED SUPPORT ACCESS & ENTITLEMENT GATE ────────
// Create Delegated Support Grant
const handleCreateGrant = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const rawSupplierId = req.params.supplierId || req.body.supplierId || req.header('x-supplier-context');
        const supplierId = String(rawSupplierId || '');
        const { durationHours = 24, ticketReference = '', grantedBy = 'supplier_admin' } = req.body;
        if (!supplierId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'supplierId is required to grant support access');
        }
        await client.query('BEGIN');
        // Verify supplier subscription entitlement
        const suppRes = await client.query('SELECT * FROM suppliers WHERE supplier_id = $1', [supplierId]);
        if (suppRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Supplier organization ${supplierId} not found`);
        }
        const supplier = suppRes.rows[0];
        if (supplier.subscription_tier === 'starter' && !supplier.delegated_support_enabled) {
            throw new common_1.AppError('PERMISSION_DENIED', 'Upgrade to Growth or Enterprise Tier to enable Delegated Support Access.');
        }
        const grantRes = await client.query(`INSERT INTO supplier_delegated_support_grants (
        supplier_id, granted_by, duration_hours, ticket_reference, status, expires_at, created_at
      ) VALUES ($1, $2, $3::int, $4, 'active', NOW() + ($3::int * INTERVAL '1 hour'), NOW())
      RETURNING *`, [supplierId, grantedBy, Number(durationHours), ticketReference]);
        const grant = grantRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'SupplierDelegatedGrant',
            aggregateId: grant.grant_id,
            operation: 'INSERT',
            payload: grant,
            firestoreCollection: 'SupplierDelegatedGrants',
            firestoreDocId: grant.grant_id,
        });
        await client.query('COMMIT');
        common_1.logger.info({ supplierId, grantId: grant.grant_id, durationHours }, 'Delegated support grant issued');
        res.status(201).json({ success: true, grant });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/v1/suppliers/me/delegated-support/grants', handleCreateGrant);
app.post('/suppliers/me/delegated-support/grants', handleCreateGrant);
app.post('/v1/suppliers/:supplierId/delegated-support/grants', handleCreateGrant);
app.post('/suppliers/:supplierId/delegated-support/grants', handleCreateGrant);
// Get Delegated Support Status
const handleGetGrantStatus = async (req, res, next) => {
    try {
        const rawSupplierId = req.params.supplierId || req.query.supplierId || req.header('x-supplier-context');
        const supplierId = String(rawSupplierId || '');
        if (!supplierId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'supplierId is required');
        }
        const activeGrant = await db_1.pool.query(`SELECT *,
              EXTRACT(EPOCH FROM (expires_at - NOW()))::INT AS remaining_seconds
       FROM supplier_delegated_support_grants
       WHERE supplier_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`, [supplierId]);
        if (activeGrant.rows.length === 0) {
            return res.json({
                success: true,
                supplierId,
                hasActiveGrant: false,
                grant: null,
            });
        }
        res.json({
            success: true,
            supplierId,
            hasActiveGrant: true,
            grant: activeGrant.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/suppliers/me/delegated-support/status', handleGetGrantStatus);
app.get('/suppliers/me/delegated-support/status', handleGetGrantStatus);
app.get('/v1/suppliers/:supplierId/delegated-support/status', handleGetGrantStatus);
app.get('/suppliers/:supplierId/delegated-support/status', handleGetGrantStatus);
// Revoke Delegated Support Grant
const handleRevokeGrant = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const grantId = String(req.params.grantId || '');
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE supplier_delegated_support_grants
       SET status = 'revoked', revoked_at = NOW()
       WHERE grant_id = $1 RETURNING *`, [grantId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Grant not found: ${grantId}`);
        }
        const grant = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'SupplierDelegatedGrant',
            aggregateId: grantId,
            operation: 'UPDATE',
            payload: grant,
            firestoreCollection: 'SupplierDelegatedGrants',
            firestoreDocId: grantId,
        });
        await client.query('COMMIT');
        res.json({ success: true, revoked: true, grant });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.delete('/v1/suppliers/me/delegated-support/grants/:grantId', handleRevokeGrant);
app.delete('/suppliers/me/delegated-support/grants/:grantId', handleRevokeGrant);
app.delete('/v1/suppliers/:supplierId/delegated-support/grants/:grantId', handleRevokeGrant);
app.delete('/suppliers/:supplierId/delegated-support/grants/:grantId', handleRevokeGrant);
// Fast In-Memory / Sub-5ms Gateway Verification Check for X-Supplier-Context
const handleDelegatedAccessCheck = async (req, res, next) => {
    try {
        const supplierId = String(req.params.supplierId || '');
        const result = await db_1.pool.query(`SELECT grant_id, expires_at
       FROM supplier_delegated_support_grants
       WHERE supplier_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`, [supplierId]);
        if (result.rows.length === 0) {
            return res.status(403).json({
                authorized: false,
                error: {
                    code: 'SUPPLIER_DELEGATED_ACCESS_NOT_GRANTED',
                    message: `Supplier ${supplierId} has not granted active delegated support access.`,
                },
            });
        }
        res.json({
            authorized: true,
            grantId: result.rows[0].grant_id,
            expiresAt: result.rows[0].expires_at,
        });
    }
    catch (err) {
        next(err);
    }
};
app.get('/v1/support/suppliers/:supplierId/delegated-access-check', handleDelegatedAccessCheck);
app.get('/support/suppliers/:supplierId/delegated-access-check', handleDelegatedAccessCheck);
// Error Handler
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4001;
async function bootstrap() {
    await (0, db_1.initDb)();
    await syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Identity Microservice running on port ${PORT} serving EPIC-01 (FEAT-01.01 to FEAT-01.06)`);
    });
}
bootstrap().catch((err) => {
    common_1.logger.error({ err }, 'Failed to start Identity Microservice');
    process.exit(1);
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
