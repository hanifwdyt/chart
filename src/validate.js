// Validasi & normalisasi request biar aman dan ga bikin renderer crash.

export const SUPPORTED_TYPES = [
  'line', 'bar', 'radar', 'doughnut', 'pie', 'polarArea',
  'bubble', 'scatter', 'area', 'horizontalBar', 'stackedBar', 'mixed',
];

export const SUPPORTED_FORMATS = ['png', 'jpeg', 'jpg', 'webp'];

const LIMITS = {
  width: { min: 50, max: 3000, def: 800 },
  height: { min: 50, max: 3000, def: 600 },
  devicePixelRatio: { min: 1, max: 4, def: 2 },
};

// Batas anti-DoS: cegah render super berat yang nge-block event loop / OOM.
const MAX_PIXELS = 4_000_000;     // ~2000x2000 px efektif (setelah dpr)
const MAX_DATASETS = 50;
const MAX_POINTS = 5000;          // per dataset
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Tolak key berbahaya secara rekursif (anti prototype-pollution sebelum
// object user dilempar ke deep-merge Chart.js).
function rejectProtoKeys(obj, depth = 0) {
  if (depth > 12 || obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) rejectProtoKeys(item, depth + 1);
    return;
  }
  for (const k of Object.keys(obj)) {
    if (PROTO_KEYS.has(k)) throw new ValidationError(`Key "${k}" tidak diizinkan.`);
    rejectProtoKeys(obj[k], depth + 1);
  }
}

// Validasi ukuran struktur data biar ga bisa di-flood titik tak terbatas.
function validateDataSize(data) {
  const datasets = data.datasets;
  if (!Array.isArray(datasets)) {
    throw new ValidationError('Field "data.datasets" harus berupa array.');
  }
  if (datasets.length > MAX_DATASETS) {
    throw new ValidationError(`Maksimal ${MAX_DATASETS} datasets.`);
  }
  for (const ds of datasets) {
    if (ds && Array.isArray(ds.data) && ds.data.length > MAX_POINTS) {
      throw new ValidationError(`Maksimal ${MAX_POINTS} data points per dataset.`);
    }
  }
}

function clampNum(val, { min, max, def }) {
  const n = Number(val);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

/**
 * Normalisasi request -> opsi renderChart.
 * Menerima alias type seperti 'area', 'horizontalBar', 'stackedBar' dan
 * menerjemahkannya jadi config Chart.js yang valid.
 */
export function normalizeRequest(body = {}) {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Body harus berupa JSON object.');
  }
  rejectProtoKeys(body);

  let { chart, type, data, options } = body;

  // Mode 1: { chart: { type, data, options } } (config Chart.js penuh)
  // Mode 2: { type, data, options } (flat) — lebih simple
  let config = chart;
  if (!config) {
    if (!type && !data) {
      throw new ValidationError('Wajib ada field "chart" atau "type"+"data".');
    }
    config = { type, data, options };
  }

  if (typeof config !== 'object') {
    throw new ValidationError('Field "chart" harus berupa object.');
  }
  if (!config.type) throw new ValidationError('Field "type" wajib diisi.');
  if (!config.data || typeof config.data !== 'object') {
    throw new ValidationError('Field "data" wajib berupa object { labels, datasets }.');
  }
  validateDataSize(config.data);

  config = applyTypeAlias(config);

  const format = (body.format || 'png').toLowerCase();
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new ValidationError(`Format "${format}" ga didukung. Pilih: ${SUPPORTED_FORMATS.join(', ')}.`);
  }

  const width = clampNum(body.width, LIMITS.width);
  const height = clampNum(body.height, LIMITS.height);
  const devicePixelRatio = clampNum(body.devicePixelRatio ?? body.dpr, LIMITS.devicePixelRatio);

  // Cap total pixel area (setelah dpr) — cegah canvas raksasa yang nge-freeze server.
  if (width * devicePixelRatio * height * devicePixelRatio > MAX_PIXELS) {
    throw new ValidationError(
      `Canvas terlalu besar. Maksimal ${MAX_PIXELS.toLocaleString('en')} pixel efektif (width × height × dpr²).`
    );
  }

  return {
    config,
    width,
    height,
    devicePixelRatio,
    backgroundColor: typeof body.backgroundColor === 'string' ? body.backgroundColor : '#ffffff',
    format,
    watermark: body.watermark === false ? false : true,
  };
}

// Terjemahkan alias type -> Chart.js native + options.
function applyTypeAlias(config) {
  const c = { ...config, options: { ...(config.options || {}) } };

  switch (config.type) {
    case 'area':
      c.type = 'line';
      c.data = {
        ...c.data,
        datasets: (c.data.datasets || []).map((d) => ({ fill: true, ...d })),
      };
      break;
    case 'horizontalBar':
      c.type = 'bar';
      c.options.indexAxis = c.options.indexAxis || 'y';
      break;
    case 'stackedBar':
      c.type = 'bar';
      c.options.scales = {
        ...(c.options.scales || {}),
        x: { stacked: true, ...(c.options.scales?.x || {}) },
        y: { stacked: true, ...(c.options.scales?.y || {}) },
      };
      break;
    case 'mixed':
      // datasets sudah punya field "type" masing-masing; base type = bar
      c.type = 'bar';
      break;
    default:
      break;
  }
  return c;
}

/**
 * Parse query string GET jadi body. Support ?c=<json> atau ?config=<base64 json>.
 */
export function parseGetConfig(query) {
  let raw = query.c || query.config || query.chart;
  if (!raw) throw new ValidationError('Param "c" (JSON config) wajib ada untuk GET.');

  let parsed;
  try {
    // coba JSON langsung
    parsed = JSON.parse(raw);
  } catch {
    try {
      // coba base64
      parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new ValidationError('Param "c" bukan JSON valid (atau base64 JSON).');
    }
  }

  const body = parsed.type || parsed.data ? { chart: parsed } : parsed;
  if (query.width) body.width = query.width;
  if (query.height) body.height = query.height;
  if (query.format) body.format = query.format;
  if (query.backgroundColor) body.backgroundColor = query.backgroundColor;
  if (query.devicePixelRatio) body.devicePixelRatio = query.devicePixelRatio;
  if (query.watermark === 'false') body.watermark = false;
  return body;
}
