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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    supportedPlatforms: ['web', 'android', 'ios'],
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

// Protected Routes: Require App Check (Web/Android/iOS) + Firebase Auth
const protectedMiddlewares = [appCheckMiddleware, authMiddleware()];

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
