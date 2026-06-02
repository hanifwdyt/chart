// Theme & auto-normalisasi data — biar chart keliatan profesional walau user
// cuma ngasih angka mentah tanpa warna/label. Ini yang bikin output ga "bland".

export const BRAND_PALETTE = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#3b82f6', // blue
];

const ARC_TYPES = new Set(['pie', 'doughnut', 'polarArea']);
const LINE_LIKE = new Set(['line', 'radar']);

// Tambah alpha ke hex (#rrggbb -> rgba).
function withAlpha(hex, a) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Set default global Chart.js sekali di startup (font, warna teks, grid).
 * Dipanggil sekali dari renderer.
 */
export function applyGlobalDefaults(Chart) {
  Chart.defaults.font.family = "'Inter', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#475569';
  Chart.defaults.borderColor = 'rgba(15, 23, 42, 0.06)';
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.plugins.legend.labels.boxHeight = 14;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.title.font = { size: 16, weight: '600' };
  Chart.defaults.plugins.title.padding = { top: 6, bottom: 18 };
  Chart.defaults.plugins.title.color = '#0f172a';
  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.elements.bar.borderSkipped = false;
}

/**
 * Normalisasi config user: auto-assign warna & handle label/legend supaya
 * output rapi tanpa maksa user nentuin styling.
 * Mutasi config in-place (config sudah hasil parse JSON, aman).
 */
export function applyTheme(config) {
  const type = config.type;
  const data = config.data || {};
  const datasets = Array.isArray(data.datasets) ? data.datasets : [];

  datasets.forEach((ds, i) => {
    const dsType = ds.type || type;
    const color = BRAND_PALETTE[i % BRAND_PALETTE.length];

    if (ARC_TYPES.has(dsType)) {
      // Warna per-segmen
      if (ds.backgroundColor == null && Array.isArray(ds.data)) {
        ds.backgroundColor = ds.data.map((_, j) => BRAND_PALETTE[j % BRAND_PALETTE.length]);
      }
      if (ds.borderColor == null) ds.borderColor = '#ffffff';
      if (ds.borderWidth == null) ds.borderWidth = 2;
    } else if (LINE_LIKE.has(dsType)) {
      if (ds.borderColor == null) ds.borderColor = color;
      if (ds.backgroundColor == null) ds.backgroundColor = ds.fill ? withAlpha(color, 0.18) : color;
      if (ds.tension == null && dsType === 'line') ds.tension = 0.35;
      if (ds.borderWidth == null) ds.borderWidth = 2.5;
      if (ds.pointRadius == null) ds.pointRadius = dsType === 'radar' ? 3 : 2.5;
      if (ds.pointBackgroundColor == null) ds.pointBackgroundColor = color;
    } else {
      // bar / scatter / bubble
      if (ds.backgroundColor == null) {
        ds.backgroundColor = dsType === 'scatter' || dsType === 'bubble' ? withAlpha(color, 0.65) : color;
      }
      if (ds.borderColor == null && (dsType === 'scatter' || dsType === 'bubble')) {
        ds.borderColor = color;
      }
    }
  });

  // --- Legend & label handling ---
  config.options = config.options || {};
  config.options.plugins = config.options.plugins || {};
  const legend = config.options.plugins.legend;
  const anyLabel = datasets.some((d) => typeof d.label === 'string' && d.label.length);

  if (!anyLabel) {
    if (datasets.length <= 1 && legend === undefined) {
      // Single dataset tanpa label -> sembunyiin legend (daripada "undefined")
      config.options.plugins.legend = { display: false };
    } else {
      // Multi dataset -> kasih nama default biar ga "undefined"
      datasets.forEach((d, i) => {
        if (!d.label) d.label = `Series ${i + 1}`;
      });
    }
  }

  // Layout breathing room
  if (config.options.layout === undefined) {
    config.options.layout = { padding: 12 };
  }

  return config;
}
