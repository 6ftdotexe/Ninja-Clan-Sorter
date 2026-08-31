import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OPENAI_IMAGE_MODEL, admin, requireUser, serverStatus, stripe, stripeWebhookSecret, validateConfiguration } from './config.js';
import { diagnosticsSnapshot, logEvent, observe, recordError, requestDiagnostics, requireDiagnosticsToken } from './diagnostics.js';
import { handleCredits, handleGenerateShinobi } from './generation.js';
import { handleCreateCheckout, handleCreditPacks, handleStripeWebhook } from './payments.js';
import { handleAccountIntegrity } from './integrity.js';
import { runPreflight } from './preflight.js';
import { APP_VERSION, BUILD_COMMIT, BUILD_ID, BUILD_TIMESTAMP, EXPECTED_SCHEMA_VERSION, getReleaseInfo } from './release.js';
import {
  checkoutLimit,
  creditReadLimit,
  generationLimit,
  integrityLimit,
  publicReadLimit,
  rateLimit,
  requireTrustedOrigin,
  securityHeaders,
} from './security.js';

type Lifecycle = 'starting' | 'ready' | 'draining';
let lifecycle: Lifecycle = 'starting';
let server: Server | null = null;

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestDiagnostics);
app.use(securityHeaders);
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// Stripe signature verification requires the untouched request bytes.
app.post('/api/stripe/webhook', rateLimit({ windowMs: 60_000, max: 120 }), express.raw({ type: 'application/json', limit: '256kb' }), handleStripeWebhook);

app.get('/api/health', publicReadLimit, (_req, res) => res.json({ ok: lifecycle !== 'draining', service: serverStatus.service, lifecycle }));
app.get('/api/health/live', publicReadLimit, (_req, res) => res.json({ ok: true, lifecycle }));
app.get('/api/health/ready', publicReadLimit, async (_req, res) => {
  if (lifecycle !== 'ready') return res.status(503).json({ ok: false, lifecycle });
  let database = false;
  if (admin) {
    try {
      const result = await observe('readiness.supabase', () => admin.rpc('get_app_schema_version'), 750);
      database = !result.error && result.data === EXPECTED_SCHEMA_VERSION;
    } catch { database = false; }
  }
  const ready = Boolean(admin) && database;
  return res.status(ready ? 200 : 503).json({ ok: ready, lifecycle, checks: { database, accounts: Boolean(admin), schema: EXPECTED_SCHEMA_VERSION } });
});
app.get('/api/version', publicReadLimit, async (_req, res) => {
  const release = await getReleaseInfo(admin);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(release.releaseMatches ? 200 : 503).json({ ...release, lifecycle });
});
app.get('/api/internal/diagnostics', publicReadLimit, requireDiagnosticsToken, async (_req, res) => res.json({ ...diagnosticsSnapshot(), release: await getReleaseInfo(admin), lifecycle }));

app.get('/api/credit-packs', publicReadLimit, handleCreditPacks);
app.get('/api/credits', requireUser, creditReadLimit, handleCredits);
app.get('/api/account-integrity', requireUser, integrityLimit, handleAccountIntegrity);
app.post('/api/account-integrity', express.json({ limit: '8kb' }), requireUser, requireTrustedOrigin, integrityLimit, handleAccountIntegrity);

// Keep ordinary JSON endpoints small. The image-generation route gets its own larger parser.
app.post('/api/generate-shinobi', express.json({ limit: '14mb' }), requireUser, requireTrustedOrigin, generationLimit, handleGenerateShinobi);
app.use(express.json({ limit: '64kb' }));
app.post('/api/create-checkout', requireUser, requireTrustedOrigin, checkoutLimit, handleCreateCheckout);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders(res,filePath){ if(filePath.includes(`${path.sep}assets${path.sep}`))res.setHeader('Cache-Control','public, max-age=604800, immutable'); else if(filePath.endsWith('.html'))res.setHeader('Cache-Control','no-cache'); } }));
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((error: unknown, req: Request & { requestId?: string }, res: Response, _next: NextFunction) => {
  recordError(error, 'unhandled_server_error', { requestId: req.requestId, method: req.method, path: req.path });
  if (res.headersSent) return;
  const maybe = error as { type?: string; status?: number };
  if (maybe?.type === 'entity.too.large') return res.status(413).json({ error: 'Request payload is too large.', requestId: req.requestId });
  if (maybe?.status === 400) return res.status(400).json({ error: 'Request body is invalid.', requestId: req.requestId });
  res.status(500).json({ error: 'Unexpected server error.', requestId: req.requestId });
});

function shutdown(signal: 'SIGTERM' | 'SIGINT') {
  if (lifecycle === 'draining') return;
  lifecycle = 'draining';
  logEvent('info', 'server_shutdown_started', { signal, version: APP_VERSION, buildId: BUILD_ID });

  const forceTimer = setTimeout(() => {
    logEvent('error', 'server_shutdown_forced', { signal, timeoutMs: 25_000 });
    server?.closeAllConnections?.();
    process.exit(1);
  }, 25_000);
  forceTimer.unref();

  if (!server) {
    clearTimeout(forceTimer);
    process.exit(0);
  }

  server.close((error) => {
    clearTimeout(forceTimer);
    if (error) {
      recordError(error, 'server_shutdown_failed', { signal });
      process.exit(1);
    }
    logEvent('info', 'server_shutdown_complete', { signal });
    process.exit(0);
  });
  server.closeIdleConnections?.();
}

function registerSignalHandlers() {
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('uncaughtException', (error) => {
    recordError(error, 'process_uncaught_exception');
    shutdown('SIGTERM');
  });
  process.once('unhandledRejection', (reason) => {
    recordError(reason, 'process_unhandled_rejection');
    shutdown('SIGTERM');
  });
}

export async function bootstrap() {
  const production = process.env.NODE_ENV === 'production';
  const config = validateConfiguration({ strict: production });
  for (const warning of config.warnings) logEvent('warn', 'startup_configuration_warning', { warning });
  if (config.errors.length) {
    for (const error of config.errors) logEvent('error', 'startup_configuration_error', { error });
    process.exit(1);
  }

  const useLivePreflight = process.env.STARTUP_LIVE_PREFLIGHT?.trim().toLowerCase() !== 'false' && production;
  const preflight = await runPreflight({ live: useLivePreflight, strict: production });
  for (const warning of preflight.warnings) logEvent('warn', 'startup_preflight_warning', { warning });
  if (!preflight.ok) {
    for (const error of preflight.errors) logEvent('error', 'startup_preflight_failed', { error });
    process.exit(1);
  }

  const port = Number(process.env.PORT || 8787);
  server = app.listen(port, () => {
    lifecycle = 'ready';
    logEvent('info', 'server_started', {
      service: serverStatus.service,
      port,
      environment: process.env.NODE_ENV || 'development',
      version: APP_VERSION,
      schemaVersion: preflight.schemaActual || 'unchecked',
      commit: BUILD_COMMIT,
      buildId: BUILD_ID,
      builtAt: BUILD_TIMESTAMP,
      imageModel: OPENAI_IMAGE_MODEL,
      paymentsConfigured: serverStatus.paymentsConfigured,
      accountsConfigured: serverStatus.accountsConfigured,
      diagnosticsEnabled: Boolean(process.env.DIAGNOSTICS_TOKEN?.trim()),
      startupLivePreflight: useLivePreflight,
    });
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 180_000;
  server.keepAliveTimeout = 5_000;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  registerSignalHandlers();
  void bootstrap().catch((error) => {
    recordError(error, 'server_bootstrap_failed');
    process.exit(1);
  });
}
