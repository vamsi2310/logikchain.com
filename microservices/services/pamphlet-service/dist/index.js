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
    serviceName: 'pamphlet-service',
    pool: db_1.pool,
    firestoreCollection: 'Pamphlets',
    inboundTable: 'gig_pamphlets',
    idColumn: 'pamphlet_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
// ─── HEALTH & SYNC TELEMETRY ────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'pamphlet-service',
            role: 'Pamphlet & Dynamic Inventory Distribution (EPIC-04)',
            features: ['FEAT-04.01', 'FEAT-04.02', 'FEAT-04.03'],
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
 * Create Gig Pamphlet (surrogate key pmp_*, linked to gigId, dual cargo partitioning)
 */
const handleCreatePamphlet = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { gigId, vehicleId, supplierId = 'sup_default', startDatetime = new Date().toISOString(), rollingStock = [], preBookedOrders = [], totalCargoValue = 0, } = req.body;
        if (!gigId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'gigId is required', 400);
        }
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const pamphletId = req.body.pamphletId || `pmp_${timestamp}_${rand}`;
        // Calculate total cargo value if not provided
        let calculatedValue = Number(totalCargoValue);
        if (!calculatedValue && Array.isArray(rollingStock)) {
            calculatedValue = rollingStock.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 50), 0);
        }
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO gig_pamphlets (
        pamphlet_id, gig_id, vehicle_id, supplier_id, start_datetime, status, 
        rolling_stock, pre_booked_orders, loaded_items, total_cargo_value
      ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, $9)
      ON CONFLICT (gig_id) DO UPDATE SET
        updated_at = NOW(),
        vehicle_id = EXCLUDED.vehicle_id
      RETURNING *`, [
            pamphletId,
            gigId,
            vehicleId || 'veh_unassigned',
            supplierId,
            startDatetime,
            JSON.stringify(rollingStock),
            JSON.stringify(preBookedOrders),
            JSON.stringify(rollingStock), // initial loaded stock mirrors rolling stock
            calculatedValue,
        ]);
        const pamphlet = insertRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Pamphlet',
            aggregateId: pamphlet.pamphlet_id,
            operation: 'INSERT',
            payload: pamphlet,
            firestoreCollection: 'Pamphlets',
            firestoreDocId: pamphlet.pamphlet_id,
        });
        await client.query('COMMIT');
        common_1.logger.info({ pamphletId: pamphlet.pamphlet_id, gigId }, 'Created Gig Pamphlet manifest');
        res.status(201).json({ pamphlet });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
/**
 * Get Pamphlet by pamphletId
 */
const handleGetPamphlet = async (req, res, next) => {
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const result = await db_1.pool.query('SELECT * FROM gig_pamphlets WHERE pamphlet_id = $1', [pamphletId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        res.json({ pamphlet: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
/**
 * Get Pamphlet by gigId
 */
const handleGetPamphletByGig = async (req, res, next) => {
    try {
        const gigId = String(req.params.gigId || '');
        const result = await db_1.pool.query('SELECT * FROM gig_pamphlets WHERE gig_id = $1', [gigId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `No pamphlet found for Gig ${gigId}`, 404);
        }
        res.json({ pamphlet: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
/**
 * Deduct Rolling Transit Stock (Dynamic In-Transit Order Conversion)
 * Atomically decrements from rolling_stock and appends to pre_booked_orders
 */
const handleDeductTransitStock = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const { skuId, quantity = 1, orderId } = req.body;
        if (!skuId || !orderId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'skuId and orderId are required', 400);
        }
        const deductQty = Number(quantity);
        if (deductQty <= 0) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Quantity must be greater than zero', 400);
        }
        await client.query('BEGIN');
        // Strict row lock
        const currentRes = await client.query('SELECT * FROM gig_pamphlets WHERE pamphlet_id = $1 FOR UPDATE', [pamphletId]);
        if (currentRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const pamphlet = currentRes.rows[0];
        const rollingStock = pamphlet.rolling_stock || [];
        const itemIndex = rollingStock.findIndex((it) => it.skuId === skuId);
        if (itemIndex === -1 || (rollingStock[itemIndex].quantity || 0) < deductQty) {
            const available = itemIndex !== -1 ? rollingStock[itemIndex].quantity : 0;
            throw new common_1.AppError('INSUFFICIENT_STOCK', `Insufficient rolling transit stock for SKU ${skuId}. Available: ${available}, Requested: ${deductQty}`, 400);
        }
        // Decrement rolling stock
        rollingStock[itemIndex].quantity -= deductQty;
        const remainingQty = rollingStock[itemIndex].quantity;
        const unitPrice = rollingStock[itemIndex].unitPrice || 0;
        // Append to pre_booked_orders
        const preBookedOrders = pamphlet.pre_booked_orders || [];
        preBookedOrders.push({
            orderId,
            skuId,
            name: rollingStock[itemIndex].name || skuId,
            quantity: deductQty,
            unitPrice,
            convertedAt: new Date().toISOString(),
        });
        const updateRes = await client.query(`UPDATE gig_pamphlets 
       SET rolling_stock = $2, pre_booked_orders = $3, updated_at = NOW() 
       WHERE pamphlet_id = $1 
       RETURNING *`, [pamphletId, JSON.stringify(rollingStock), JSON.stringify(preBookedOrders)]);
        const updatedPamphlet = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Pamphlet',
            aggregateId: pamphletId,
            operation: 'UPDATE',
            payload: {
                pamphletId,
                orderId,
                skuId,
                deductedQuantity: deductQty,
                remainingStock: remainingQty,
            },
            firestoreCollection: 'Pamphlets',
            firestoreDocId: pamphletId,
        });
        await client.query('COMMIT');
        res.json({
            success: true,
            pamphletId,
            orderId,
            skuId,
            deductedQuantity: deductQty,
            remainingStock: remainingQty,
            pamphlet: updatedPamphlet,
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
// ─── FEAT-04.02: WAREHOUSE LOADING, UNLOADING & STOCK DELTAS ────────────────
/**
 * Load Stock Batch onto vehicle pamphlet
 */
const handleLoadStock = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const { items = [], operatorId = 'op_warehouse_01' } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Array of items is required', 400);
        }
        await client.query('BEGIN');
        const currentRes = await client.query('SELECT * FROM gig_pamphlets WHERE pamphlet_id = $1 FOR UPDATE', [pamphletId]);
        if (currentRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const pamphlet = currentRes.rows[0];
        const rollingStock = pamphlet.rolling_stock || [];
        const loadedHistory = pamphlet.loaded_items || [];
        let additionalValue = 0;
        for (const newItem of items) {
            const qty = Number(newItem.quantity || 0);
            const price = Number(newItem.unitPrice || 50);
            additionalValue += qty * price;
            const existing = rollingStock.find((it) => it.skuId === newItem.skuId);
            if (existing) {
                existing.quantity += qty;
                if (newItem.unitPrice)
                    existing.unitPrice = price;
            }
            else {
                rollingStock.push({
                    skuId: newItem.skuId,
                    name: newItem.name || newItem.skuId,
                    quantity: qty,
                    unitPrice: price,
                });
            }
        }
        loadedHistory.push({
            batchTimestamp: new Date().toISOString(),
            operatorId,
            items,
        });
        const newTotalValue = Number(pamphlet.total_cargo_value || 0) + additionalValue;
        const updateRes = await client.query(`UPDATE gig_pamphlets 
       SET rolling_stock = $2, loaded_items = $3, total_cargo_value = $4, updated_at = NOW() 
       WHERE pamphlet_id = $1 
       RETURNING *`, [pamphletId, JSON.stringify(rollingStock), JSON.stringify(loadedHistory), newTotalValue]);
        const updated = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Pamphlet',
            aggregateId: pamphletId,
            operation: 'UPDATE',
            payload: updated,
            firestoreCollection: 'Pamphlets',
            firestoreDocId: pamphletId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ pamphletId, itemsLoaded: items.length }, 'Loaded stock batch onto vehicle');
        res.json({ pamphlet: updated });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
/**
 * Gate Seal Sign-Off (Driver & Warehouse Gate approval)
 */
const handleSealPamphlet = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const { driverId, operatorId, signature } = req.body;
        const gateSeal = {
            driverId: driverId || 'driver_default',
            operatorId: operatorId || 'gate_loader_01',
            sealedAt: new Date().toISOString(),
            signature: signature || 'SIG_VERIFIED_DIGITAL_OTP',
        };
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gig_pamphlets 
       SET status = 'SEALED', gate_seal = $2, updated_at = NOW() 
       WHERE pamphlet_id = $1 
       RETURNING *`, [pamphletId, JSON.stringify(gateSeal)]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const updated = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Pamphlet',
            aggregateId: pamphletId,
            operation: 'UPDATE',
            payload: updated,
            firestoreCollection: 'Pamphlets',
            firestoreDocId: pamphletId,
        });
        await client.query('COMMIT');
        res.json({ pamphlet: updated, status: 'SEALED', gateSeal });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
/**
 * Unload Stock (Return intake at warehouse post-trip)
 */
const handleUnloadStock = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const { items = [], warehouseId = 'wh_hub_central' } = req.body;
        await client.query('BEGIN');
        const currentRes = await client.query('SELECT unloaded_items FROM gig_pamphlets WHERE pamphlet_id = $1', [pamphletId]);
        if (currentRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const unloadedHistory = currentRes.rows[0].unloaded_items || [];
        unloadedHistory.push({
            unloadedAt: new Date().toISOString(),
            warehouseId,
            items,
        });
        const updateRes = await client.query(`UPDATE gig_pamphlets SET unloaded_items = $2, updated_at = NOW() WHERE pamphlet_id = $1 RETURNING *`, [pamphletId, JSON.stringify(unloadedHistory)]);
        const updated = updateRes.rows[0];
        await client.query('COMMIT');
        res.json({ pamphlet: updated, unloaded: items });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
/**
 * Close Pamphlet
 */
const handleClosePamphlet = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletIdOrGig = String(req.params.pamphletId || req.params.gigId || '');
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gig_pamphlets 
       SET status = 'CLOSED', updated_at = NOW() 
       WHERE pamphlet_id = $1 OR gig_id = $1 
       RETURNING *`, [pamphletIdOrGig]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet not found for ID/Gig: ${pamphletIdOrGig}`, 404);
        }
        const updated = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Pamphlet',
            aggregateId: updated.pamphlet_id,
            operation: 'UPDATE',
            payload: updated,
            firestoreCollection: 'Pamphlets',
            firestoreDocId: updated.pamphlet_id,
        });
        await client.query('COMMIT');
        res.json({ pamphlet: updated, status: 'CLOSED' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
// ─── FEAT-04.03: IN-TRANSIT ADJUSTMENTS & DAMAGE CLAIMS ─────────────────────
/**
 * Adjust Stock Item (Breakage/damage logging, evaluates 0.5% standard rural shrinkage allowance)
 */
const handleAdjustStock = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const { skuId, damagedQty, reason = 'damaged_in_transit', photoUrl, unitPrice = 100, } = req.body;
        if (!skuId || damagedQty === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'skuId and damagedQty are required', 400);
        }
        const damageCount = Math.abs(Number(damagedQty));
        const itemPrice = Number(unitPrice);
        const totalDamageValue = damageCount * itemPrice;
        await client.query('BEGIN');
        // Row lock on pamphlet
        const pamRes = await client.query('SELECT * FROM gig_pamphlets WHERE pamphlet_id = $1 FOR UPDATE', [pamphletId]);
        if (pamRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const pamphlet = pamRes.rows[0];
        const totalCargoValue = Number(pamphlet.total_cargo_value) || 100000;
        const rollingStock = pamphlet.rolling_stock || [];
        // Deduct deliverable quantity
        const item = rollingStock.find((it) => it.skuId === skuId);
        let remainingStock = 0;
        if (item) {
            item.quantity = Math.max(0, (item.quantity || 0) - damageCount);
            remainingStock = item.quantity;
        }
        // Shrinkage evaluation against 0.5% (0.005) rural road threshold
        const damageRatio = totalDamageValue / totalCargoValue;
        const isAllowableShrinkage = damageRatio <= 0.005;
        const claimStatus = isAllowableShrinkage ? 'ALLOWABLE_RURAL_SHRINKAGE' : 'UNDER_REVIEW';
        const liability = isAllowableShrinkage ? 'SUPPLIER_SHRINKAGE' : 'PENDING_INVESTIGATION';
        const claimId = `clm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query(`INSERT INTO damage_claims (
        claim_id, pamphlet_id, sku_id, damaged_qty, unit_price, total_damaged_value, 
        reason, photo_url, claim_status, liability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            claimId,
            pamphletId,
            skuId,
            damageCount,
            itemPrice,
            totalDamageValue,
            reason,
            photoUrl || null,
            claimStatus,
            liability,
        ]);
        // Update rolling stock in pamphlet
        await client.query(`UPDATE gig_pamphlets SET rolling_stock = $2, updated_at = NOW() WHERE pamphlet_id = $1`, [pamphletId, JSON.stringify(rollingStock)]);
        // Record outbox for Claim and Pamphlet
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'DamageClaim',
            aggregateId: claimId,
            operation: 'INSERT',
            payload: {
                claimId,
                pamphletId,
                skuId,
                damagedQty: damageCount,
                totalDamageValue,
                damageRatio: `${(damageRatio * 100).toFixed(2)}%`,
                claimStatus,
                liability,
                photoUrl,
            },
            firestoreCollection: 'Claims',
            firestoreDocId: claimId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ claimId, claimStatus, liability }, 'Recorded in-transit damage claim');
        res.status(201).json({
            claim: {
                claimId,
                pamphletId,
                skuId,
                damagedQty: damageCount,
                totalDamageValue,
                damageRatio: `${(damageRatio * 100).toFixed(2)}%`,
                claimStatus,
                liability,
            },
            remainingStock,
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
/**
 * Get Snapshot of Pamphlet (all partitions and claims)
 */
const handleGetSnapshot = async (req, res, next) => {
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const pamRes = await db_1.pool.query('SELECT * FROM gig_pamphlets WHERE pamphlet_id = $1', [pamphletId]);
        if (pamRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Pamphlet ${pamphletId} not found`, 404);
        }
        const claimsRes = await db_1.pool.query('SELECT * FROM damage_claims WHERE pamphlet_id = $1 ORDER BY created_at DESC', [pamphletId]);
        const pamphlet = pamRes.rows[0];
        res.json({
            pamphletId,
            gigId: pamphlet.gig_id,
            vehicleId: pamphlet.vehicle_id,
            status: pamphlet.status,
            totalCargoValue: pamphlet.total_cargo_value,
            rollingStock: pamphlet.rolling_stock,
            preBookedOrders: pamphlet.pre_booked_orders,
            loadedItems: pamphlet.loaded_items,
            unloadedItems: pamphlet.unloaded_items,
            gateSeal: pamphlet.gate_seal,
            claims: claimsRes.rows,
            updatedAt: pamphlet.updated_at,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * List Damage Claims for Pamphlet
 */
const handleGetClaims = async (req, res, next) => {
    try {
        const pamphletId = String(req.params.pamphletId || '');
        const claimsRes = await db_1.pool.query('SELECT * FROM damage_claims WHERE pamphlet_id = $1 ORDER BY created_at DESC', [pamphletId]);
        res.json({ claims: claimsRes.rows, count: claimsRes.rows.length });
    }
    catch (err) {
        next(err);
    }
};
// ─── ROUTER MOUNTING ────────────────────────────────────────────────────────
const pamphletRouter = express_1.default.Router();
pamphletRouter.post('/', handleCreatePamphlet);
pamphletRouter.get('/:pamphletId', handleGetPamphlet);
pamphletRouter.get('/gig/:gigId', handleGetPamphletByGig);
pamphletRouter.post('/:pamphletId/deduct-transit-stock', handleDeductTransitStock);
pamphletRouter.post('/:pamphletId/load', handleLoadStock);
pamphletRouter.post('/:pamphletId/seal', handleSealPamphlet);
pamphletRouter.post('/:pamphletId/unload', handleUnloadStock);
pamphletRouter.post('/:pamphletId/close', handleClosePamphlet);
pamphletRouter.post('/gig/:gigId/close', handleClosePamphlet);
pamphletRouter.post('/:pamphletId/adjust', handleAdjustStock);
pamphletRouter.get('/:pamphletId/snapshot', handleGetSnapshot);
pamphletRouter.get('/:pamphletId/claims', handleGetClaims);
app.use('/v1/pamphlets', pamphletRouter);
app.use('/api/v1/pamphlets', pamphletRouter);
app.use('/api/v1/pamphlet', pamphletRouter);
app.use('/pamphlets', pamphletRouter);
// Fallback direct root handlers
app.post('/', handleCreatePamphlet);
app.get('/:pamphletId', handleGetPamphlet);
app.get('/gig/:gigId', handleGetPamphletByGig);
app.post('/:pamphletId/deduct-transit-stock', handleDeductTransitStock);
app.post('/:pamphletId/load', handleLoadStock);
app.post('/:pamphletId/seal', handleSealPamphlet);
app.post('/:pamphletId/unload', handleUnloadStock);
app.post('/:pamphletId/close', handleClosePamphlet);
app.post('/gig/:gigId/close', handleClosePamphlet);
app.post('/:pamphletId/adjust', handleAdjustStock);
app.get('/:pamphletId/snapshot', handleGetSnapshot);
app.get('/:pamphletId/claims', handleGetClaims);
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4004;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Pamphlet Microservice listening on port ${PORT} with independent periodic sync active`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
