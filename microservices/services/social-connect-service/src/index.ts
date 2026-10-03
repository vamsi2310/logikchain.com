import express from 'express';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox, getUserPreferences } from './db';

dotenv.config();

if (admin.apps.length === 0) {
  admin.initializeApp();
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

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'social-connect-service',
      role: 'User Interaction & Social Media Orchestrator',
      supportedChannels: ['whatsapp', 'sms', 'fcm_push'],
      timestamp: new Date().toISOString(),
      sync: syncer.getStats(),
    });
  } catch (err: any) {
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

// ─── NOTIFICATION PREFERENCE MANAGEMENT ─────────────────────────────────────

/**
 * GET /preferences/:userId
 * Retrieves user's notification preferences from local social_connect_db
 */
app.get('/preferences/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prefs = await getUserPreferences(userId);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /preferences/:userId
 * Updates user's notification preferences in local DB and queues Firestore sync
 */
app.put('/preferences/:userId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const {
      phone_number,
      whatsapp_enabled = true,
      sms_enabled = true,
      push_enabled = true,
      preferred_channel = 'whatsapp',
      categories = { orders: true, otps: true, bills: true, ownership: true, marketing: false },
      quiet_hours_start = null,
      quiet_hours_end = null,
      language = 'en',
    } = req.body;

    await client.query('BEGIN');

    const query = `
      INSERT INTO user_notification_preferences (
        user_id, phone_number, whatsapp_enabled, sms_enabled, push_enabled,
        preferred_channel, categories, quiet_hours_start, quiet_hours_end, language, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
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
      phone_number,
      whatsapp_enabled,
      sms_enabled,
      push_enabled,
      preferred_channel,
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
});

// ─── USER INTERACTION ORCHESTRATION ─────────────────────────────────────────

/**
 * Helper: Mock/Invoke WhatsApp Business Cloud API
 */
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
  // In production, invoke https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
  // with Authorization: Bearer {WHATSAPP_SYSTEM_ACCESS_TOKEN}
  return {
    whatsapp_message_id: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    status: 'sent',
  };
}

/**
 * POST /interaction/otp
 * Orchestrates Login / Signup OTP dispatch via WhatsApp with SMS fallback
 */
app.post('/interaction/otp', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, otpCode, purpose = 'login' } = req.body;
    if (!phoneNumber || !otpCode) {
      throw new AppError('INVALID_ARGUMENT', 'phoneNumber and otpCode are required');
    }

    // 1. Pull user preferences from local database
    const prefs = await getUserPreferences(userId || phoneNumber);

    let channel = 'whatsapp';
    let dispatchResult: any;

    // 2. Evaluate if WhatsApp is preferred and enabled for OTPs
    if (prefs.whatsapp_enabled && prefs.categories?.otps !== false) {
      try {
        dispatchResult = await dispatchWhatsAppMessage({
          to: phoneNumber,
          templateName: 'logikchain_auth_otp',
          language: prefs.language || 'en',
          bodyParameters: [otpCode, '10 minutes'],
        });
      } catch (err: any) {
        logger.warn({ err: err.message }, 'WhatsApp OTP dispatch failed, falling back to SMS');
        channel = 'sms';
      }
    } else {
      channel = 'sms';
    }

    // 3. Fallback to SMS if needed
    if (channel === 'sms') {
      logger.info({ phoneNumber, purpose }, '[SocialConnect] Dispatching SMS OTP fallback');
      dispatchResult = { external_message_id: `sms_${Date.now()}`, status: 'sent' };
    }

    // 4. Log notification dispatch record
    await client.query(
      `
      INSERT INTO notification_dispatches (
        user_id, channel, category, recipient, template_name, payload, external_message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        userId || phoneNumber,
        channel,
        'otp',
        phoneNumber,
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
});

/**
 * POST /interaction/order-update
 * Orchestrates Order lifecycle notifications (placed, out-for-delivery, delivered)
 */
app.post('/interaction/order-update', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, orderId, orderStatus, totalAmount, deliveryWindow } = req.body;
    if (!userId || !orderId || !orderStatus) {
      throw new AppError('INVALID_ARGUMENT', 'userId, orderId, and orderStatus are required');
    }

    // 1. Pull user preferences from local database
    const prefs = await getUserPreferences(userId);

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
        userId,
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
});

/**
 * POST /interaction/bill
 * Orchestrates PDF bills, invoices, and payment receipts via WhatsApp
 */
app.post('/interaction/bill', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, billType, invoiceNumber, amount, pdfUrl } = req.body;
    if (!userId || !invoiceNumber || !pdfUrl) {
      throw new AppError('INVALID_ARGUMENT', 'userId, invoiceNumber, and pdfUrl are required');
    }

    // 1. Pull user preferences from local database
    const prefs = await getUserPreferences(userId);

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
        userId,
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
});

/**
 * POST /interaction/ownership-alert
 * Orchestrates business ownership notifications: daily payout summaries, credit limit updates, fleet alerts
 */
app.post('/interaction/ownership-alert', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId, phoneNumber, alertType, title, messageDetails } = req.body;
    if (!userId || !alertType || !title) {
      throw new AppError('INVALID_ARGUMENT', 'userId, alertType, and title are required');
    }

    // 1. Pull user preferences from local database
    const prefs = await getUserPreferences(userId);

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
        userId,
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
});

/**
 * POST /webhook/whatsapp
 * Meta WhatsApp Cloud API Webhook for delivery receipts (sent, delivered, read)
 */
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    // In production, parse statuses array from Meta Webhook payload:
    // body.entry[0].changes[0].value.statuses[0]
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
});

app.use(errorHandler);

const PORT = process.env.PORT || 4012;

async function bootstrap() {
  await initDb();
  await syncer.start();
  app.listen(PORT, () => {
    logger.info(`Social Connect & Interaction Service running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap Social Connect Service');
  process.exit(1);
});
