import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { renderChart, MIME } from './src/renderer.js';
import { normalizeRequest, parseGetConfig, ValidationError, SUPPORTED_TYPES, SUPPORTED_FORMATS } from './src/validate.js';
import { PRESETS, PRESET_ORDER } from './src/presets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS terbuka — ini API publik buat generate image.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Core render handler ---
async function handleRender(reqBody, res) {
  const opts = normalizeRequest(reqBody);
  const buffer = await renderChart(opts);
  res.setHeader('Content-Type', MIME[opts.format] || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Powered-By-Chart', 'chart.hanif.app');
  res.send(buffer);
}

// POST /api/v1/chart — body JSON, balik image
app.post('/api/v1/chart', async (req, res, next) => {
  try {
    await handleRender(req.body, res);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/chart?c=<json|base64> — gampang di-embed di <img src>
app.get('/api/v1/chart', async (req, res, next) => {
  try {
    const body = parseGetConfig(req.query);
    await handleRender(body, res);
  } catch (err) {
    next(err);
  }
});

// Metadata: jenis chart yang didukung
app.get('/api/v1/types', (req, res) => {
  res.json({
    types: SUPPORTED_TYPES,
    formats: SUPPORTED_FORMATS,
    presets: PRESET_ORDER.map((k) => ({ key: k, label: PRESETS[k].label, desc: PRESETS[k].desc })),
  });
});

// Preset config (buat playground "load example")
app.get('/api/v1/presets/:key', (req, res, next) => {
  const p = PRESETS[req.params.key];
  if (!p) return next(new ValidationError(`Preset "${req.params.key}" ga ada.`));
  res.json(p.config);
});

app.get('/api/v1/presets', (req, res) => {
  res.json(PRESET_ORDER.reduce((acc, k) => ({ ...acc, [k]: PRESETS[k] }), {}));
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'chart.hanif.app' }));

// Static frontend
app.use(express.static(join(__dirname, 'public')));

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.name || 'Error',
    message: err.message || 'Terjadi kesalahan saat render chart.',
  });
});

app.listen(PORT, () => {
  console.log(`chart.hanif.app listening on :${PORT}`);
});
