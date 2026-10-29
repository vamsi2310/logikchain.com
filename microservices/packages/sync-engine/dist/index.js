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
const pg_1 = require("pg");
const admin = __importStar(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
const common_1 = require("@logikchain/common");
const firestore_syncer_1 = require("./firestore-syncer");
const storage_syncer_1 = require("./storage-syncer");
dotenv_1.default.config();
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sync_db',
    max: 10,
});
const firestore = admin.firestore();
const storage = admin.storage();
const defaultBucketName = process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';
const firestoreSyncer = new firestore_syncer_1.FirestoreSyncer({ dbPool: pool, firestore, batchSize: 50 });
const storageSyncer = new storage_syncer_1.StorageSyncer({ dbPool: pool, storage, defaultBucketName });
// Start real-time inbound listeners for core mobile-synchronized collections
firestoreSyncer.startInboundFirestoreListeners([
    'Orders',
    'Gigs',
    'CashSettlements',
    'CustodyTransfers',
]);
let isRunning = true;
async function pollLoop() {
    while (isRunning) {
        try {
            await firestoreSyncer.syncOutboxToFirestore();
            await storageSyncer.syncPendingStorageEvents();
        }
        catch (err) {
            common_1.logger.error({ err: err.message }, 'Error in sync engine polling loop');
        }
        await new Promise((resolve) => setTimeout(resolve, parseInt(process.env.SYNC_INTERVAL_MS || '3000', 10)));
    }
}
pollLoop().catch((err) => common_1.logger.fatal(err, 'Sync engine crashed'));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', service: 'sync-engine', timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ status: 'degraded', error: err.message });
    }
});
const PORT = process.env.PORT || 4050;
app.listen(PORT, () => {
    common_1.logger.info(`Sync Engine service listening on port ${PORT}`);
});
process.on('SIGTERM', () => {
    common_1.logger.info('Shutting down sync engine gracefully...');
    isRunning = false;
    firestoreSyncer.stop();
    pool.end();
    process.exit(0);
});
