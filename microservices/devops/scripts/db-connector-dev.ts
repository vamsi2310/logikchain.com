import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
dotenv.config({ path: path.resolve(currentDir, '../../.env.development') });

export interface ServiceDbDefinition {
  epic: string;
  service: string;
  database: string;
  port: number;
  description: string;
}

export const SERVICE_DATABASES: ServiceDbDefinition[] = [
  { epic: 'EPIC-01', service: 'identity-service', database: 'identity_db', port: 4001, description: 'Identity, Auth & Access' },
  { epic: 'EPIC-02', service: 'orders-service', database: 'orders_db', port: 4002, description: 'Orders & Commerce Fulfillment' },
  { epic: 'EPIC-03', service: 'gigs-service', database: 'gigs_db', port: 4003, description: 'Gig Logistics & Fleet Dispatch' },
  { epic: 'EPIC-04', service: 'pamphlet-service', database: 'pamphlet_db', port: 4004, description: 'Pamphlet & Inventory Distribution' },
  { epic: 'EPIC-05', service: 'payments-service', database: 'payments_db', port: 4005, description: 'Payments, UPI & Collections' },
  { epic: 'EPIC-06', service: 'payouts-service', database: 'payouts_db', port: 4006, description: 'Payouts & Disbursements' },
  { epic: 'EPIC-07', service: 'cash-service', database: 'cash_db', port: 4007, description: 'Rural Cash & CoD Custody' },
  { epic: 'EPIC-08', service: 'credit-service', database: 'credit_db', port: 4008, description: 'Merchant Working Capital Credit' },
  { epic: 'EPIC-09', service: 'finance-service', database: 'finance_db', port: 4009, description: 'Financial Ledger & Reconciliation' },
  { epic: 'EPIC-10', service: 'config-service', database: 'config_db', port: 4010, description: 'Platform Geo-Hierarchy & Config' },
  { epic: 'EPIC-11', service: 'governance-service', database: 'governance_db', port: 4011, description: 'Platform Governance & AML' },
  { epic: 'EPIC-12', service: 'gateway / sync-engine', database: 'sync_db', port: 8080, description: 'Transactional Outbox & Sync CDC' },
  { epic: 'EPIC-13', service: 'social-connect-service', database: 'social_connect_db', port: 4012, description: 'Social Connect & Notifications' },
];

export interface DbStatusResult {
  epic: string;
  service: string;
  database: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  latencyMs: number;
  tables: number;
  hasOutbox: boolean;
  error?: string;
}

export async function createDbClient(database: string): Promise<Client> {
  const host = process.env.DATABASE_HOST || '127.0.0.1';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgrespassword';

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 3000,
  });

  await client.connect();
  return client;
}

export async function auditDbMesh(): Promise<DbStatusResult[]> {
  const results: DbStatusResult[] = [];

  for (const item of SERVICE_DATABASES) {
    const start = Date.now();
    let client: Client | null = null;
    try {
      client = await createDbClient(item.database);
      const latencyMs = Date.now() - start;

      const countRes = await client.query(
        "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tables = countRes.rows[0]?.count ?? 0;

      const outboxRes = await client.query(
        "SELECT to_regclass('public.outbox_events') as tbl"
      );
      const hasOutbox = Boolean(outboxRes.rows[0]?.tbl);

      results.push({
        epic: item.epic,
        service: item.service,
        database: item.database,
        port: item.port,
        status: 'ONLINE',
        latencyMs,
        tables,
        hasOutbox,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      results.push({
        epic: item.epic,
        service: item.service,
        database: item.database,
        port: item.port,
        status: 'OFFLINE',
        latencyMs,
        tables: 0,
        hasOutbox: false,
        error: err.message,
      });
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  return results;
}

export async function executeAdHocQuery(database: string, sql: string): Promise<any[]> {
  const client = await createDbClient(database);
  try {
    const res = await client.query(sql);
    return res.rows;
  } finally {
    await client.end().catch(() => {});
  }
}

// CLI Execution Entrypoint
const isDirectRun =
  (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) ||
  (typeof process !== 'undefined' && process.argv[1]?.replace(/\\/g, '/').includes('db-connector-dev'));

if (isDirectRun) {
  const args = process.argv.slice(2);
  const action = args[0] || 'status';

  (async () => {
    if (action === 'status') {
      console.log('\n================================================================================');
      console.log('            LOGIKCHAIN DEV DB BACKEND CONNECTOR (Node.js/TypeScript)');
      console.log('            PostgreSQL Mesh Telemetry Audit (13 Databases)');
      console.log('================================================================================\n');

      const results = await auditDbMesh();
      console.table(
        results.map((r) => ({
          Epic: r.epic,
          Service: r.service,
          Database: r.database,
          Port: r.port,
          Status: r.status,
          Latency: `${r.latencyMs}ms`,
          Tables: r.tables,
          OutboxTable: r.hasOutbox ? 'YES' : 'NO',
        }))
      );

      const onlineCount = results.filter((r) => r.status === 'ONLINE').length;
      console.log(`\nDatabase Mesh Health: ${onlineCount} / 13 Databases Online\n`);
    } else if (action === 'query') {
      const db = args[1] || 'config_db';
      const sql = args[2];
      if (!sql) {
        console.error('Error: Please provide SQL query: ts-node db-connector-dev.ts query <db> "<sql>"');
        process.exit(1);
      }
      console.log(`\nExecuting on ${db}: ${sql}`);
      const rows = await executeAdHocQuery(db, sql);
      console.table(rows);
    } else {
      console.log('Usage: ts-node db-connector-dev.ts [status|query <db> "<sql>"]');
    }
  })().catch((err) => {
    console.error('Execution failed:', err);
    process.exit(1);
  });
}
