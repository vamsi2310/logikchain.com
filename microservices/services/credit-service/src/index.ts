import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

process.on('unhandledRejection', (reason: any) => {
  logger.warn({ err: reason?.message || reason }, 'Safely caught unhandled rejection in credit-service');
});

process.on('uncaughtException', (err: any) => {
  logger.warn({ err: err?.message || err }, 'Safely caught uncaught exception in credit-service');
});

// Periodic sync for CreditProfiles to Firestore
const syncer = createPeriodicSyncer({
  serviceName: 'credit-service',
  pool,
  firestoreCollection: 'CreditProfiles',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

// Health check with DB and sync status probe
app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    res.json({
      status: 'ok',
      service: 'credit-service',
      port: 4008,
      database: {
        name: 'credit_db',
        type: 'PostgreSQL 16',
        status: 'connected',
        latencyMs,
      },
      timestamp: new Date().toISOString(),
      sync: syncer.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'degraded',
      service: 'credit-service',
      database: {
        name: 'credit_db',
        type: 'PostgreSQL 16',
        status: 'disconnected',
        error: err.message,
      },
      error: err.message,
    });
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

/* ==========================================================================
   FEAT-08.01: Merchant Credit Line Underwriting & Limit Assignment
   ========================================================================== */

/**
 * Underwrite / Set credit limit for a merchant with a specific supplier
 * POST /v1/credit/limits
 * Body: { merchantId, supplierId, creditLimit, termsCycleDays?, provisionalPolicy? }
 */
app.post(['/v1/credit/limits', '/credit/limits', '/limits', '/v1/credit/underwrite', '/credit/underwrite', '/underwrite'], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId, supplierId, creditLimit, termsCycleDays = 14, provisionalPolicy = 'STANDARD' } = req.body;
    if (!merchantId || !supplierId || creditLimit === undefined) {
      throw new AppError('INVALID_ARGUMENT', 'merchantId, supplierId, and creditLimit are required');
    }
    const limitNum = parseFloat(creditLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      throw new AppError('INVALID_ARGUMENT', 'creditLimit must be a non-negative number');
    }

    await client.query('BEGIN');

    // Check existing profile
    const existingRes = await client.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId]
    );

    let profile: any;
    if (existingRes.rows.length === 0) {
      const insertRes = await client.query(
        `INSERT INTO merchant_credit_profiles (
          merchant_id, supplier_id, credit_limit, utilized_credit, available_credit, terms_cycle_days, provisional_policy, status, updated_at
        ) VALUES ($1, $2, $3, 0.00, $3, $4, $5, 'ACTIVE', NOW())
        RETURNING *`,
        [merchantId, supplierId, limitNum, termsCycleDays, provisionalPolicy]
      );
      profile = insertRes.rows[0];
    } else {
      const current = existingRes.rows[0];
      const newAvailable = Math.max(0, limitNum - parseFloat(current.utilized_credit));
      const updateRes = await client.query(
        `UPDATE merchant_credit_profiles
         SET credit_limit = $3, available_credit = $4, terms_cycle_days = $5, provisional_policy = $6, updated_at = NOW()
         WHERE merchant_id = $1 AND supplier_id = $2
         RETURNING *`,
        [merchantId, supplierId, limitNum, newAvailable, termsCycleDays, provisionalPolicy]
      );
      profile = updateRes.rows[0];
    }

    await recordOutbox(client, {
      aggregateType: 'CreditProfile',
      aggregateId: `${merchantId}_${supplierId}`,
      operation: 'UPDATE',
      payload: profile,
      firestoreCollection: 'CreditProfiles',
      firestoreDocId: `${merchantId}_${supplierId}`,
    });

    await client.query('COMMIT');
    res.status(200).json({ success: true, profile });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Get supplier-specific credit profile for a merchant
 * GET /v1/credit/profiles/:merchantId/supplier/:supplierId
 */
app.get(['/v1/credit/profiles/:merchantId/supplier/:supplierId', '/credit/profiles/:merchantId/supplier/:supplierId', '/profiles/:merchantId/supplier/:supplierId'], async (req, res, next) => {
  try {
    const { merchantId, supplierId } = req.params;
    const queryRes = await pool.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId]
    );
    if (queryRes.rows.length === 0) {
      return res.status(200).json({
        profile: {
          merchant_id: merchantId,
          supplier_id: supplierId,
          credit_limit: '0.00',
          utilized_credit: '0.00',
          available_credit: '0.00',
          terms_cycle_days: 14,
          status: 'UNPROVISIONED',
        },
      });
    }
    res.json({ profile: queryRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * Get all credit lines for a merchant
 * GET /v1/credit/merchants/:merchantId
 */
app.get(['/v1/credit/merchants/:merchantId', '/credit/merchants/:merchantId', '/merchants/:merchantId'], async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const queryRes = await pool.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 ORDER BY updated_at DESC`,
      [merchantId]
    );
    res.json({ merchantId, profiles: queryRes.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Merchant requests credit limit increase
 * POST /v1/credit/requests
 */
app.post(['/v1/credit/requests', '/credit/requests', '/requests'], async (req, res, next) => {
  try {
    const { merchantId, supplierId, requestedLimit, reason } = req.body;
    if (!merchantId || !supplierId || !requestedLimit) {
      throw new AppError('INVALID_ARGUMENT', 'merchantId, supplierId, and requestedLimit are required');
    }

    const currentRes = await pool.query(
      `SELECT credit_limit FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId]
    );
    const currentLimit = currentRes.rows[0]?.credit_limit || 0.00;

    const insertRes = await pool.query(
      `INSERT INTO credit_increase_requests (merchant_id, supplier_id, requested_limit, current_limit, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [merchantId, supplierId, requestedLimit, currentLimit, reason || '']
    );

    res.status(201).json({ success: true, request: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * Review / Approve / Reject credit limit increase
 * POST /v1/credit/requests/:id/review
 */
app.post(['/v1/credit/requests/:id/review', '/credit/requests/:id/review', '/requests/:id/review'], async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = req.params.id as string;
    const { status, reviewedBy, reviewNotes } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('INVALID_ARGUMENT', 'status must be APPROVED or REJECTED');
    }

    await client.query('BEGIN');
    const updateReqRes = await client.query(
      `UPDATE credit_increase_requests
       SET status = $2, reviewed_by = $3, review_notes = $4, reviewed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, status, reviewedBy || 'SUPPLIER_ADMIN', reviewNotes || '']
    );
    if (updateReqRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Credit request not found', 404);
    }
    const creq = updateReqRes.rows[0];

    let profile: any = null;
    if (status === 'APPROVED') {
      const limitNum = parseFloat(creq.requested_limit);
      const existingRes = await client.query(
        `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2`,
        [creq.merchant_id, creq.supplier_id]
      );

      if (existingRes.rows.length === 0) {
        const ins = await client.query(
          `INSERT INTO merchant_credit_profiles (
            merchant_id, supplier_id, credit_limit, utilized_credit, available_credit, status, updated_at
          ) VALUES ($1, $2, $3, 0.00, $3, 'ACTIVE', NOW()) RETURNING *`,
          [creq.merchant_id, creq.supplier_id, limitNum]
        );
        profile = ins.rows[0];
      } else {
        const cur = existingRes.rows[0];
        const newAvailable = Math.max(0, limitNum - parseFloat(cur.utilized_credit));
        const upd = await client.query(
          `UPDATE merchant_credit_profiles
           SET credit_limit = $3, available_credit = $4, updated_at = NOW()
           WHERE merchant_id = $1 AND supplier_id = $2 RETURNING *`,
          [creq.merchant_id, creq.supplier_id, limitNum, newAvailable]
        );
        profile = upd.rows[0];
      }

      await recordOutbox(client, {
        aggregateType: 'CreditProfile',
        aggregateId: `${creq.merchant_id}_${creq.supplier_id}`,
        operation: 'UPDATE',
        payload: profile,
        firestoreCollection: 'CreditProfiles',
        firestoreDocId: `${creq.merchant_id}_${creq.supplier_id}`,
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, request: creq, profile });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* ==========================================================================
   FEAT-08.02: Revolving Credit Authorization & Supplier-Scoped Holds
   ========================================================================== */

/**
 * Synchronous Two-Phase Credit Hold Gate
 * POST /v1/credit/holds
 * Body: { merchantId, supplierId, orderId, amount }
 */
app.post(['/v1/credit/holds', '/credit/holds', '/holds'], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId, supplierId, orderId, amount } = req.body;
    if (!merchantId || !supplierId || !orderId || amount === undefined) {
      throw new AppError('INVALID_ARGUMENT', 'merchantId, supplierId, orderId, and amount are required');
    }
    const holdAmount = parseFloat(amount);
    if (isNaN(holdAmount) || holdAmount <= 0) {
      throw new AppError('INVALID_ARGUMENT', 'amount must be greater than zero');
    }

    // Execute with serializable transactional locking to prevent race-condition overdrafts
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ');

    const profileRes = await client.query(
      `SELECT * FROM merchant_credit_profiles
       WHERE merchant_id = $1 AND supplier_id = $2
       FOR UPDATE`,
      [merchantId, supplierId]
    );

    if (profileRes.rows.length === 0) {
      throw new AppError('CREDIT_UNAVAILABLE', `No credit profile exists for merchant with supplier ${supplierId}`, 402);
    }

    const profile = profileRes.rows[0];
    if (profile.status !== 'ACTIVE') {
      throw new AppError(
        'CREDIT_LOCKED',
        `Credit facility with supplier ${supplierId} is currently ${profile.status}`,
        403
      );
    }

    const available = parseFloat(profile.available_credit);
    if (available < holdAmount) {
      throw new AppError(
        'INSUFFICIENT_CREDIT_LIMIT',
        `Available credit (₹${available.toFixed(2)}) is insufficient for order amount (₹${holdAmount.toFixed(2)})`,
        402
      );
    }

    // Decrement available credit, increment utilized credit
    const updatedAvailable = available - holdAmount;
    const updatedUtilized = parseFloat(profile.utilized_credit) + holdAmount;

    await client.query(
      `UPDATE merchant_credit_profiles
       SET available_credit = $3, utilized_credit = $4, updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId, updatedAvailable, updatedUtilized]
    );

    const holdRes = await client.query(
      `INSERT INTO credit_holds (merchant_id, supplier_id, order_id, hold_amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [merchantId, supplierId, orderId, holdAmount]
    );

    const hold = holdRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditHold',
      aggregateId: hold.id,
      operation: 'INSERT',
      payload: hold,
      firestoreCollection: 'CreditHolds',
      firestoreDocId: hold.id,
    });

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      holdId: hold.id,
      merchantId,
      supplierId,
      orderId,
      holdAmount,
      status: 'PENDING',
      availableCredit: updatedAvailable,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Commit Credit Hold (Order placed successfully)
 * POST /v1/credit/holds/:id/commit
 */
app.post(['/v1/credit/holds/:id/commit', '/credit/holds/:id/commit', '/holds/:id/commit'], async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = req.params.id as string;
    await client.query('BEGIN');

    const holdRes = await client.query(`SELECT * FROM credit_holds WHERE id = $1 FOR UPDATE`, [id]);
    if (holdRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Hold not found', 404);
    }
    const hold = holdRes.rows[0];
    if (hold.status === 'COMMITTED') {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Hold already committed', hold });
    }
    if (hold.status === 'RELEASED') {
      throw new AppError('INVALID_STATE', 'Hold has already been released', 409);
    }

    const updRes = await client.query(
      `UPDATE credit_holds SET status = 'COMMITTED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    const committedHold = updRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditHold',
      aggregateId: id,
      operation: 'UPDATE',
      payload: committedHold,
      firestoreCollection: 'CreditHolds',
      firestoreDocId: id,
    });

    await client.query('COMMIT');
    res.json({ success: true, status: 'COMMITTED', hold: committedHold });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Release Credit Hold (Order failed / canceled)
 * POST /v1/credit/holds/:id/release
 */
app.post(['/v1/credit/holds/:id/release', '/credit/holds/:id/release', '/holds/:id/release'], async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = req.params.id as string;
    const { releaseAmount } = req.body;

    await client.query('BEGIN');
    const holdRes = await client.query(`SELECT * FROM credit_holds WHERE id = $1 FOR UPDATE`, [id]);
    if (holdRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Hold not found', 404);
    }
    const hold = holdRes.rows[0];
    if (hold.status === 'RELEASED') {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Hold already released', hold });
    }

    const amountToRestore = releaseAmount !== undefined ? parseFloat(releaseAmount) : parseFloat(hold.hold_amount);

    // Restore available credit to the merchant-supplier credit profile
    await client.query(
      `UPDATE merchant_credit_profiles
       SET available_credit = available_credit + $3,
           utilized_credit = GREATEST(0.00, utilized_credit - $3),
           updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2`,
      [hold.merchant_id, hold.supplier_id, amountToRestore]
    );

    const updRes = await client.query(
      `UPDATE credit_holds SET status = 'RELEASED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    const releasedHold = updRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditHold',
      aggregateId: id,
      operation: 'UPDATE',
      payload: releasedHold,
      firestoreCollection: 'CreditHolds',
      firestoreDocId: id,
    });

    await client.query('COMMIT');
    res.json({ success: true, status: 'RELEASED', hold: releasedHold });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* ==========================================================================
   FEAT-08.03: Credit Repayment Collection & Post-Due Relief
   ========================================================================== */

/**
 * Confirm Credit Repayment (In-person driver cash or online UPI)
 * POST /v1/credit/repayments/confirm
 * Body: { merchantId, supplierId, amount, repaymentChannel, driverId?, gigId?, referenceId?, notes? }
 */
app.post(['/v1/credit/repayments/confirm', '/credit/repayments/confirm', '/repayments/confirm', '/repayments'], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId, supplierId, amount, repaymentChannel = 'CASH', driverId, gigId, referenceId, notes } = req.body;
    if (!merchantId || amount === undefined) {
      throw new AppError('INVALID_ARGUMENT', 'merchantId and amount are required');
    }
    const repayNum = parseFloat(amount);
    if (isNaN(repayNum) || repayNum <= 0) {
      throw new AppError('INVALID_ARGUMENT', 'amount must be a positive number');
    }

    await client.query('BEGIN');

    // If supplierId not provided, repay across oldest utilized supplier profiles
    const profilesRes = supplierId
      ? await client.query(`SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2 FOR UPDATE`, [merchantId, supplierId])
      : await client.query(`SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND utilized_credit > 0 ORDER BY updated_at ASC FOR UPDATE`, [merchantId]);

    if (profilesRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'No matching active credit profile found for merchant', 404);
    }

    const targetProfile = profilesRes.rows[0];
    const actualSupplierId = targetProfile.supplier_id;

    // Headroom math
    const newUtilized = Math.max(0.00, parseFloat(targetProfile.utilized_credit) - repayNum);
    const newAvailable = Math.min(parseFloat(targetProfile.credit_limit), parseFloat(targetProfile.available_credit) + repayNum);

    const updProfileRes = await client.query(
      `UPDATE merchant_credit_profiles
       SET utilized_credit = $3, available_credit = $4, updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2
       RETURNING *`,
      [merchantId, actualSupplierId, newUtilized, newAvailable]
    );

    const insRepay = await client.query(
      `INSERT INTO credit_repayments (
        merchant_id, supplier_id, amount, repayment_channel, driver_id, gig_id, reference_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CONFIRMED')
      RETURNING *`,
      [merchantId, actualSupplierId, repayNum, repaymentChannel, driverId || null, gigId || null, referenceId || null, notes || '']
    );

    const repayment = insRepay.rows[0];

    // Outbox events
    await recordOutbox(client, {
      aggregateType: 'CreditRepayment',
      aggregateId: repayment.id,
      operation: 'INSERT',
      payload: repayment,
      firestoreCollection: 'CreditRepayments',
      firestoreDocId: repayment.id,
    });

    await recordOutbox(client, {
      aggregateType: 'CreditProfile',
      aggregateId: `${merchantId}_${actualSupplierId}`,
      operation: 'UPDATE',
      payload: updProfileRes.rows[0],
      firestoreCollection: 'CreditProfiles',
      firestoreDocId: `${merchantId}_${actualSupplierId}`,
    });

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      repayment,
      profile: updProfileRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * List repayments for a merchant
 * GET /v1/credit/merchants/:merchantId/repayments
 */
app.get(['/v1/credit/merchants/:merchantId/repayments', '/credit/merchants/:merchantId/repayments', '/merchants/:merchantId/repayments'], async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const queryRes = await pool.query(
      `SELECT * FROM credit_repayments WHERE merchant_id = $1 ORDER BY created_at DESC`,
      [merchantId]
    );
    res.json({ merchantId, repayments: queryRes.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Get Comprehensive Merchant Credit Statement
 * GET /v1/credit/merchants/:merchantId/statement
 */
app.get([
  '/v1/credit/merchants/:merchantId/statement',
  '/credit/merchants/:merchantId/statement',
  '/merchants/:merchantId/statement',
], async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const profilesRes = await pool.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 ORDER BY updated_at DESC`,
      [merchantId]
    );

    const holdsRes = await pool.query(
      `SELECT * FROM credit_holds WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [merchantId]
    );

    const repaymentsRes = await pool.query(
      `SELECT * FROM credit_repayments WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [merchantId]
    );

    const reliefRes = await pool.query(
      `SELECT * FROM credit_relief_plans WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [merchantId]
    );

    let totalLimit = 0;
    let totalUtilized = 0;
    let totalAvailable = 0;

    profilesRes.rows.forEach(p => {
      totalLimit += parseFloat(p.credit_limit || '0');
      totalUtilized += parseFloat(p.utilized_credit || '0');
      totalAvailable += parseFloat(p.available_credit || '0');
    });

    res.json({
      merchantId,
      summary: {
        totalLimit,
        totalUtilized,
        totalAvailable,
        profilesCount: profilesRes.rows.length,
      },
      profiles: profilesRes.rows,
      recentHolds: holdsRes.rows,
      recentRepayments: repaymentsRes.rows,
      activeReliefPlans: reliefRes.rows,
      statementGeneratedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Apply Post-Due Relief Plan
 * POST /v1/credit/merchants/:merchantId/relief
 * Body: { supplierId, reliefType, extendedDays, waivedPenalties, notes, approvedBy }
 */
app.post([
  '/v1/credit/merchants/:merchantId/relief',
  '/credit/merchants/:merchantId/relief',
  '/merchants/:merchantId/relief',
], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId } = req.params;
    const { supplierId, reliefType = 'GRACE_EXTENSION', extendedDays = 14, waivedPenalties = 0, notes = '', approvedBy = 'SUPPORT_OPERATOR' } = req.body;
    if (!supplierId) {
      throw new AppError('INVALID_ARGUMENT', 'supplierId is required');
    }

    await client.query('BEGIN');

    const profileRes = await client.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2 FOR UPDATE`,
      [merchantId, supplierId]
    );

    if (profileRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', `Credit profile for merchant with supplier ${supplierId} not found`, 404);
    }

    // Insert relief plan
    const insRelief = await client.query(
      `INSERT INTO credit_relief_plans (
        merchant_id, supplier_id, relief_type, extended_days, waived_penalties, notes, approved_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
      RETURNING *`,
      [merchantId, supplierId, reliefType, extendedDays, waivedPenalties, notes, approvedBy]
    );

    // Reset status to ACTIVE and increment terms cycle
    const updProfile = await client.query(
      `UPDATE merchant_credit_profiles
       SET status = 'ACTIVE',
           terms_cycle_days = terms_cycle_days + $3,
           updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2
       RETURNING *`,
      [merchantId, supplierId, extendedDays]
    );

    const reliefPlan = insRelief.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditReliefPlan',
      aggregateId: reliefPlan.id,
      operation: 'INSERT',
      payload: reliefPlan,
      firestoreCollection: 'CreditReliefPlans',
      firestoreDocId: reliefPlan.id,
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, reliefPlan, profile: updProfile.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* ==========================================================================
   FEAT-08.04: Terms & Dispute Management
   ========================================================================== */

/**
 * Get terms of trade credit agreement
 * GET /v1/credit/merchants/:merchantId/suppliers/:supplierId/terms
 */
app.get([
  '/merchants/:merchantId/suppliers/:supplierId/terms',
  '/v1/credit/merchants/:merchantId/suppliers/:supplierId/terms',
  '/credit/merchants/:merchantId/suppliers/:supplierId/terms',
], async (req, res, next) => {
  try {
    const { merchantId, supplierId } = req.params;
    const profileRes = await pool.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId]
    );
    const profile = profileRes.rows[0];

    const agreementRes = await pool.query(
      `SELECT * FROM credit_agreements WHERE merchant_id = $1 AND supplier_id = $2 ORDER BY accepted_at DESC LIMIT 1`,
      [merchantId, supplierId]
    );

    res.json({
      merchantId,
      supplierId,
      creditLimit: profile?.credit_limit || '0.00',
      availableCredit: profile?.available_credit || '0.00',
      repaymentCycleDays: profile?.terms_cycle_days || 14,
      gracePeriodDays: 5,
      agingBuckets: {
        current: '0-14 days',
        grace: '15-20 days',
        defaulted: '21+ days',
      },
      status: profile?.status || 'UNPROVISIONED',
      latestAgreement: agreementRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Digital Acceptance of Trade Credit Agreement
 * POST /v1/credit/merchants/:merchantId/suppliers/:supplierId/terms/accept
 * Body: { termsVersion, cycleDays?, interestRatePct?, acceptedBy }
 */
app.post([
  '/merchants/:merchantId/suppliers/:supplierId/terms/accept',
  '/v1/credit/merchants/:merchantId/suppliers/:supplierId/terms/accept',
  '/credit/merchants/:merchantId/suppliers/:supplierId/terms/accept',
], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId, supplierId } = req.params;
    const { termsVersion = 'v1.0', cycleDays = 14, interestRatePct = 0.00, acceptedBy } = req.body;
    if (!acceptedBy) {
      throw new AppError('INVALID_ARGUMENT', 'acceptedBy is required');
    }

    await client.query('BEGIN');

    const insAgreement = await client.query(
      `INSERT INTO credit_agreements (
        merchant_id, supplier_id, terms_version, cycle_days, interest_rate_pct, accepted_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [merchantId, supplierId, termsVersion, cycleDays, interestRatePct, acceptedBy]
    );

    // Update terms cycle days on profile if exists
    await client.query(
      `UPDATE merchant_credit_profiles
       SET terms_cycle_days = $3, updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2`,
      [merchantId, supplierId, cycleDays]
    );

    const agreement = insAgreement.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditAgreement',
      aggregateId: agreement.id,
      operation: 'INSERT',
      payload: agreement,
      firestoreCollection: 'CreditAgreements',
      firestoreDocId: agreement.id,
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, agreement });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Aging Ledger Analysis
 * GET /v1/credit/merchants/:merchantId/aging
 */
app.get([
  '/v1/credit/merchants/:merchantId/aging',
  '/credit/merchants/:merchantId/aging',
  '/merchants/:merchantId/aging',
], async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const profilesRes = await pool.query(
      `SELECT * FROM merchant_credit_profiles WHERE merchant_id = $1`,
      [merchantId]
    );

    let currentBucket = 0;
    let graceBucket = 0;
    let overdueBucket = 0;
    let defaultBucket = 0;

    profilesRes.rows.forEach(p => {
      const utilized = parseFloat(p.utilized_credit || '0');
      if (utilized > 0) {
        if (p.status === 'OVERDUE_LOCKED' || p.status === 'DEFAULTED') {
          defaultBucket += utilized;
        } else if (p.status === 'OVERDUE') {
          overdueBucket += utilized;
        } else {
          currentBucket += utilized;
        }
      }
    });

    res.json({
      merchantId,
      agingBuckets: {
        current_0_14_days: currentBucket,
        grace_15_20_days: graceBucket,
        overdue_21_30_days: overdueBucket,
        default_31_plus_days: defaultBucket,
      },
      totalOutstanding: currentBucket + graceBucket + overdueBucket + defaultBucket,
      calculatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Trigger Default Recovery Lockdown
 * POST /v1/credit/merchants/:merchantId/lockdown
 * Body: { supplierId, reason }
 */
app.post([
  '/v1/credit/merchants/:merchantId/lockdown',
  '/credit/merchants/:merchantId/lockdown',
  '/merchants/:merchantId/lockdown',
], async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { merchantId } = req.params;
    const { supplierId, reason = 'EXCEEDED_MAX_OVERDUE_WINDOW' } = req.body;
    if (!supplierId) {
      throw new AppError('INVALID_ARGUMENT', 'supplierId is required');
    }

    await client.query('BEGIN');

    const updRes = await client.query(
      `UPDATE merchant_credit_profiles
       SET status = 'OVERDUE_LOCKED', updated_at = NOW()
       WHERE merchant_id = $1 AND supplier_id = $2
       RETURNING *`,
      [merchantId, supplierId]
    );

    if (updRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', `Credit profile for merchant with supplier ${supplierId} not found`, 404);
    }

    const lockedProfile = updRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditLockdown',
      aggregateId: `${merchantId}_${supplierId}`,
      operation: 'UPDATE',
      payload: { ...lockedProfile, reason },
      firestoreCollection: 'CreditProfiles',
      firestoreDocId: `${merchantId}_${supplierId}`,
    });

    await client.query('COMMIT');
    res.status(200).json({ success: true, lockdownStatus: 'OVERDUE_LOCKED', profile: lockedProfile, reason });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Raise credit dispute
 * POST /v1/credit/merchants/:merchantId/disputes
 */
app.post(['/v1/credit/merchants/:merchantId/disputes', '/credit/merchants/:merchantId/disputes', '/merchants/:merchantId/disputes'], async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const { supplierId, reason, disputedAmount } = req.body;
    if (!supplierId || !reason) {
      throw new AppError('INVALID_ARGUMENT', 'supplierId and reason are required');
    }

    const insRes = await pool.query(
      `INSERT INTO credit_disputes (merchant_id, supplier_id, reason, disputed_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [merchantId, supplierId, reason, disputedAmount || null]
    );

    res.status(201).json({ success: true, dispute: insRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4008;

initDb().then(() => {
  syncer.start();
  app.listen(PORT, () => {
    logger.info(`Credit Microservice (EPIC-08) listening on port ${PORT} with periodic CDC active`);
  });
}).catch((err) => {
  logger.error({ err: err.message }, 'Failed to initialize Credit database');
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
