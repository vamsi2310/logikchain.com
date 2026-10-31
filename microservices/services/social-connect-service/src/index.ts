import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox, getUserPreferences } from './db';

dotenv.config();

if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Firebase Admin initialization skipped or operating in offline fallback');
  }
}

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore: NotificationPreferences
const syncer = createPeriodicSyncer({
  serviceName: 'social-connect-service',
  pool,
  firestoreCollection: 'NotificationPreferences',
  inboundTable: 'user_notification_preferences',
  idColumn: 'user_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

// ─── HEALTH & SYNC TELEMETRY ────────────────────────────────────────────────

app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'social-connect-service',
      role: 'User Interaction & Social Media Orchestrator (EPIC-13)',
      features: ['FEAT-13.01', 'FEAT-13.02', 'FEAT-13.03', 'FEAT-13.04'],
      supportedChannels: ['whatsapp', 'sms', 'fcm_push'],
      timestamp: new Date().toISOString(),
      sync: syncer.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

app.get('/sync/status', (req: Request, res: Response) => {
  res.json(syncer.getStats());
});

app.post('/sync/trigger', async (req: Request, res: Response) => {
  const syncedOutbox = await syncer.syncOutbox();
  const syncedStorage = await syncer.syncStorage();
  res.json({ triggered: true, syncedOutbox, syncedStorage, stats: syncer.getStats() });
});

// ─── FEAT-13.01: NOTIFICATION PREFERENCE MANAGEMENT ─────────────────────────

// GET preferences handler
const handleGetPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawUserId = req.params.userId || (req.query.userId as string) || req.header('x-user-uid');
    const userId = String(rawUserId || '');
    if (!userId) {
      throw new AppError('INVALID_ARGUMENT', 'userId is required to fetch preferences');
    }

    const prefs = await getUserPreferences(userId);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    next(err);
  }
};

app.get('/api/v1/preferences/:userId', handleGetPreferences as any);
app.get('/preferences/:userId', handleGetPreferences as any);
app.get('/:userId', handleGetPreferences as any);

// PUT preferences handler
const handlePutPreferences = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const rawUserId = req.params.userId || req.body.userId || req.header('x-user-uid');
    const userId = String(rawUserId || '');
    if (!userId) {
      throw new AppError('INVALID_ARGUMENT', 'userId is required to update preferences');
    }

    const {
      phone_number,
      phoneNumber,
      whatsapp_enabled = true,
      whatsappEnabled = true,
      sms_enabled = true,
      smsEnabled = true,
      push_enabled = true,
      pushEnabled = true,
      preferred_channel,
      preferredChannel = 'whatsapp',
      categories = { orders: true, otps: true, bills: true, ownership: true, marketing: false },
      quiet_hours_start = null,
      quiet_hours_end = null,
      language = 'en',
    } = req.body;

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
    await recordOutbox(client, {
      aggregateType: 'NotificationPreferences',
      aggregateId: userId,
      operation: 'UPDATE',
      payload: updated,
      firestoreCollection: 'NotificationPreferences',
      firestoreDocId: userId,
    });

    await client.query('COMMIT');
    res.json({ success: true, preferences: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

app.put('/api/v1/preferences/:userId', handlePutPreferences as any);
app.put('/preferences/:userId', handlePutPreferences as any);
app.put('/:userId', handlePutPreferences as any);

// ─── USER INTERACTION ORCHESTRATION HELPERS ─────────────────────────────────

async function dispatchWhatsAppMessage(params: {
  to: string;
  templateName: string;
  language: string;
  bodyParameters: string[];
  documentUrl?: string;
  documentFilename?: string;
}) {
  logger.info(
    { to: params.to, template: params.templateName, doc: params.documentUrl },
    '[SocialConnect] Dispatching WhatsApp Cloud API message'
  );
  // Production integration uses Meta WhatsApp Cloud API:
  // POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
  return {
    whatsapp_message_id: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    status: 'sent',
  };
}

// ─── FEAT-13.02: WHATSAPP AUTHENTICATION & OTP ORCHESTRATION ────────────────

const handleOtpDispatch = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, phone, otpCode, code, purpose = 'login' } = req.body;
    const finalPhone = phoneNumber || phone;
    const finalCode = otpCode || code;

    if (!finalPhone || !finalCode) {
      throw new AppError('INVALID_ARGUMENT', 'phoneNumber and otpCode are required');
    }

    const lookupId = String(userId || finalPhone);
    const prefs = await getUserPreferences(lookupId);

    let channel = 'whatsapp';
    let dispatchResult: any;

    if (prefs.whatsapp_enabled && prefs.categories?.otps !== false) {
      try {
        dispatchResult = await dispatchWhatsAppMessage({
          to: finalPhone,
          templateName: 'logikchain_auth_otp',
          language: prefs.language || 'en',
          bodyParameters: [finalCode, '10 minutes'],
        });
      } catch (err: any) {
        logger.warn({ err: err.message }, 'WhatsApp OTP dispatch failed, falling back to SMS');
        channel = 'sms';
      }
    } else {
      channel = 'sms';
    }

    if (channel === 'sms') {
      logger.info({ phoneNumber: finalPhone, purpose }, '[SocialConnect] Dispatching SMS OTP fallback');
      dispatchResult = { external_message_id: `sms_${Date.now()}`, status: 'sent' };
    }

    await client.query(
      `
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        lookupId,
        channel,
        'otp',
        finalPhone,
        channel === 'whatsapp' ? 'logikchain_auth_otp' : 'sms_otp',
        JSON.stringify({ purpose, expires_in_minutes: 10 }),
        dispatchResult.whatsapp_message_id || dispatchResult.external_message_id,
        dispatchResult.status,
      ]
    );

    res.json({
      success: true,
      channel,
      status: dispatchResult.status,
      message: `OTP dispatched successfully via ${channel.toUpperCase()}`,
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

app.post('/api/v1/interaction/otp', handleOtpDispatch as any);
app.post('/interaction/otp', handleOtpDispatch as any);
app.post('/otp', handleOtpDispatch as any);

// Meta WhatsApp Webhook Challenge Verification (GET)
const handleWebhookVerification = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'logikchain_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('[SocialConnect] Meta WhatsApp Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, '[SocialConnect] Meta WhatsApp Webhook verification mismatch');
    res.status(403).json({ error: 'Verification token mismatch' });
  }
};

app.get('/api/v1/social/webhook', handleWebhookVerification as any);
app.get('/webhook/whatsapp', handleWebhookVerification as any);
app.get('/webhook', handleWebhookVerification as any);

// Meta WhatsApp Webhook Delivery Receipts (POST)
const handleWebhookReceipt = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses || [];

    for (const st of statuses) {
      const msgId = st.id;
      const status = st.status; // 'delivered' | 'read' | 'failed'
      if (msgId && status) {
        await pool.query(
          'UPDATE notification_dispatches SET status = $1, updated_at = NOW() WHERE external_message_id = $2',
          [status, msgId]
        );
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error processing WhatsApp webhook');
    res.status(200).send('EVENT_RECEIVED'); // WhatsApp requires 200 OK
  }
};

app.post('/api/v1/social/webhook', handleWebhookReceipt as any);
app.post('/webhook/whatsapp', handleWebhookReceipt as any);
app.post('/webhook', handleWebhookReceipt as any);

// ─── FEAT-13.03: REAL-TIME ORDER LIFECYCLE UPDATES & DELIVERY ALERTS ────────

const handleOrderUpdate = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, orderId, orderStatus, totalAmount, deliveryWindow } = req.body;
    if (!userId || !orderId || !orderStatus) {
      throw new AppError('INVALID_ARGUMENT', 'userId, orderId, and orderStatus are required');
    }

    const prefs = await getUserPreferences(String(userId));

    if (prefs.categories?.orders === false) {
      return res.json({ success: true, skipped: true, reason: 'User opted out of order notifications' });
    }

    let channel = prefs.preferred_channel || 'whatsapp';
    let dispatchResult: any;

    if (channel === 'whatsapp' && prefs.whatsapp_enabled) {
      dispatchResult = await dispatchWhatsAppMessage({
        to: phoneNumber || prefs.phone_number,
        templateName: 'logikchain_order_update',
        language: prefs.language || 'en',
        bodyParameters: [orderId, orderStatus, `₹${totalAmount || '0'}`, deliveryWindow || 'today'],
      });
    } else {
      channel = 'push';
      logger.info({ userId, orderId, orderStatus }, '[SocialConnect] Dispatching FCM In-App Push');
      dispatchResult = { external_message_id: `fcm_${Date.now()}`, status: 'sent' };
    }

    await client.query(
      `
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        String(userId),
        channel,
        'order_update',
        phoneNumber || userId,
        'logikchain_order_update',
        JSON.stringify({ orderId, orderStatus, totalAmount }),
        dispatchResult.whatsapp_message_id || dispatchResult.external_message_id,
        dispatchResult.status,
      ]
    );

    res.json({ success: true, channel, status: dispatchResult.status, orderId });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

app.post('/api/v1/interaction/order-update', handleOrderUpdate as any);
app.post('/interaction/order-update', handleOrderUpdate as any);
app.post('/order-update', handleOrderUpdate as any);

// ─── FEAT-13.04: DIGITAL BILLS, GST INVOICES & OWNERSHIP ALERTS ─────────────

// Bill & Invoices
const handleBillDispatch = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, billType, invoiceNumber, amount, pdfUrl } = req.body;
    if (!userId || !invoiceNumber || !pdfUrl) {
      throw new AppError('INVALID_ARGUMENT', 'userId, invoiceNumber, and pdfUrl are required');
    }

    const prefs = await getUserPreferences(String(userId));

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

    await client.query(
      `
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        String(userId),
        'whatsapp',
        'bill_invoice',
        phoneNumber || userId,
        'logikchain_tax_invoice',
        JSON.stringify({ billType, invoiceNumber, amount, pdfUrl }),
        dispatchResult.whatsapp_message_id,
        dispatchResult.status,
      ]
    );

    res.json({ success: true, channel: 'whatsapp', status: dispatchResult.status, invoiceNumber });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

app.post('/api/v1/interaction/bill', handleBillDispatch as any);
app.post('/interaction/bill', handleBillDispatch as any);
app.post('/bill', handleBillDispatch as any);

// Ownership Alerts
const handleOwnershipAlert = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, alertType, title, messageDetails } = req.body;
    if (!userId || !alertType || !title) {
      throw new AppError('INVALID_ARGUMENT', 'userId, alertType, and title are required');
    }

    const prefs = await getUserPreferences(String(userId));

    if (prefs.categories?.ownership === false) {
      return res.json({ success: true, skipped: true, reason: 'User opted out of ownership alerts' });
    }

    const dispatchResult = await dispatchWhatsAppMessage({
      to: phoneNumber || prefs.phone_number,
      templateName: 'logikchain_business_alert',
      language: prefs.language || 'en',
      bodyParameters: [title, alertType, JSON.stringify(messageDetails || {})],
    });

    await client.query(
      `
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        String(userId),
        'whatsapp',
        'ownership_alert',
        phoneNumber || userId,
        'logikchain_business_alert',
        JSON.stringify({ alertType, title, messageDetails }),
        dispatchResult.whatsapp_message_id,
        dispatchResult.status,
      ]
    );

    res.json({ success: true, channel: 'whatsapp', status: dispatchResult.status, alertType });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

app.post('/api/v1/interaction/ownership-alert', handleOwnershipAlert as any);
app.post('/interaction/ownership-alert', handleOwnershipAlert as any);
app.post('/ownership-alert', handleOwnershipAlert as any);

// ─── NOTIFICATION DISPATCH HISTORY (SHR-12 Notification Center) ─────────────

const handleGetDispatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawUserId = req.params.userId || req.header('x-user-uid');
    const userId = String(rawUserId || '');
    if (!userId) {
      throw new AppError('INVALID_ARGUMENT', 'userId is required');
    }

    const result = await pool.query(
      `SELECT id, channel, category, template_name, payload, status, created_at
       FROM notification_dispatches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ success: true, userId, notifications: result.rows });
  } catch (err) {
    next(err);
  }
};

app.get('/api/v1/notifications/:userId', handleGetDispatches as any);
app.get('/notifications/:userId', handleGetDispatches as any);
app.get('/dispatches/:userId', handleGetDispatches as any);

// Error Handler
app.use(errorHandler as any);

const PORT = process.env.PORT || 4012;

async function bootstrap() {
  await initDb();
  await syncer.start();
  app.listen(PORT, () => {
    logger.info(`Social Connect & Interaction Service running on port ${PORT} serving EPIC-13`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap Social Connect Service');
  process.exit(1);
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
