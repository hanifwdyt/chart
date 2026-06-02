import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { renderChart, MIME } from './src/renderer.js';
import { normalizeRequest, parseGetConfig, ValidationError, SUPPORTED_TYPES, SUPPORTED_FORMATS } from './src/validate.js';
import { PRESETS, PRESET_ORDER } from './src/presets.js';
import { LRUCache, cacheKey, createLimiter } from './src/cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Cache buffer image + limiter render (CPU-bound) biar event loop ga ke-flood.
const imageCache = new LRUCache(Number(process.env.CACHE_SIZE) || 500);
const renderLimit = createLimiter(Number(process.env.RENDER_CONCURRENCY) || 6);

app.disable('x-powered-by');
app.set('trust proxy', 1); // di belakang reverse proxy Coolify -> rate limit per real IP

// Security headers. crossOriginResourcePolicy 'cross-origin' wajib biar image
// bisa di-embed di domain lain (<img src>). CSP di-set khusus buat HTML.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // di-handle manual buat halaman static
  })
);

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// CORS terbuka khusus endpoint API (image publik, read-only, no-credential).
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate limit render endpoint (anonymous tier). SaaS nanti: per-API-key tier.
// Limit cukup longgar: 1 halaman bisa nge-embed belasan chart, jadi 300/menit
// per IP aman buat browsing normal tapi tetep ngeblok flooding.
const renderLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_PER_MIN) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RateLimited', message: 'Terlalu banyak request. Coba lagi sebentar.' },
});

// --- Core render handler (cache + concurrency limit) ---
async function handleRender(reqBody, res) {
  const opts = normalizeRequest(reqBody);
  const key = cacheKey(opts);

  let buffer = imageCache.get(key);
  let cacheStatus = 'HIT';
  if (!buffer) {
    cacheStatus = 'MISS';
    buffer = await renderLimit(() => renderChart(opts));
    imageCache.set(key, buffer);
  }

  res.setHeader('Content-Type', MIME[opts.format] || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.setHeader('X-Cache', cacheStatus);
  res.setHeader('X-Powered-By-Chart', 'chart.hanif.app');
  res.send(buffer);
}

// POST /api/v1/chart — body JSON, balik image
app.post('/api/v1/chart', renderLimiter, async (req, res, next) => {
  try {
    await handleRender(req.body, res);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/chart?c=<json|base64> — gampang di-embed di <img src>
app.get('/api/v1/chart', renderLimiter, async (req, res, next) => {
  try {
    const body = parseGetConfig(req.query);
    await handleRender(body, res);
  } catch (err) {
    next(err);
  }
});

// Metadata
app.get('/api/v1/types', (req, res) => {
  res.json({
    types: SUPPORTED_TYPES,
    formats: SUPPORTED_FORMATS,
    presets: PRESET_ORDER.map((k) => ({ key: k, label: PRESETS[k].label, desc: PRESETS[k].desc })),
  });
});

app.get('/api/v1/presets/:key', (req, res, next) => {
  const p = PRESETS[req.params.key];
  if (!p) return next(new ValidationError(`Preset "${req.params.key}" ga ada.`));
  res.json(p.config);
});

app.get('/api/v1/presets', (req, res) => {
  res.json(PRESET_ORDER.reduce((acc, k) => ({ ...acc, [k]: PRESETS[k] }), {}));
});

// Liveness vs readiness
app.get('/health', (req, res) => res.json({ ok: true, service: 'chart.hanif.app' }));
app.get('/livez', (req, res) => res.json({ ok: true }));
app.get('/readyz', (req, res) => res.json({ ok: true, cache: imageCache.size, render: renderLimit.stats() }));

// Clean-URL routing buat halaman multi-page (tanpa .html)
const PAGES = ['playground', 'gallery', 'docs', 'pricing'];
for (const page of PAGES) {
  app.get(`/${page}`, (req, res) => res.sendFile(join(__dirname, 'public', `${page}.html`)));
}

// SEO files + static
app.get('/robots.txt', (req, res) => res.sendFile(join(__dirname, 'public', 'robots.txt')));
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(join(__dirname, 'public', 'sitemap.xml'));
});
app.use(express.static(join(__dirname, 'public'), { extensions: ['html'] }));

// Error handler — jangan bocorin detail internal di 5xx.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[render-error]', err.message);
  const isClient = status < 500;
  res.status(status).json({
    error: isClient ? err.name || 'Error' : 'InternalError',
    message: isClient ? err.message : 'Terjadi kesalahan saat memproses chart.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`chart.hanif.app listening on :${PORT}`);
  prewarm();
});

// Pre-warm: render preset di ukuran yang dipakai website + warm-up JIT Chart.js,
// jadi visit pertama langsung cache HIT (~1ms) bukan cold render (~250ms).
async function prewarm() {
  const sizes = [[520, 325], [480, 300], [760, 500]];
  let warmed = 0;
  for (const key of PRESET_ORDER) {
    for (const [w, h] of sizes) {
      try {
        const opts = normalizeRequest({ ...PRESETS[key].config, width: w, height: h, format: 'png', backgroundColor: '#ffffff' });
        const k = cacheKey(opts);
        if (!imageCache.get(k)) {
          imageCache.set(k, await renderLimit(() => renderChart(opts)));
          warmed++;
        }
      } catch { /* skip */ }
    }
  }
  console.log(`prewarm: ${warmed} charts cached`);
}

// Graceful shutdown + safety net
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
function shutdown() {
  console.log('shutting down…');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
