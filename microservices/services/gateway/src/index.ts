import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import {
  logger,
  appCheckMiddleware,
  authMiddleware,
  extractClientContext,
} from '@logikchain/common';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Firebase-AppCheck',
      'X-Client-Platform',
      'X-Client-Version',
      'X-Correlation-Id',
      'X-Supplier-Context',
    ],
  })
);

// General rate limiter: 300 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please slow down.' } },
});
app.use(limiter);

// Decorate request with client platform metadata
app.use((req, res, next) => {
  const context = extractClientContext(req);
  (req as any).clientContext = context;
  res.setHeader('X-Correlation-Id', context.correlationId);
  res.setHeader('X-Served-By', 'logikchain-api-gateway');
  next();
});

// FEAT-10.04 Support-as-Supplier Proxy Middleware
function supplierProxyMiddleware(req: any, res: any, next: any) {
  const userRole = req.user?.role || req.headers['x-user-role'];
  const supplierContext = req.headers['x-supplier-context'];
  const path = req.originalUrl || req.url;

  if (userRole === 'support') {
    // Financial Exclusion Guardrail: strictly block payouts and banking mutations
    if (
      (path.includes('/payouts') || path.includes('/banking')) &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    ) {
      return res.status(403).json({
        error: {
          code: 'FINANCIAL_MUTATION_PROXY_BLOCKED',
          message: 'Support proxy is strictly prohibited from executing financial or payout mutations.',
        },
      });
    }

    // Require X-Supplier-Context for supplier-scoped actions (e.g., gigs, custom routes)
    const supplierScopedPaths = ['/api/v1/gigs', '/v1/gigs'];
    const isSupplierAction = supplierScopedPaths.some((p) => path.startsWith(p)) && ['POST', 'PUT', 'PATCH'].includes(req.method);
    if (isSupplierAction && !supplierContext) {
      return res.status(422).json({
        error: {
          code: 'SUPPLIER_CONTEXT_REQUIRED',
          message: 'Support operator must specify an authorized X-Supplier-Context header.',
        },
      });
    }
  }
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    supportedPlatforms: ['web', 'android', 'ios'],
  });
});

// Comprehensive microservices cluster health probe for public status dashboard
app.get('/health/services', async (req, res) => {
  const serviceConfigs = [
    { id: 'identity', epic: 'EPIC-01', name: 'Identity, Auth & Access', port: 4001, url: SERVICE_TARGETS.identity },
    { id: 'orders', epic: 'EPIC-02', name: 'Orders & Commerce Fulfillment', port: 4002, url: SERVICE_TARGETS.orders },
    { id: 'gigs', epic: 'EPIC-03', name: 'Gig Logistics & Fleet Dispatch', port: 4003, url: SERVICE_TARGETS.gigs },
    { id: 'pamphlet', epic: 'EPIC-04', name: 'Pamphlet & Inventory Syndication', port: 4004, url: SERVICE_TARGETS.pamphlet },
    { id: 'payments', epic: 'EPIC-05', name: 'Payments & UPI Collections', port: 4005, url: SERVICE_TARGETS.payments },
    { id: 'payouts', epic: 'EPIC-06', name: 'Payouts & Disbursements', port: 4006, url: SERVICE_TARGETS.payouts },
    { id: 'cash', epic: 'EPIC-07', name: 'Rural Cash & CoD Custody', port: 4007, url: SERVICE_TARGETS.cash },
    { id: 'credit', epic: 'EPIC-08', name: 'Merchant Working Capital Credit', port: 4008, url: SERVICE_TARGETS.credit },
    { id: 'finance', epic: 'EPIC-09', name: 'Financial Ledger & Reconciliation', port: 4009, url: SERVICE_TARGETS.finance },
    { id: 'config', epic: 'EPIC-10', name: 'Platform Geo-Hierarchy & Config', port: 4010, url: SERVICE_TARGETS.config },
    { id: 'governance', epic: 'EPIC-11', name: 'Platform Governance & AML', port: 4011, url: SERVICE_TARGETS.governance },
    { id: 'gateway', epic: 'EPIC-12', name: 'API Gateway & Sync Engine', port: 8080, url: 'http://localhost:8080' },
    { id: 'socialConnect', epic: 'EPIC-13', name: 'Social Connect & Notifications', port: 4012, url: SERVICE_TARGETS.socialConnect },
  ];

  const results = await Promise.all(
    serviceConfigs.map(async (svc) => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const endpoint = svc.id === 'gateway' ? 'http://localhost:8080/health' : `${svc.url}/health`;
        const resp = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        let data: any = {};
        try {
          data = await resp.json();
        } catch {
          // non-json response
        }

        const isOk = resp.ok && (data.status === 'ok' || data.status === 'healthy');
        const isDegraded = data.status === 'degraded' || (resp.status >= 500 && data.status);

        return {
          id: svc.id,
          epic: svc.epic,
          name: svc.name,
          port: svc.port,
          status: isOk ? 'healthy' : isDegraded ? 'degraded' : resp.ok ? 'healthy' : 'unreachable',
          httpStatus: resp.status,
          latencyMs,
          lastChecked: new Date().toISOString(),
          details: data.error || data.sync ? { sync: data.sync, error: data.error } : undefined,
        };
      } catch (err: any) {
        return {
          id: svc.id,
          epic: svc.epic,
          name: svc.name,
          port: svc.port,
          status: 'offline',
          httpStatus: null,
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          error: err.name === 'AbortError' ? 'Connection timeout (>1200ms)' : 'Service offline or port closed',
        };
      }
    })
  );

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    gateway: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      platform: 'Logikchain Microservices Mesh',
    },
    services: results,
  });
});

// Microservice Route Map
const SERVICE_TARGETS = {
  identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:4001',
  orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:4002',
  gigs: process.env.GIGS_SERVICE_URL || 'http://localhost:4003',
  pamphlet: process.env.PAMPHLET_SERVICE_URL || 'http://localhost:4004',
  payments: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:4005',
  payouts: process.env.PAYOUTS_SERVICE_URL || 'http://localhost:4006',
  cash: process.env.CASH_SERVICE_URL || 'http://localhost:4007',
  credit: process.env.CREDIT_SERVICE_URL || 'http://localhost:4008',
  finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:4009',
  config: process.env.CONFIG_SERVICE_URL || 'http://localhost:4010',
  governance: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:4011',
  socialConnect: process.env.SOCIAL_CONNECT_SERVICE_URL || 'http://localhost:4012',
};

// Helper to construct microservice proxy
function proxyFor(targetUrl: string, pathPrefix: string) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: '' },
    on: {
      proxyReq: (proxyReq, req: any) => {
        if (req.clientContext) {
          proxyReq.setHeader('x-client-platform', req.clientContext.platform);
          proxyReq.setHeader('x-correlation-id', req.clientContext.correlationId);
          if (req.clientContext.idempotencyKey) {
            proxyReq.setHeader('idempotency-key', req.clientContext.idempotencyKey);
          }
          if (req.user) {
            proxyReq.setHeader('x-user-uid', req.user.uid);
            proxyReq.setHeader('x-user-role', req.user.role);
          }
        }
        if (req.headers['x-supplier-context']) {
          proxyReq.setHeader('x-supplier-context', req.headers['x-supplier-context']);
        }
      },
      error: (err, req, res: any) => {
        logger.error({ err: err.message, targetUrl }, 'Proxy forwarding error');
        if (!res.headersSent) {
          res.status(502).json({
            error: { code: 'BAD_GATEWAY', message: 'Downstream microservice unavailable.' },
          });
        }
      },
    },
  });
}

// Public or Webhook routes (no Auth required)
app.use('/api/v1/payments/webhook', proxyFor(SERVICE_TARGETS.payments, '/api/v1/payments'));
app.use('/api/v1/social/webhook', proxyFor(SERVICE_TARGETS.socialConnect, '/api/v1/social'));
app.use('/api/v1/config/catalog', proxyFor(SERVICE_TARGETS.config, '/api/v1/config'));
app.use('/v1/config/catalog', proxyFor(SERVICE_TARGETS.config, '/v1/config'));

// Protected Routes: Require App Check (Web/Android/iOS) + Firebase Auth + Support Proxy Check
const protectedMiddlewares = [appCheckMiddleware, authMiddleware(), supplierProxyMiddleware];

app.use('/api/v1/identity', protectedMiddlewares, proxyFor(SERVICE_TARGETS.identity, '/api/v1/identity'));
app.use('/api/v1/orders', protectedMiddlewares, proxyFor(SERVICE_TARGETS.orders, '/api/v1/orders'));
app.use('/api/v1/gigs', protectedMiddlewares, proxyFor(SERVICE_TARGETS.gigs, '/api/v1/gigs'));
app.use('/api/v1/pamphlet', protectedMiddlewares, proxyFor(SERVICE_TARGETS.pamphlet, '/api/v1/pamphlet'));
app.use('/api/v1/payments', protectedMiddlewares, proxyFor(SERVICE_TARGETS.payments, '/api/v1/payments'));
app.use('/api/v1/payouts', protectedMiddlewares, proxyFor(SERVICE_TARGETS.payouts, '/api/v1/payouts'));
app.use('/api/v1/cash', protectedMiddlewares, proxyFor(SERVICE_TARGETS.cash, '/api/v1/cash'));
app.use('/api/v1/credit', protectedMiddlewares, proxyFor(SERVICE_TARGETS.credit, '/api/v1/credit'));
app.use('/api/v1/finance', protectedMiddlewares, proxyFor(SERVICE_TARGETS.finance, '/api/v1/finance'));
app.use('/api/v1/config', protectedMiddlewares, proxyFor(SERVICE_TARGETS.config, '/api/v1/config'));
app.use('/api/v1/governance', protectedMiddlewares, proxyFor(SERVICE_TARGETS.governance, '/api/v1/governance'));
app.use('/api/v1/social', protectedMiddlewares, proxyFor(SERVICE_TARGETS.socialConnect, '/api/v1/social'));
app.use('/api/v1/interaction', protectedMiddlewares, proxyFor(SERVICE_TARGETS.socialConnect, '/api/v1/interaction'));
app.use('/api/v1/notifications', protectedMiddlewares, proxyFor(SERVICE_TARGETS.socialConnect, '/api/v1/notifications'));
app.use('/api/v1/preferences', protectedMiddlewares, proxyFor(SERVICE_TARGETS.socialConnect, '/api/v1/preferences'));

// Fallback 404
app.use('*', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found on API Gateway: ${req.originalUrl}` } });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Logikchain API Gateway running on port ${PORT} serving Web PWA, Android, and iOS`);
});
