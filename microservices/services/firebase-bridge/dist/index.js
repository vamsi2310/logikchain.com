"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const common_1 = require("@logikchain/common");
const bridge_1 = require("./bridge");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
const port = process.env.PORT || 4050;
const bridge = new bridge_1.FirebaseBridge();
// Inbound listeners can be activated via environment flag
if (process.env.ENABLE_INBOUND_LISTENERS === 'true') {
    const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'http://orders-service:4002';
    const gigsServiceUrl = process.env.GIGS_SERVICE_URL || 'http://gigs-service:4003';
    // Listen to mobile offline outbox collections
    bridge.setupInboundListener('Orders', ordersServiceUrl, (data) => data._clientSource === 'mobile_offline');
    bridge.setupInboundListener('Gigs', gigsServiceUrl, (data) => data._clientSource === 'mobile_offline');
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'firebase-bridge',
        timestamp: new Date().toISOString(),
        metrics: bridge.getStats(),
    });
});
// Sync metrics endpoint
app.get('/sync/status', (req, res) => {
    res.json({
        service: 'firebase-bridge',
        stats: bridge.getStats(),
        timestamp: new Date().toISOString(),
    });
});
/**
 * Ingests transactional outbox batches streamed from Rust or TS microservices
 */
app.post('/v1/bridge/outbox', async (req, res) => {
    try {
        const { events } = req.body;
        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'Missing or invalid "events" array in request body' });
        }
        const result = await bridge.processOutboxBatch(events);
        return res.json({
            status: 'ok',
            syncedCount: result.syncedIds.length,
            failedCount: result.failedIds.length,
            syncedIds: result.syncedIds,
            failedIds: result.failedIds,
        });
    }
    catch (err) {
        common_1.logger.error({ err }, 'Error processing outbox batch in bridge');
        return res.status(500).json({ error: err.message || 'Internal bridge processing error' });
    }
});
/**
 * Generates signed upload URL for Cloud Storage
 */
app.post('/v1/bridge/storage/sign-upload', async (req, res) => {
    try {
        const { filePath, contentType, bucketName, expiresInMinutes } = req.body;
        if (!filePath || !contentType) {
            return res.status(400).json({ error: 'filePath and contentType are required' });
        }
        const result = await bridge.generateSignedUploadUrl({
            filePath,
            contentType,
            bucketName,
            expiresInMinutes,
        });
        return res.json(result);
    }
    catch (err) {
        common_1.logger.error({ err }, 'Error generating signed upload URL');
        return res.status(500).json({ error: err.message });
    }
});
/**
 * Generates signed download URL for Cloud Storage
 */
app.post('/v1/bridge/storage/sign-download', async (req, res) => {
    try {
        const { filePath, bucketName, expiresInMinutes } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'filePath is required' });
        }
        const result = await bridge.generateSignedDownloadUrl({
            filePath,
            bucketName,
            expiresInMinutes,
        });
        return res.json(result);
    }
    catch (err) {
        common_1.logger.error({ err }, 'Error generating signed download URL');
        return res.status(500).json({ error: err.message });
    }
});
app.listen(port, () => {
    common_1.logger.info({ port }, 'Firebase Sync Bridge listening for microservice outboxes');
});
exports.default = app;
