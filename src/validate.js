// Validasi, shortcut-expansion & normalisasi request.

export const SUPPORTED_TYPES = [
  'line', 'bar', 'radar', 'doughnut', 'pie', 'polarArea', 'bubble', 'scatter',
  'area', 'stackedArea', 'horizontalBar', 'stackedBar', 'sparkline',
  'steppedLine', 'gauge', 'progressRing', 'multiAxis', 'mixed',
  'flowchart', 'graph',
];

const DIAGRAM_TYPES = new Set(['flowchart', 'graph']);

export const SUPPORTED_FORMATS = ['png', 'jpeg', 'jpg', 'webp'];
export const PALETTE_NAMES = ['default', 'cobalt', 'sunset', 'ocean', 'forest', 'candy', 'mono', 'warm'];

const LIMITS = {
  width: { min: 50, max: 3000, def: 800 },
  height: { min: 50, max: 3000, def: 600 },
  devicePixelRatio: { min: 1, max: 4, def: 2 },
};
const MAX_PIXELS = 4_000_000;
const MAX_DATASETS = 50;
const MAX_POINTS = 5000;
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'center']);

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; this.status = 400; }
}

function clampNum(val, { min, max, def }) {
  const n = Number(val);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function rejectProtoKeys(obj, depth = 0) {
  if (depth > 12 || obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { for (const item of obj) rejectProtoKeys(item, depth + 1); return; }
  for (const k of Object.keys(obj)) {
    if (PROTO_KEYS.has(k)) throw new ValidationError(`Key "${k}" tidak diizinkan.`);
    rejectProtoKeys(obj[k], depth + 1);
  }
}

function validateDataSize(data) {
  const datasets = data.datasets;
  if (!Array.isArray(datasets)) throw new ValidationError('Field "data.datasets" harus berupa array.');
  if (datasets.length > MAX_DATASETS) throw new ValidationError(`Maksimal ${MAX_DATASETS} datasets.`);
  for (const ds of datasets) {
    if (ds && Array.isArray(ds.data) && ds.data.length > MAX_POINTS) {
      throw new ValidationError(`Maksimal ${MAX_POINTS} data points per dataset.`);
    }
  }
}

// ---------- Shortcut expansion: payload minimal -> config Chart.js penuh ----------
function expandShortcuts(body) {
  // base config dari chart/flat
  const config = body.chart ? { ...body.chart } : { type: body.type, data: body.data, options: body.options };
  config.options = config.options ? { ...config.options } : {};
  const o = config.options;
  o.plugins = o.plugins ? { ...o.plugins } : {};
  o.scales = o.scales ? { ...o.scales } : undefined;

  // --- data dari shortcut (values / series) ---
  if (!config.data || !Array.isArray(config.data.datasets)) {
    const labels = body.labels ?? config.data?.labels;
    let datasets;
    if (Array.isArray(body.series)) {
      datasets = body.series.map((s) => {
        if (Array.isArray(s)) return { data: s };
        const { name, label, data, ...rest } = s || {};
        return { label: label ?? name, data, ...rest };
      });
    } else if (Array.isArray(body.values)) {
      datasets = [{ data: body.values, label: body.label }];
    }
    if (datasets) config.data = { labels, datasets };
  }

  // --- title / subtitle ---
  if (body.title && !o.plugins.title) o.plugins.title = { display: true, text: body.title };
  const sub = body.subtitle || body.description;
  if (sub && !o.plugins.subtitle) o.plugins.subtitle = { display: true, text: sub };

  // --- axis labels ---
  const ensureScale = (axis) => { o.scales = o.scales || {}; o.scales[axis] = o.scales[axis] || {}; return o.scales[axis]; };
  if (body.xLabel) { const s = ensureScale('x'); if (!s.title) s.title = { display: true, text: body.xLabel }; }
  if (body.yLabel) { const s = ensureScale('y'); if (!s.title) s.title = { display: true, text: body.yLabel }; }

  // --- legend shortcut ---
  if (body.legend === false) o.plugins.legend = { ...(o.plugins.legend || {}), display: false };
  else if (typeof body.legend === 'string') o.plugins.legend = { ...(o.plugins.legend || {}), position: body.legend };

  // --- grid shortcut ---
  if (body.grid === false) {
    ensureScale('x').grid = { display: false };
    ensureScale('y').grid = { display: false };
  }

  // --- stacked shortcut ---
  if (body.stacked === true) {
    ensureScale('x').stacked = true;
    ensureScale('y').stacked = true;
  }

  if (o.scales) config.options.scales = o.scales;
  return config;
}

// ---------- Type alias -> Chart.js native + options ----------
function applyTypeAlias(config) {
  const c = { ...config, options: { ...(config.options || {}) } };
  const setScale = (axis, patch) => {
    c.options.scales = { ...(c.options.scales || {}) };
    c.options.scales[axis] = { ...(c.options.scales[axis] || {}), ...patch };
  };
  switch (config.type) {
    case 'area':
      c.type = 'line';
      c.data = { ...c.data, datasets: (c.data.datasets || []).map((d) => ({ fill: true, ...d })) };
      break;
    case 'stackedArea':
      c.type = 'line';
      c.data = { ...c.data, datasets: (c.data.datasets || []).map((d) => ({ fill: true, ...d })) };
      setScale('y', { stacked: true });
      break;
    case 'horizontalBar':
      c.type = 'bar';
      c.options.indexAxis = c.options.indexAxis || 'y';
      break;
    case 'stackedBar':
      c.type = 'bar';
      setScale('x', { stacked: true }); setScale('y', { stacked: true });
      break;
    case 'sparkline':
      c.type = 'line';
      c.data = { ...c.data, datasets: (c.data.datasets || []).map((d) => ({ fill: true, pointRadius: 0, borderWidth: 2, tension: 0.4, ...d })) };
      c.options.plugins = { ...(c.options.plugins || {}), legend: { display: false }, title: c.options.plugins?.title };
      setScale('x', { display: false }); setScale('y', { display: false });
      break;
    case 'steppedLine':
      c.type = 'line';
      c.data = { ...c.data, datasets: (c.data.datasets || []).map((d) => ({ stepped: true, ...d })) };
      break;
    case 'gauge':
      c.type = 'doughnut';
      c.options = { circumference: 180, rotation: 270, cutout: '72%', ...c.options };
      break;
    case 'progressRing':
      c.type = 'doughnut';
      c.options = { cutout: '78%', ...c.options };
      break;
    case 'multiAxis':
      c.type = 'line';
      c.options.scales = { y: { type: 'linear', position: 'left' }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }, ...(c.options.scales || {}) };
      break;
    case 'mixed':
      c.type = 'bar';
      break;
    default:
      break;
  }
  return c;
}

// ---------- branding normalization ----------
function normalizeWatermark(wm) {
  if (wm === false) return null;
  if (wm === undefined || wm === true) return {};
  if (typeof wm === 'string') return { text: wm };
  if (typeof wm === 'object') {
    const out = {};
    if (typeof wm.text === 'string') out.text = wm.text.slice(0, 80);
    if (POSITIONS.has(wm.position)) out.position = wm.position;
    if (typeof wm.color === 'string') out.color = wm.color;
    if (Number.isFinite(wm.opacity)) out.opacity = Math.min(1, Math.max(0, wm.opacity));
    if (Number.isFinite(wm.size)) out.size = Math.min(96, Math.max(8, wm.size));
    return out;
  }
  return {};
}

function normalizeLogo(logo) {
  if (!logo) return null;
  const obj = typeof logo === 'string' ? { src: logo } : logo;
  if (typeof obj.src !== 'string') return null;
  // hanya terima data URI base64 -> aman dari SSRF (ga fetch URL eksternal)
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(obj.src)) {
    throw new ValidationError('logo.src harus berupa data URI base64 (data:image/png;base64,...).');
  }
  const out = { src: obj.src };
  if (POSITIONS.has(obj.position)) out.position = obj.position;
  if (Number.isFinite(obj.height)) out.height = Math.min(400, Math.max(8, obj.height));
  if (Number.isFinite(obj.opacity)) out.opacity = Math.min(1, Math.max(0, obj.opacity));
  if (Number.isFinite(obj.margin)) out.margin = Math.min(200, Math.max(0, obj.margin));
  return out;
}

/**
 * Normalisasi request -> opsi renderChart.
 */
function clampDims(body) {
  const width = clampNum(body.width, LIMITS.width);
  const height = clampNum(body.height, LIMITS.height);
  const devicePixelRatio = clampNum(body.devicePixelRatio ?? body.dpr, LIMITS.devicePixelRatio);
  if (width * devicePixelRatio * height * devicePixelRatio > MAX_PIXELS) {
    throw new ValidationError(`Canvas terlalu besar. Maksimal ${MAX_PIXELS.toLocaleString('en')} pixel efektif.`);
  }
  return { width, height, devicePixelRatio };
}

// Flowchart/graph: input via `definition` (syntax mermaid) atau `nodes`+`edges`.
function normalizeFlowchart(body) {
  const src = body.chart || body;
  const definition = body.definition || body.mermaid || src.definition;
  const nodes = body.nodes || src.nodes;
  const edges = body.edges || src.edges;
  if (!definition && !(Array.isArray(nodes) || Array.isArray(edges))) {
    throw new ValidationError('Flowchart butuh "definition" (syntax mermaid) atau "nodes"+"edges".');
  }
  if (typeof definition === 'string' && definition.length > 20_000) {
    throw new ValidationError('Definition terlalu panjang (maks 20.000 char).');
  }
  const theme = body.theme === 'dark' ? 'dark' : 'light';
  const { width, height, devicePixelRatio } = clampDims(body);
  const subtitle = body.subtitle || body.description;
  const caption = typeof body.caption === 'string' ? body.caption
    : typeof body.source === 'string' ? `Source: ${body.source}` : undefined;
  const STYLES = new Set(['soft', 'outline', 'solid', 'colorful']);
  return {
    kind: 'flowchart',
    definition,
    nodes,
    edges,
    direction: body.direction,
    title: typeof body.title === 'string' ? body.title.slice(0, 120) : undefined,
    subtitle: typeof subtitle === 'string' ? subtitle.slice(0, 160) : undefined,
    caption: caption ? caption.slice(0, 160) : undefined,
    style: STYLES.has(body.style) ? body.style : 'soft',
    width,
    height,
    devicePixelRatio,
    backgroundColor: typeof body.backgroundColor === 'string' ? body.backgroundColor : null,
    theme,
    palette: body.palette,
    watermark: normalizeWatermark(body.watermark),
    logo: normalizeLogo(body.logo),
  };
}

export function normalizeRequest(body = {}) {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Body harus berupa JSON object.');
  rejectProtoKeys(body);

  const rawType = body.type || body.chart?.type;
  if (DIAGRAM_TYPES.has(rawType)) return normalizeFlowchart(body);

  let config = expandShortcuts(body);

  if (!config.type) throw new ValidationError('Field "type" wajib diisi.');
  if (!config.data || typeof config.data !== 'object') {
    throw new ValidationError('Field "data" wajib (atau pakai shortcut: "values"/"series").');
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
  if (width * devicePixelRatio * height * devicePixelRatio > MAX_PIXELS) {
    throw new ValidationError(`Canvas terlalu besar. Maksimal ${MAX_PIXELS.toLocaleString('en')} pixel efektif.`);
  }

  const theme = body.theme === 'dark' ? 'dark' : 'light';
  let backgroundColor = typeof body.backgroundColor === 'string' ? body.backgroundColor : null;
  if (!backgroundColor) backgroundColor = theme === 'dark' ? '#0f172a' : '#ffffff';

  const caption = typeof body.caption === 'string' ? body.caption
    : typeof body.source === 'string' ? `Source: ${body.source}` : undefined;

  return {
    config,
    width,
    height,
    devicePixelRatio,
    backgroundColor,
    format,
    theme,
    palette: body.palette,
    caption: caption ? caption.slice(0, 160) : undefined,
    watermark: normalizeWatermark(body.watermark),
    logo: normalizeLogo(body.logo),
  };
}

/** Parse query GET -> body. */
export function parseGetConfig(query) {
  let raw = query.c || query.config || query.chart;
  if (!raw) throw new ValidationError('Param "c" (JSON config) wajib ada untuk GET.');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    try { parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
    catch { throw new ValidationError('Param "c" bukan JSON valid (atau base64 JSON).'); }
  }
  const body = parsed;
  // pass-through params dari query
  for (const k of ['width', 'height', 'format', 'backgroundColor', 'devicePixelRatio', 'theme', 'palette']) {
    if (query[k] != null) body[k] = query[k];
  }
  if (query.watermark === 'false') body.watermark = false;
  else if (typeof query.watermark === 'string' && query.watermark !== 'true') body.watermark = query.watermark;
  return body;
}
