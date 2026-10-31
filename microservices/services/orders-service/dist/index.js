"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const common_1 = require("@logikchain/common");
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = (0, common_1.createPeriodicSyncer)({
    serviceName: 'orders-service',
    pool: db_1.pool,
    firestoreCollection: 'Orders',
    inboundTable: 'orders',
    idColumn: 'order_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
// Health check endpoint
app.get('/health', async (req, res) => {
    const start = Date.now();
    try {
        await db_1.pool.query('SELECT 1');
        const latencyMs = Date.now() - start;
        res.json({
            status: 'ok',
            service: 'orders-service',
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected',
                latencyMs,
            },
            sync: syncer.getStats(),
        });
    }
    catch (err) {
        res.status(500).json({
            status: 'degraded',
            service: 'orders-service',
            error: err.message,
            database: {
                status: 'disconnected',
                error: err.message,
            },
        });
    }
});
// Sync status & trigger
app.get('/sync/status', (req, res) => {
    res.json(syncer.getStats());
});
app.post('/sync/trigger', async (req, res) => {
    const syncedOutbox = await syncer.syncOutbox();
    const syncedStorage = await syncer.syncStorage();
    res.json({ triggered: true, syncedOutbox, syncedStorage, stats: syncer.getStats() });
});
/**
 * Helper to handle order creation
 */
async function handleCreateOrder(req, res, next) {
    const client = await db_1.pool.connect();
    try {
        const { buyerId, merchantId, supplierId, gigId, items, totalAmount, paymentType, deliveryAddress, creditHoldId, paymentIntentId, } = req.body;
        const idempotencyKey = (req.header('idempotency-key') || req.body.idempotencyKey);
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        if (!buyerId || !items || !totalAmount || !paymentType) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Missing mandatory order fields: buyerId, items, totalAmount, paymentType.', 400);
        }
        // Default or random 6-digit handover OTP
        const handoverOtp = req.body.handoverOtp || Math.floor(100000 + Math.random() * 900000).toString();
        await client.query('BEGIN');
        // Idempotency verification
        if (idempotencyKey) {
            const existing = await client.query('SELECT * FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
            if (existing.rows.length > 0) {
                await client.query('COMMIT');
                res.status(200).json({ order: existing.rows[0], idempotentReplay: true });
                return;
            }
        }
        const insertQuery = `
      INSERT INTO orders (
        order_id, buyer_id, merchant_id, supplier_id, gig_id, status, payment_type,
        total_amount, items, delivery_address, credit_hold_id, payment_intent_id,
        handover_otp, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, 'PLACED', $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
        const result = await client.query(insertQuery, [
            orderId,
            buyerId,
            merchantId || null,
            supplierId || null,
            gigId || null,
            paymentType,
            totalAmount,
            JSON.stringify(items),
            JSON.stringify(deliveryAddress || {}),
            creditHoldId || null,
            paymentIntentId || null,
            handoverOtp,
            idempotencyKey || null,
        ]);
        const createdOrder = result.rows[0];
        // Seed pending handover record
        await client.query(`INSERT INTO order_handovers (handover_id, order_id, driver_id, otp_code, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`, [`hov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, orderId, gigId || 'unassigned', handoverOtp]);
        // Outbox CDC event
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Order',
            aggregateId: orderId,
            operation: 'INSERT',
            payload: createdOrder,
            firestoreCollection: 'Orders',
            firestoreDocId: orderId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ orderId, buyerId, paymentType }, 'Order placed successfully');
        res.status(201).json({
            order: createdOrder,
            otpPreview: handoverOtp,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
}
/**
 * Helper to handle vehicle departure gate
 */
async function handleVehicleDeparture(req, res, next) {
    const client = await db_1.pool.connect();
    try {
        const orderId = req.params.orderId;
        const { driverId, vehicleRegNumber, manifestChecked, temperatureCheck } = req.body;
        if (!manifestChecked) {
            throw new common_1.AppError('VEHICLE_DEPARTURE_GATE_FAILED', 'Physical manifest check is mandatory. Vehicle cannot depart without manifest clearance.', 422);
        }
        await client.query('BEGIN');
        const existing = await client.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
        if (existing.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Order ${orderId} does not exist.`, 404);
        }
        const manifestData = {
            driverId,
            vehicleRegNumber: vehicleRegNumber || 'DL-TEMP-GATE',
            manifestChecked: true,
            temperatureCheck: temperatureCheck !== undefined ? temperatureCheck : true,
            departureClearedAt: new Date().toISOString(),
        };
        const updateRes = await client.query(`UPDATE orders 
       SET status = 'DISPATCHED_IN_TRANSIT', departure_manifest = $1, dispatched_at = NOW(), updated_at = NOW()
       WHERE order_id = $2
       RETURNING *`, [JSON.stringify(manifestData), orderId]);
        const updated = updateRes.rows[0];
        // Outbox event
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Order',
            aggregateId: orderId,
            operation: 'UPDATE',
            payload: { ...updated, event: 'VehicleDepartureCleared' },
            firestoreCollection: 'Orders',
            firestoreDocId: orderId,
        });
        await client.query('COMMIT');
        res.json({ order: updated, departureCleared: true });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
}
/**
 * Helper to handle OTP delivery handover gate
 */
async function handleHandoverOtp(req, res, next) {
    const client = await db_1.pool.connect();
    try {
        const orderId = req.params.orderId;
        const { driverId, otpCode, signaturePod } = req.body;
        if (!otpCode) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Delivery handover requires a 6-digit OTP verification code.', 400);
        }
        await client.query('BEGIN');
        const orderRes = await client.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
        if (orderRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Order ${orderId} does not exist.`, 404);
        }
        const order = orderRes.rows[0];
        // Verify OTP against stored OTP or master test code '948210'
        const valid = order.handover_otp === otpCode || otpCode === '948210';
        if (!valid) {
            throw new common_1.AppError('INVALID_HANDOVER_OTP', 'Provided OTP is invalid or expired. Custody handover rejected.', 401);
        }
        // Mark Order Delivered
        const updateRes = await client.query(`UPDATE orders 
       SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
       WHERE order_id = $1
       RETURNING *`, [orderId]);
        // Update handover table
        await client.query(`UPDATE order_handovers 
       SET status = 'VERIFIED', verified_at = NOW(), signature_pod = $1
       WHERE order_id = $2`, [signaturePod || 'SIGNED_DIGITAL_OTP', orderId]);
        const updatedOrder = updateRes.rows[0];
        // Outbox event for financial settlement trigger
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Order',
            aggregateId: orderId,
            operation: 'UPDATE',
            payload: {
                ...updatedOrder,
                event: 'OrderHandoverCompleted',
                handoverStatus: 'VERIFIED',
                deliveredByDriver: driverId || 'driver_auto',
            },
            firestoreCollection: 'Orders',
            firestoreDocId: orderId,
        });
        await client.query('COMMIT');
        res.json({ order: updatedOrder, handoverVerified: true });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
}
/**
 * Route aliases: Support root, /orders, and /v1/orders
 */
const orderRoutes = ['/', '/orders', '/v1/orders'];
const orderItemRoutes = ['/:orderId', '/orders/:orderId', '/v1/orders/:orderId'];
const departRoutes = ['/:orderId/depart', '/orders/:orderId/depart', '/v1/orders/:orderId/depart'];
const otpRoutes = ['/:orderId/handover/otp', '/orders/:orderId/handover/otp', '/v1/orders/:orderId/handover/otp'];
app.post(orderRoutes, handleCreateOrder);
app.post(departRoutes, handleVehicleDeparture);
app.post(otpRoutes, handleHandoverOtp);
// List orders
app.get(orderRoutes, async (req, res, next) => {
    try {
        const list = await db_1.pool.query('SELECT * FROM orders ORDER BY captured_at DESC LIMIT 50');
        res.json({ orders: list.rows });
    }
    catch (err) {
        next(err);
    }
});
/* ==========================================================================
   FEAT-02.04: Order Deliverables, Customer Return Policy & RTO Protocol
   ========================================================================== */
const deliverablePolicyRoutes = [
    '/policies/deliverables',
    '/orders/policies/deliverables',
    '/v1/orders/policies/deliverables',
];
app.get(deliverablePolicyRoutes, (req, res) => {
    res.json({
        success: true,
        retentionWindowHours: 72,
        pudoPolicy: {
            location: 'Village Merchant Kirana Drop Point',
            maximumHoldingTimeHours: 72,
            rtoTriggerOnTimeout: true,
            dailyReminders: ['WhatsApp', 'SMS', 'Push'],
        },
        doorstepInspection: {
            allowedBeforeSignoff: true,
            lineItemRejectionSupported: true,
            otpSignoffReleasesAcceptedPortion: true,
        },
        nonReturnableCategories: [
            { category: 'seeds', condition: 'Sealed hybrid seeds with broken tamper-evident seals' },
            { category: 'agrochemicals', condition: 'Pesticides, bio-fertilizers, or liquid chemicals opened post-dispatch' },
            { category: 'perishables', condition: 'Perishable agro-produce accepted upon physical delivery handover' },
        ],
        refundRules: {
            prepaidDoorstepRejection: 'Automatic reversal to UPI payment source within 24 hours',
            rtoRefund: 'Refund of invoice amount minus standard reverse transit fee',
        },
    });
});
const returnInitiateRoutes = [
    '/:orderId/returns/initiate',
    '/orders/:orderId/returns/initiate',
    '/v1/orders/:orderId/returns/initiate',
];
async function handleInitiateReturn(req, res, next) {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { orderId } = req.params;
        const { reason = 'DAMAGED_AT_DOORSTEP', lineItems = [], refundAmount = 0 } = req.body;
        const ordQuery = await client.query('SELECT * FROM orders WHERE order_id = $1 FOR UPDATE', [orderId]);
        if (ordQuery.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Order ${orderId} not found`, 404);
        }
        const order = ordQuery.rows[0];
        const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const returnInsert = await client.query(`INSERT INTO order_returns (return_id, order_id, buyer_id, reason, line_items, refund_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'INITIATED')
       RETURNING *`, [returnId, orderId, order.buyer_id, reason, JSON.stringify(lineItems), refundAmount]);
        await client.query(`UPDATE orders SET status = 'partially_delivered', updated_at = NOW() WHERE order_id = $1`, [orderId]);
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'OrderReturn',
            aggregateId: returnId,
            operation: 'INSERT',
            payload: returnInsert.rows[0],
            firestoreCollection: 'OrderReturns',
            firestoreDocId: returnId,
        });
        await client.query('COMMIT');
        res.status(201).json({ success: true, returnRequest: returnInsert.rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
}
app.post(returnInitiateRoutes, handleInitiateReturn);
const rtoTriggerRoutes = [
    '/:orderId/rto/trigger',
    '/orders/:orderId/rto/trigger',
    '/v1/orders/:orderId/rto/trigger',
];
async function handleTriggerRTO(req, res, next) {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { orderId } = req.params;
        const { triggerReason = '72_HOUR_EXPIRATION', reverseGigId } = req.body;
        const ordQuery = await client.query('SELECT * FROM orders WHERE order_id = $1 FOR UPDATE', [orderId]);
        if (ordQuery.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Order ${orderId} not found`, 404);
        }
        const order = ordQuery.rows[0];
        const rtoId = `rto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const rtoInsert = await client.query(`INSERT INTO order_rtos (rto_id, order_id, merchant_id, supplier_id, trigger_reason, status, reverse_gig_id)
       VALUES ($1, $2, $3, $4, $5, 'RTO_INITIATED', $6)
       RETURNING *`, [rtoId, orderId, order.merchant_id, order.supplier_id, triggerReason, reverseGigId || null]);
        await client.query(`UPDATE orders SET status = 'rto_initiated', updated_at = NOW() WHERE order_id = $1`, [orderId]);
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'OrderRTO',
            aggregateId: rtoId,
            operation: 'INSERT',
            payload: rtoInsert.rows[0],
            firestoreCollection: 'OrderRTOs',
            firestoreDocId: rtoId,
        });
        await client.query('COMMIT');
        res.status(201).json({ success: true, rto: rtoInsert.rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
}
app.post(rtoTriggerRoutes, handleTriggerRTO);
// Get order details
app.get(orderItemRoutes, async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        const query = await db_1.pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
        if (query.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', 'Order not found', 404);
        }
        const handovers = await db_1.pool.query('SELECT * FROM order_handovers WHERE order_id = $1', [orderId]);
        res.json({ order: query.rows[0], handovers: handovers.rows });
    }
    catch (err) {
        next(err);
    }
});
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4002;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Orders Microservice listening on port ${PORT}`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
