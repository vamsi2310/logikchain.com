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
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Independent Periodic Sync to Firestore: NotificationPreferences
const syncer = (0, common_1.createPeriodicSyncer)({
    serviceName: 'social-connect-service',
    pool: db_1.pool,
    firestoreCollection: 'NotificationPreferences',
    inboundTable: 'user_notification_preferences',
    idColumn: 'user_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
// ─── HEALTH & SYNC TELEMETRY ────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'social-connect-service',
            role: 'User Interaction & Social Media Orchestrator (EPIC-13)',
            features: ['FEAT-13.01', 'FEAT-13.02', 'FEAT-13.03', 'FEAT-13.04'],
            supportedChannels: ['whatsapp', 'sms', 'fcm_push'],
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
// ─── FEAT-13.01: NOTIFICATION PREFERENCE MANAGEMENT ─────────────────────────
// GET preferences handler
const handleGetPreferences = async (req, res, next) => {
    try {
        const rawUserId = req.params.userId || req.query.userId || req.header('x-user-uid');
        const userId = String(rawUserId || '');
        if (!userId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId is required to fetch preferences');
        }
        const prefs = await (0, db_1.getUserPreferences)(userId);
        res.json({ success: true, preferences: prefs });
    }
    catch (err) {
        next(err);
    }
};
app.get('/api/v1/preferences/:userId', handleGetPreferences);
app.get('/preferences/:userId', handleGetPreferences);
app.get('/:userId', handleGetPreferences);
// PUT preferences handler
const handlePutPreferences = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const rawUserId = req.params.userId || req.body.userId || req.header('x-user-uid');
        const userId = String(rawUserId || '');
        if (!userId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId is required to update preferences');
        }
        const { phone_number, phoneNumber, whatsapp_enabled = true, whatsappEnabled = true, sms_enabled = true, smsEnabled = true, push_enabled = true, pushEnabled = true, preferred_channel, preferredChannel = 'whatsapp', categories = { orders: true, otps: true, bills: true, ownership: true, marketing: false }, quiet_hours_start = null, quiet_hours_end = null, language = 'en', } = req.body;
        const finalPhone = phone_number || phoneNumber;
        const finalWhatsapp = whatsapp_enabled !== undefined ? whatsapp_enabled : whatsappEnabled;
        const finalSms = sms_enabled !== undefined ? sms_enabled : smsEnabled;
        const finalPush = push_enabled !== undefined ? push_enabled : pushEnabled;
        const finalChannel = preferred_channel || preferredChannel;
        await client.query('BEGIN');
        const query = `
      INSERT INTO user_notification_preferences (
        user_id, phone_number, whatsapp_enabled, sms_enabled, push_enabled,
        preferred_channel, categories, quiet_hours_start, quiet_hours_end, language, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        phone_number = COALESCE(EXCLUDED.phone_number, user_notification_preferences.phone_number),
        whatsapp_enabled = EXCLUDED.whatsapp_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        push_enabled = EXCLUDED.push_enabled,
        preferred_channel = EXCLUDED.preferred_channel,
        categories = EXCLUDED.categories,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        language = EXCLUDED.language,
        updated_at = NOW()
      RETURNING *;
    `;
        const result = await client.query(query, [
            userId,
            finalPhone,
            finalWhatsapp,
            finalSms,
            finalPush,
            finalChannel,
            JSON.stringify(categories),
            quiet_hours_start,
            quiet_hours_end,
            language,
        ]);
        const updated = result.rows[0];
        // Emit outbox event to replicate preference state to Cloud Firestore
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'NotificationPreferences',
            aggregateId: userId,
            operation: 'UPDATE',
            payload: updated,
            firestoreCollection: 'NotificationPreferences',
            firestoreDocId: userId,
        });
        await client.query('COMMIT');
        res.json({ success: true, preferences: updated });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
app.put('/api/v1/preferences/:userId', handlePutPreferences);
app.put('/preferences/:userId', handlePutPreferences);
app.put('/:userId', handlePutPreferences);
// ─── USER INTERACTION ORCHESTRATION HELPERS ─────────────────────────────────
async function dispatchWhatsAppMessage(params) {
    common_1.logger.info({ to: params.to, template: params.templateName, doc: params.documentUrl }, '[SocialConnect] Dispatching WhatsApp Cloud API message');
    // Production integration uses Meta WhatsApp Cloud API:
    // POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
    return {
        whatsapp_message_id: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'sent',
    };
}
// ─── FEAT-13.02: WHATSAPP AUTHENTICATION & OTP ORCHESTRATION ────────────────
const handleOtpDispatch = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, phoneNumber, phone, otpCode, code, purpose = 'login' } = req.body;
        const finalPhone = phoneNumber || phone;
        const finalCode = otpCode || code;
        if (!finalPhone || !finalCode) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'phoneNumber and otpCode are required');
        }
        const lookupId = String(userId || finalPhone);
        const prefs = await (0, db_1.getUserPreferences)(lookupId);
        let channel = 'whatsapp';
        let dispatchResult;
        if (prefs.whatsapp_enabled && prefs.categories?.otps !== false) {
            try {
                dispatchResult = await dispatchWhatsAppMessage({
                    to: finalPhone,
                    templateName: 'logikchain_auth_otp',
                    language: prefs.language || 'en',
                    bodyParameters: [finalCode, '10 minutes'],
                });
            }
            catch (err) {
                common_1.logger.warn({ err: err.message }, 'WhatsApp OTP dispatch failed, falling back to SMS');
                channel = 'sms';
            }
        }
        else {
            channel = 'sms';
        }
        if (channel === 'sms') {
            common_1.logger.info({ phoneNumber: finalPhone, purpose }, '[SocialConnect] Dispatching SMS OTP fallback');
            dispatchResult = { external_message_id: `sms_${Date.now()}`, status: 'sent' };
        }
        await client.query(`
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            lookupId,
            channel,
            'otp',
            finalPhone,
            channel === 'whatsapp' ? 'logikchain_auth_otp' : 'sms_otp',
            JSON.stringify({ purpose, expires_in_minutes: 10 }),
            dispatchResult.whatsapp_message_id || dispatchResult.external_message_id,
            dispatchResult.status,
        ]);
        res.json({
            success: true,
            channel,
            status: dispatchResult.status,
            message: `OTP dispatched successfully via ${channel.toUpperCase()}`,
        });
    }
    catch (err) {
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/api/v1/interaction/otp', handleOtpDispatch);
app.post('/interaction/otp', handleOtpDispatch);
app.post('/otp', handleOtpDispatch);
// Meta WhatsApp Webhook Challenge Verification (GET)
const handleWebhookVerification = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'logikchain_verify_token';
    if (mode === 'subscribe' && token === expectedToken) {
        common_1.logger.info('[SocialConnect] Meta WhatsApp Webhook verified successfully');
        res.status(200).send(challenge);
    }
    else {
        common_1.logger.warn({ mode, token }, '[SocialConnect] Meta WhatsApp Webhook verification mismatch');
        res.status(403).json({ error: 'Verification token mismatch' });
    }
};
app.get('/api/v1/social/webhook', handleWebhookVerification);
app.get('/webhook/whatsapp', handleWebhookVerification);
app.get('/webhook', handleWebhookVerification);
// Meta WhatsApp Webhook Delivery Receipts (POST)
const handleWebhookReceipt = async (req, res) => {
    try {
        const body = req.body;
        const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses || [];
        for (const st of statuses) {
            const msgId = st.id;
            const status = st.status; // 'delivered' | 'read' | 'failed'
            if (msgId && status) {
                await db_1.pool.query('UPDATE notification_dispatches SET status = $1, updated_at = NOW() WHERE external_message_id = $2', [status, msgId]);
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    }
    catch (err) {
        common_1.logger.error({ err: err.message }, 'Error processing WhatsApp webhook');
        res.status(200).send('EVENT_RECEIVED'); // WhatsApp requires 200 OK
    }
};
app.post('/api/v1/social/webhook', handleWebhookReceipt);
app.post('/webhook/whatsapp', handleWebhookReceipt);
app.post('/webhook', handleWebhookReceipt);
// ─── FEAT-13.03: REAL-TIME ORDER LIFECYCLE UPDATES & DELIVERY ALERTS ────────
const handleOrderUpdate = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, phoneNumber, orderId, orderStatus, totalAmount, deliveryWindow } = req.body;
        if (!userId || !orderId || !orderStatus) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId, orderId, and orderStatus are required');
        }
        const prefs = await (0, db_1.getUserPreferences)(String(userId));
        if (prefs.categories?.orders === false) {
            return res.json({ success: true, skipped: true, reason: 'User opted out of order notifications' });
        }
        let channel = prefs.preferred_channel || 'whatsapp';
        let dispatchResult;
        if (channel === 'whatsapp' && prefs.whatsapp_enabled) {
            dispatchResult = await dispatchWhatsAppMessage({
                to: phoneNumber || prefs.phone_number,
                templateName: 'logikchain_order_update',
                language: prefs.language || 'en',
                bodyParameters: [orderId, orderStatus, `₹${totalAmount || '0'}`, deliveryWindow || 'today'],
            });
        }
        else {
            channel = 'push';
            common_1.logger.info({ userId, orderId, orderStatus }, '[SocialConnect] Dispatching FCM In-App Push');
            dispatchResult = { external_message_id: `fcm_${Date.now()}`, status: 'sent' };
        }
        await client.query(`
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            String(userId),
            channel,
            'order_update',
            phoneNumber || userId,
            'logikchain_order_update',
            JSON.stringify({ orderId, orderStatus, totalAmount }),
            dispatchResult.whatsapp_message_id || dispatchResult.external_message_id,
            dispatchResult.status,
        ]);
        res.json({ success: true, channel, status: dispatchResult.status, orderId });
    }
    catch (err) {
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/api/v1/interaction/order-update', handleOrderUpdate);
app.post('/interaction/order-update', handleOrderUpdate);
app.post('/order-update', handleOrderUpdate);
// ─── FEAT-13.04: DIGITAL BILLS, GST INVOICES & OWNERSHIP ALERTS ─────────────
// Bill & Invoices
const handleBillDispatch = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, phoneNumber, billType, invoiceNumber, amount, pdfUrl } = req.body;
        if (!userId || !invoiceNumber || !pdfUrl) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId, invoiceNumber, and pdfUrl are required');
        }
        const prefs = await (0, db_1.getUserPreferences)(String(userId));
        if (prefs.categories?.bills === false) {
            return res.json({ success: true, skipped: true, reason: 'User opted out of bill notifications' });
        }
        const dispatchResult = await dispatchWhatsAppMessage({
            to: phoneNumber || prefs.phone_number,
            templateName: 'logikchain_tax_invoice',
            language: prefs.language || 'en',
            bodyParameters: [billType || 'Tax Invoice', invoiceNumber, `₹${amount || '0'}`],
            documentUrl: pdfUrl,
            documentFilename: `${invoiceNumber}.pdf`,
        });
        await client.query(`
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            String(userId),
            'whatsapp',
            'bill_invoice',
            phoneNumber || userId,
            'logikchain_tax_invoice',
            JSON.stringify({ billType, invoiceNumber, amount, pdfUrl }),
            dispatchResult.whatsapp_message_id,
            dispatchResult.status,
        ]);
        res.json({ success: true, channel: 'whatsapp', status: dispatchResult.status, invoiceNumber });
    }
    catch (err) {
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/api/v1/interaction/bill', handleBillDispatch);
app.post('/interaction/bill', handleBillDispatch);
app.post('/bill', handleBillDispatch);
// Ownership Alerts
const handleOwnershipAlert = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, phoneNumber, alertType, title, messageDetails } = req.body;
        if (!userId || !alertType || !title) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId, alertType, and title are required');
        }
        const prefs = await (0, db_1.getUserPreferences)(String(userId));
        if (prefs.categories?.ownership === false) {
            return res.json({ success: true, skipped: true, reason: 'User opted out of ownership alerts' });
        }
        const dispatchResult = await dispatchWhatsAppMessage({
            to: phoneNumber || prefs.phone_number,
            templateName: 'logikchain_business_alert',
            language: prefs.language || 'en',
            bodyParameters: [title, alertType, JSON.stringify(messageDetails || {})],
        });
        await client.query(`
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            String(userId),
            'whatsapp',
            'ownership_alert',
            phoneNumber || userId,
            'logikchain_business_alert',
            JSON.stringify({ alertType, title, messageDetails }),
            dispatchResult.whatsapp_message_id,
            dispatchResult.status,
        ]);
        res.json({ success: true, channel: 'whatsapp', status: dispatchResult.status, alertType });
    }
    catch (err) {
        next(err);
    }
    finally {
        client.release();
    }
};
app.post('/api/v1/interaction/ownership-alert', handleOwnershipAlert);
app.post('/interaction/ownership-alert', handleOwnershipAlert);
app.post('/ownership-alert', handleOwnershipAlert);
// ─── NOTIFICATION DISPATCH HISTORY (SHR-12 Notification Center) ─────────────
const handleGetDispatches = async (req, res, next) => {
    try {
        const rawUserId = req.params.userId || req.header('x-user-uid');
        const userId = String(rawUserId || '');
        if (!userId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId is required');
        }
        const result = await db_1.pool.query(`SELECT id, channel, category, template_name, payload, status, created_at
       FROM notification_dispatches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`, [userId]);
        res.json({ success: true, userId, notifications: result.rows });
    }
    catch (err) {
        next(err);
    }
};
app.get('/api/v1/notifications/:userId', handleGetDispatches);
app.get('/notifications/:userId', handleGetDispatches);
app.get('/dispatches/:userId', handleGetDispatches);
// Error Handler
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4012;
async function bootstrap() {
    await (0, db_1.initDb)();
    await syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Social Connect & Interaction Service running on port ${PORT} serving EPIC-13`);
    });
}
bootstrap().catch((err) => {
    common_1.logger.error({ err }, 'Failed to bootstrap Social Connect Service');
    process.exit(1);
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
