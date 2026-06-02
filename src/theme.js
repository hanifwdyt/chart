// Theme, named palettes & auto-normalisasi data.
// Bikin chart keliatan profesional walau user cuma ngasih angka mentah.

export const PALETTES = {
  default: ['#6366f1', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'],
  cobalt: ['#2730ff', '#5b8def', '#00b4d8', '#0077b6', '#90e0ef', '#48cae4'],
  sunset: ['#ff6b6b', '#f9844a', '#fee440', '#f15bb5', '#9b5de5', '#ee964b'],
  ocean: ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#023e8a', '#0096c7'],
  forest: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332'],
  candy: ['#ff499e', '#d264b6', '#a480cf', '#779be7', '#49b6ff', '#5de4c7'],
  mono: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#4b5563'],
  warm: ['#e63946', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#577590'],
};

const ARC_TYPES = new Set(['pie', 'doughnut', 'polarArea']);
const LINE_LIKE = new Set(['line', 'radar']);

function withAlpha(hex, a) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function resolvePalette(palette) {
  if (Array.isArray(palette) && palette.length) return palette;
  if (typeof palette === 'string' && PALETTES[palette]) return PALETTES[palette];
  return PALETTES.default;
}

// Default global Chart.js — dipanggil sekali di startup.
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

const DARK = { text: '#cbd5e1', title: '#f1f5f9', grid: 'rgba(148,163,184,0.16)' };
const LIGHT = { text: '#475569', title: '#0f172a', grid: 'rgba(15,23,42,0.06)' };

/**
 * Normalisasi config: warna (palette), theme dark/light, legend/label.
 * Mutasi config in-place. opts: { theme, palette }.
 */
export function applyTheme(config, { theme = 'light', palette } = {}) {
  const type = config.type;
  const data = config.data || {};
  const datasets = Array.isArray(data.datasets) ? data.datasets : [];
  const colors = resolvePalette(palette);
  const t = theme === 'dark' ? DARK : LIGHT;

  datasets.forEach((ds, i) => {
    const dsType = ds.type || type;
    const color = colors[i % colors.length];

    if (ARC_TYPES.has(dsType)) {
      if (ds.backgroundColor == null && Array.isArray(ds.data)) {
        ds.backgroundColor = ds.data.map((_, j) => colors[j % colors.length]);
      }
      if (ds.borderColor == null) ds.borderColor = theme === 'dark' ? '#0f172a' : '#ffffff';
      if (ds.borderWidth == null) ds.borderWidth = 2;
    } else if (LINE_LIKE.has(dsType)) {
      if (ds.borderColor == null) ds.borderColor = color;
      if (ds.backgroundColor == null) ds.backgroundColor = ds.fill ? withAlpha(color, 0.18) : color;
      if (ds.tension == null && dsType === 'line' && ds.stepped == null) ds.tension = 0.35;
      if (ds.borderWidth == null) ds.borderWidth = 2.5;
      if (ds.pointRadius == null) ds.pointRadius = dsType === 'radar' ? 3 : 2.5;
      if (ds.pointBackgroundColor == null) ds.pointBackgroundColor = color;
    } else {
      if (ds.backgroundColor == null) {
        ds.backgroundColor = dsType === 'scatter' || dsType === 'bubble' ? withAlpha(color, 0.65) : color;
      }
      if (ds.borderColor == null && (dsType === 'scatter' || dsType === 'bubble')) ds.borderColor = color;
    }
  });

  config.options = config.options || {};
  const o = config.options;
  o.plugins = o.plugins || {};

  // theme colors
  if (theme === 'dark') {
    o.color = o.color || t.text;
    if (o.plugins.title) o.plugins.title.color = o.plugins.title.color || t.title;
    if (o.plugins.subtitle) o.plugins.subtitle.color = o.plugins.subtitle.color || t.text;
    o.plugins.legend = o.plugins.legend || {};
    o.plugins.legend.labels = { color: t.text, ...(o.plugins.legend.labels || {}) };
    applyGridColor(o, t.grid, t.text);
  }

  // legend & label handling
  const legend = o.plugins.legend && o.plugins.legend.display;
  const anyLabel = datasets.some((d) => typeof d.label === 'string' && d.label.length);
  if (!anyLabel) {
    if (datasets.length <= 1 && (!o.plugins.legend || o.plugins.legend.display === undefined)) {
      o.plugins.legend = { ...(o.plugins.legend || {}), display: false };
    } else {
      datasets.forEach((d, i) => { if (!d.label) d.label = `Series ${i + 1}`; });
    }
  }

  if (o.layout === undefined) o.layout = { padding: 12 };
  return config;
}

function applyGridColor(o, grid, tick) {
  o.scales = o.scales || {};
  for (const axis of ['x', 'y', 'r']) {
    if (o.scales[axis] || axis !== 'r') {
      o.scales[axis] = o.scales[axis] || {};
      o.scales[axis].grid = { color: grid, ...(o.scales[axis].grid || {}) };
      o.scales[axis].ticks = { color: tick, ...(o.scales[axis].ticks || {}) };
      if (axis === 'r') {
        o.scales[axis].angleLines = { color: grid, ...(o.scales[axis].angleLines || {}) };
        o.scales[axis].pointLabels = { color: tick, ...(o.scales[axis].pointLabels || {}) };
      }
    }
  }
}
