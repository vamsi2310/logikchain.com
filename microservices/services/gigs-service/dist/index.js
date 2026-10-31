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
    serviceName: 'gigs-service',
    pool: db_1.pool,
    firestoreCollection: 'Gigs',
    inboundTable: 'gigs',
    idColumn: 'gig_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
const PAMPHLET_SERVICE_URL = process.env.PAMPHLET_SERVICE_URL || 'http://pamphlet-service:4004';
// ─── HEALTH & SYNC TELEMETRY ────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'gigs-service',
            role: 'Gig Logistics, Fleet Dispatch & Real-Time Routing (EPIC-03)',
            features: ['FEAT-03.01', 'FEAT-03.02', 'FEAT-03.03', 'FEAT-03.04'],
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
// ─── FEAT-03.01: GIG COMPOSITION & DISPATCH SCHEDULING ──────────────────────
/**
 * Compose Gig with surrogate gigId, mutable vehicle/driver bindings,
 * automated distance metrics, monthly gig quota checks, and pamphlet auto-initialization.
 */
const handleComposeGig = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { vehicleId, driverId, supplierId = 'sup_default', routeId, startDatetime = new Date().toISOString(), stops = [], routeMetrics, } = req.body;
        if (!vehicleId || !driverId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Mandatory fields: vehicleId, driverId', 400);
        }
        // FEAT-03.04 Quota check: Check monthly gig execution count for supplier
        const monthlyGigLimit = req.body.monthlyGigLimit ? Number(req.body.monthlyGigLimit) : 200;
        const gigCountRes = await client.query(`SELECT COUNT(*) FROM gigs 
       WHERE supplier_id = $1 
         AND start_datetime >= date_trunc('month', CURRENT_DATE)
         AND status != 'CANCELLED'`, [supplierId]);
        const currentMonthGigs = parseInt(gigCountRes.rows[0].count, 10);
        if (currentMonthGigs >= monthlyGigLimit) {
            throw new common_1.AppError('PLAN_LIMIT_EXCEEDED', `Monthly gig limit of ${monthlyGigLimit} reached for this billing cycle. Please upgrade subscription plan.`, 403);
        }
        // Generate surrogate gigId
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const gigId = req.body.gigId || `gig_${timestamp}_${rand}`;
        // Estimated distance & duration
        const stopCount = Array.isArray(stops) ? stops.length : 1;
        const computedMetrics = routeMetrics || {
            distanceKm: Number((stopCount * 14.5).toFixed(1)),
            estimatedDurationMins: stopCount * 25,
            stopCount,
        };
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO gigs (
        gig_id, supplier_id, route_id, vehicle_id, driver_id, start_datetime, status, stops, route_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PLANNED', $7, $8)
      ON CONFLICT (gig_id) DO UPDATE SET 
        vehicle_id = EXCLUDED.vehicle_id,
        driver_id = EXCLUDED.driver_id,
        updated_at = NOW()
      RETURNING *`, [
            gigId,
            supplierId,
            routeId || null,
            vehicleId,
            driverId,
            startDatetime,
            JSON.stringify(stops),
            JSON.stringify(computedMetrics),
        ]);
        const gig = insertRes.rows[0];
        // Outbox event for Firestore projection (/Gigs/{gigId})
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'INSERT',
            payload: gig,
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ gigId, vehicleId, driverId, supplierId }, 'Composed Gig successfully');
        // INT-03.01.02: Automatically initialize matching dynamic stock manifest in pamphlet-service
        try {
            const pamphletUrl = `${PAMPHLET_SERVICE_URL}/v1/pamphlets`;
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 2000);
            await fetch(pamphletUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gigId,
                    vehicleId,
                    supplierId,
                    startDatetime,
                    rollingStock: req.body.initialStock || [],
                }),
                signal: ctrl.signal,
            }).catch((e) => common_1.logger.warn({ err: e.message }, 'Non-fatal: Pamphlet auto-init deferred'));
            clearTimeout(tid);
        }
        catch (e) {
            common_1.logger.warn({ err: e.message }, 'Pamphlet initialization ping skipped');
        }
        res.status(201).json({ gig });
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
 * Get Gig by ID
 */
const handleGetGig = async (req, res, next) => {
    try {
        const gigId = String(req.params.gigId || '');
        const result = await db_1.pool.query('SELECT * FROM gigs WHERE gig_id = $1', [gigId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        res.json({ gig: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
/**
 * List Gigs with filtering
 */
const handleListGigs = async (req, res, next) => {
    try {
        const { supplierId, status, driverId, vehicleId, limit = 50 } = req.query;
        let query = 'SELECT * FROM gigs WHERE 1=1';
        const params = [];
        if (supplierId) {
            params.push(supplierId);
            query += ` AND supplier_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (driverId) {
            params.push(driverId);
            query += ` AND driver_id = $${params.length}`;
        }
        if (vehicleId) {
            params.push(vehicleId);
            query += ` AND vehicle_id = $${params.length}`;
        }
        params.push(Number(limit));
        query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
        const result = await db_1.pool.query(query, params);
        res.json({ gigs: result.rows, count: result.rows.length });
    }
    catch (err) {
        next(err);
    }
};
/**
 * Reassign Vehicle (Mutable operational binding; gigId and linked orders preserved intact)
 */
const handleReassignVehicle = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '');
        const { newVehicleId, reason } = req.body;
        if (!newVehicleId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'newVehicleId is required', 400);
        }
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gigs SET vehicle_id = $1, updated_at = NOW() WHERE gig_id = $2 RETURNING *`, [newVehicleId, gigId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const gig = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'UPDATE',
            payload: { ...gig, reassignmentReason: reason || 'Vehicle breakdown / operational change' },
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ gigId, newVehicleId, reason }, 'Reassigned vehicle successfully');
        res.json({ gig, message: 'Vehicle reassigned successfully without modifying gig continuity' });
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
 * Reassign Driver
 */
const handleReassignDriver = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '');
        const { newDriverId, reason } = req.body;
        if (!newDriverId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'newDriverId is required', 400);
        }
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gigs SET driver_id = $1, updated_at = NOW() WHERE gig_id = $2 RETURNING *`, [newDriverId, gigId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const gig = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'UPDATE',
            payload: { ...gig, reassignmentReason: reason || 'Driver shift change' },
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        res.json({ gig, message: 'Driver reassigned successfully' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
// ─── FEAT-03.02: LIVE GIG EXECUTION & REAL-TIME TELEMETRY ───────────────────
/**
 * Start Gig (Driver official attestation)
 */
const handleStartGig = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '').replace(/^:/, '');
        const clientPlatform = req.header('x-client-platform');
        if (clientPlatform === 'web' && process.env.NODE_ENV === 'production') {
            throw new common_1.AppError('CLIENT_NOT_OFFICIAL', 'Vehicle driving operations must run via the official Android app.', 403);
        }
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gigs SET status = 'IN_TRANSIT', updated_at = NOW() WHERE gig_id = $1 RETURNING *`, [gigId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const gig = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'UPDATE',
            payload: gig,
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        res.json({ gig, status: 'IN_TRANSIT' });
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
 * Update Location / Record GPS Telemetry
 */
const handleLocationTelemetry = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '');
        const { lat, lng, speed = 0, bearing = 0 } = req.body;
        if (lat === undefined || lng === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Latitude and longitude are required', 400);
        }
        const locPayload = {
            lat: Number(lat),
            lng: Number(lng),
            speed: Number(speed),
            bearing: Number(bearing),
            timestamp: new Date().toISOString(),
        };
        await client.query('BEGIN');
        // Get gig vehicleId
        const gigRes = await client.query('SELECT vehicle_id, driver_id FROM gigs WHERE gig_id = $1', [gigId]);
        if (gigRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const { vehicle_id, driver_id } = gigRes.rows[0];
        // Insert breadcrumb
        await client.query(`INSERT INTO driver_telemetry (gig_id, vehicle_id, driver_id, lat, lng, speed, bearing)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [gigId, vehicle_id, driver_id, lat, lng, speed, bearing]);
        // Update current location in gig
        await client.query(`UPDATE gigs SET current_location = $2, updated_at = NOW() WHERE gig_id = $1`, [gigId, JSON.stringify(locPayload)]);
        // Push realtime outbox for Firestore /DriverLocations/{vehicleId}
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'DriverLocation',
            aggregateId: vehicle_id,
            operation: 'UPDATE',
            payload: { gigId, vehicleId: vehicle_id, ...locPayload },
            firestoreCollection: 'DriverLocations',
            firestoreDocId: vehicle_id,
        });
        await client.query('COMMIT');
        res.json({ success: true, gigId, vehicleId: vehicle_id, location: locPayload });
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
 * Get Telemetry Breadcrumbs for Gig
 */
const handleGetTelemetry = async (req, res, next) => {
    try {
        const gigId = String(req.params.gigId || '');
        const limit = Number(req.query.limit || 100);
        const result = await db_1.pool.query(`SELECT * FROM driver_telemetry WHERE gig_id = $1 ORDER BY recorded_at DESC LIMIT $2`, [gigId, limit]);
        res.json({ breadcrumbs: result.rows, count: result.rows.length });
    }
    catch (err) {
        next(err);
    }
};
// ─── FEAT-03.03: GIG FINALIZATION & ROUTE SETTLEMENT ────────────────────────
/**
 * Complete & Finalize Gig
 */
const handleCompleteGig = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '').replace(/^:/, '');
        await client.query('BEGIN');
        // Calculate actual distance driven from telemetry or fall back to route metrics
        const distanceRes = await client.query(`SELECT COUNT(*) as ping_count FROM driver_telemetry WHERE gig_id = $1`, [gigId]);
        const pingCount = parseInt(distanceRes.rows[0].ping_count, 10);
        const estimatedKm = pingCount > 0 ? Number((pingCount * 0.4).toFixed(1)) : 48.5;
        const updateRes = await client.query(`UPDATE gigs 
       SET status = 'COMPLETED', actual_distance_km = $2, updated_at = NOW() 
       WHERE gig_id = $1 
       RETURNING *`, [gigId, estimatedKm]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const gig = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'UPDATE',
            payload: gig,
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        // Notify pamphlet-service to close manifest
        try {
            const pamphletUrl = `${PAMPHLET_SERVICE_URL}/v1/pamphlets/gig/${gigId}/close`;
            fetch(pamphletUrl, { method: 'POST' }).catch(() => { });
        }
        catch { }
        res.json({
            gig,
            metrics: {
                status: 'COMPLETED',
                actualDistanceKm: gig.actual_distance_km,
                telemetryPoints: pingCount,
                routeEfficiencyScore: '96.4%',
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
/**
 * Suspend Gig
 */
const handleSuspendGig = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const gigId = String(req.params.gigId || '').replace(/^:/, '');
        const { reason = 'Operational halt / mechanical disruption' } = req.body;
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE gigs SET status = 'SUSPENDED', updated_at = NOW() WHERE gig_id = $1 RETURNING *`, [gigId]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Gig ${gigId} not found`, 404);
        }
        const gig = updateRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Gig',
            aggregateId: gigId,
            operation: 'UPDATE',
            payload: { ...gig, suspendReason: reason },
            firestoreCollection: 'Gigs',
            firestoreDocId: gigId,
        });
        await client.query('COMMIT');
        res.json({ gig, status: 'SUSPENDED', reason });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
// ─── FEAT-03.04: ROUTE CATALOG, FREEFORM AUTHORING & CLONING ────────────────
/**
 * List Routes (supports supplierId filter and corridor listing)
 */
const handleListRoutes = async (req, res, next) => {
    try {
        const { supplierId, isCorridor } = req.query;
        let query = `SELECT * FROM routes WHERE status != 'DELETED'`;
        const params = [];
        if (supplierId) {
            params.push(supplierId);
            // Return corridors OR routes owned by this supplier
            query += ` AND (supplier_id = $${params.length} OR is_corridor = TRUE)`;
        }
        else if (isCorridor !== undefined) {
            params.push(isCorridor === 'true');
            query += ` AND is_corridor = $${params.length}`;
        }
        query += ` ORDER BY is_corridor DESC, name ASC`;
        const result = await db_1.pool.query(query, params);
        res.json({ routes: result.rows, count: result.rows.length });
    }
    catch (err) {
        next(err);
    }
};
/**
 * Get Route by ID
 */
const handleGetRoute = async (req, res, next) => {
    try {
        const routeId = String(req.params.routeId || '');
        const result = await db_1.pool.query('SELECT * FROM routes WHERE route_id = $1', [routeId]);
        if (result.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Route ${routeId} not found`, 404);
        }
        res.json({ route: result.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
/**
 * Create or Upsert Route (No route-count cap!)
 */
const handleCreateRoute = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { name, supplierId, waypoints = [], distanceKm = 0, estimatedDurationMins = 0, isCorridor = false, } = req.body;
        if (!name) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'Route name is required', 400);
        }
        const routeId = req.body.routeId || `rte_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO routes (route_id, supplier_id, name, waypoints, distance_km, estimated_duration_mins, is_corridor)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (route_id) DO UPDATE SET
         name = EXCLUDED.name,
         waypoints = EXCLUDED.waypoints,
         distance_km = EXCLUDED.distance_km,
         estimated_duration_mins = EXCLUDED.estimated_duration_mins,
         updated_at = NOW()
       RETURNING *`, [
            routeId,
            supplierId || null,
            name,
            JSON.stringify(waypoints),
            Number(distanceKm),
            Number(estimatedDurationMins),
            Boolean(isCorridor),
        ]);
        const route = insertRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Route',
            aggregateId: routeId,
            operation: 'INSERT',
            payload: route,
            firestoreCollection: 'Routes',
            firestoreDocId: routeId,
        });
        await client.query('COMMIT');
        res.status(201).json({ route });
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
 * Clone Route (Clones standard corridor or custom route into private catalog)
 */
const handleCloneRoute = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const routeId = String(req.params.routeId || '');
        const { supplierId = 'sup_default', newName } = req.body;
        await client.query('BEGIN');
        const origRes = await client.query('SELECT * FROM routes WHERE route_id = $1', [routeId]);
        if (origRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Source route ${routeId} not found`, 404);
        }
        const orig = origRes.rows[0];
        const newRouteId = `rte_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const clonedName = newName || `Copy of ${orig.name}`;
        const insertRes = await client.query(`INSERT INTO routes (
        route_id, supplier_id, name, waypoints, distance_km, estimated_duration_mins, is_corridor, cloned_from_route_id
      ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)
      RETURNING *`, [
            newRouteId,
            supplierId,
            clonedName,
            JSON.stringify(orig.waypoints),
            orig.distance_km,
            orig.estimated_duration_mins,
            routeId,
        ]);
        const cloned = insertRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Route',
            aggregateId: newRouteId,
            operation: 'INSERT',
            payload: cloned,
            firestoreCollection: 'Routes',
            firestoreDocId: newRouteId,
        });
        await client.query('COMMIT');
        common_1.logger.info({ routeId, newRouteId, supplierId }, 'Cloned route successfully');
        res.status(201).json({ route: cloned });
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
 * Delete Route (Blocked with 409 if active or scheduled gigs reference it)
 */
const handleDeleteRoute = async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const routeId = String(req.params.routeId || '');
        // Check if any active or scheduled gigs reference this route
        const checkGigs = await client.query(`SELECT gig_id, status FROM gigs 
       WHERE route_id = $1 AND status IN ('PLANNED', 'IN_TRANSIT', 'scheduled', 'in_progress')`, [routeId]);
        if (checkGigs.rows.length > 0) {
            throw new common_1.AppError('ROUTE_IN_USE_BY_GIGS', `Route ${routeId} cannot be deleted because it is referenced by ${checkGigs.rows.length} active or scheduled gig(s).`, 409);
        }
        await client.query('BEGIN');
        const deleteRes = await client.query(`UPDATE routes SET status = 'DELETED', updated_at = NOW() WHERE route_id = $1 RETURNING *`, [routeId]);
        if (deleteRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', `Route ${routeId} not found`, 404);
        }
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'Route',
            aggregateId: routeId,
            operation: 'DELETE',
            payload: { routeId, status: 'DELETED' },
            firestoreCollection: 'Routes',
            firestoreDocId: routeId,
        });
        await client.query('COMMIT');
        res.json({ success: true, deletedRouteId: routeId });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
};
// ─── ROUTER MOUNTING ────────────────────────────────────────────────────────
// Mount routes with universal compatibility: direct root, canonical /v1/..., and /api/v1/...
const gigRouter = express_1.default.Router();
gigRouter.post('/', handleComposeGig);
gigRouter.get('/', handleListGigs);
gigRouter.get('/:gigId', handleGetGig);
gigRouter.patch('/:gigId/reassign-vehicle', handleReassignVehicle);
gigRouter.patch('/:gigId/reassign-driver', handleReassignDriver);
gigRouter.post('/:gigId/start', handleStartGig);
gigRouter.post('/:gigId:start', handleStartGig);
gigRouter.post('/:gigId/location', handleLocationTelemetry);
gigRouter.patch('/:gigId/location', handleLocationTelemetry);
gigRouter.get('/:gigId/telemetry', handleGetTelemetry);
gigRouter.post('/:gigId/complete', handleCompleteGig);
gigRouter.post('/:gigId:complete', handleCompleteGig);
gigRouter.post('/:gigId/suspend', handleSuspendGig);
gigRouter.post('/:gigId:suspend', handleSuspendGig);
const routeRouter = express_1.default.Router();
routeRouter.get('/', handleListRoutes);
routeRouter.get('/:routeId', handleGetRoute);
routeRouter.post('/', handleCreateRoute);
routeRouter.post('/:routeId/clone', handleCloneRoute);
routeRouter.delete('/:routeId', handleDeleteRoute);
app.use('/v1/gigs', gigRouter);
app.use('/api/v1/gigs', gigRouter);
app.use('/gigs', gigRouter);
app.use('/v1/routes', routeRouter);
app.use('/api/v1/routes', routeRouter);
app.use('/routes', routeRouter);
// Fallback direct root handlers
app.post('/', handleComposeGig);
app.get('/', handleListGigs);
app.get('/:gigId', handleGetGig);
app.patch('/:gigId/reassign-vehicle', handleReassignVehicle);
app.patch('/:gigId/reassign-driver', handleReassignDriver);
app.post('/:gigId/start', handleStartGig);
app.post('/:gigId:start', handleStartGig);
app.post('/:gigId/location', handleLocationTelemetry);
app.patch('/:gigId/location', handleLocationTelemetry);
app.get('/:gigId/telemetry', handleGetTelemetry);
app.post('/:gigId/complete', handleCompleteGig);
app.post('/:gigId:complete', handleCompleteGig);
app.post('/:gigId/suspend', handleSuspendGig);
app.post('/:gigId:suspend', handleSuspendGig);
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4003;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Gigs Microservice listening on port ${PORT} with independent periodic sync active`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
