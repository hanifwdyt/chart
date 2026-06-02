// Theme, named palettes & auto-normalisasi data — output kelas profesional
// (referensi konvensi: Datawrapper, The Economist, Observable Plot, Stripe).

export const PALETTES = {
  default: ['#4f46e5', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'],
  cobalt: ['#2730ff', '#5b8def', '#00b4d8', '#0077b6', '#7209b7', '#48cae4'],
  sunset: ['#ef476f', '#f78c6b', '#ffd166', '#f15bb5', '#9b5de5', '#ee964b'],
  ocean: ['#0077b6', '#00b4d8', '#48cae4', '#0096c7', '#023e8a', '#90e0ef'],
  forest: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#1b4332', '#95d5b2'],
  candy: ['#ff499e', '#d264b6', '#a480cf', '#779be7', '#49b6ff', '#5de4c7'],
  mono: ['#0f172a', '#334155', '#64748b', '#94a3b8', '#475569', '#cbd5e1'],
  warm: ['#e63946', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#577590'],
  pastel: ['#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffadad', '#fdffb6', '#caffbf'],
  corporate: ['#1f4e79', '#2e75b6', '#9dc3e6', '#ffc000', '#c55a11', '#548235'],
};

const ARC_TYPES = new Set(['pie', 'doughnut', 'polarArea']);
const LINE_LIKE = new Set(['line', 'radar']);
const CARTESIAN = new Set(['bar', 'line', 'scatter', 'bubble']);

function withAlpha(hex, a) {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function resolvePalette(palette) {
  if (Array.isArray(palette) && palette.length) return palette;
  if (typeof palette === 'string' && PALETTES[palette]) return PALETTES[palette];
  return PALETTES.default;
}

const fmtNum = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v);

export function applyGlobalDefaults(Chart) {
  const d = Chart.defaults;
  d.font.family = "'Inter', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif";
  d.font.size = 13;
  d.color = '#64748b';
  d.borderColor = 'rgba(15, 23, 42, 0.06)';
  // Title — kiri, tebal (konvensi editorial)
  d.plugins.title.font = { size: 18, weight: '700' };
  d.plugins.title.color = '#0f172a';
  d.plugins.title.align = 'start';
  d.plugins.title.padding = { top: 2, bottom: 2 };
  // Subtitle — muted, kiri, di bawah title
  d.plugins.subtitle.font = { size: 13, weight: '400' };
  d.plugins.subtitle.color = '#64748b';
  d.plugins.subtitle.align = 'start';
  d.plugins.subtitle.padding = { top: 2, bottom: 16 };
  // Legend — point style, rapat
  d.plugins.legend.position = 'top';
  d.plugins.legend.align = 'start';
  d.plugins.legend.labels.boxWidth = 7;
  d.plugins.legend.labels.boxHeight = 7;
  d.plugins.legend.labels.padding = 14;
  d.plugins.legend.labels.usePointStyle = true;
  d.plugins.legend.labels.pointStyle = 'circle';
  d.plugins.legend.labels.font = { size: 12.5 };
  // Bar
  d.elements.bar.borderRadius = 6;
  d.elements.bar.borderSkipped = false;
  // Arc
  d.elements.arc.borderWidth = 2;
}

const DARK = { text: '#cbd5e1', title: '#f1f5f9', sub: '#94a3b8', grid: 'rgba(148,163,184,0.14)' };
const LIGHT = { text: '#64748b', title: '#0f172a', sub: '#64748b', grid: 'rgba(15,23,42,0.07)' };

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
      if (ds.backgroundColor == null && Array.isArray(ds.data)) ds.backgroundColor = ds.data.map((_, j) => colors[j % colors.length]);
      if (ds.borderColor == null) ds.borderColor = theme === 'dark' ? '#0f172a' : '#ffffff';
      if (ds.borderWidth == null) ds.borderWidth = 2;
      if (ds.hoverOffset == null) ds.hoverOffset = 6;
    } else if (LINE_LIKE.has(dsType)) {
      if (ds.borderColor == null) ds.borderColor = color;
      if (ds.backgroundColor == null) ds.backgroundColor = ds.fill ? withAlpha(color, 0.16) : color;
      if (ds.tension == null && dsType === 'line' && ds.stepped == null) ds.tension = 0.35;
      if (ds.borderWidth == null) ds.borderWidth = 2.5;
      if (ds.pointRadius == null) ds.pointRadius = dsType === 'radar' ? 3 : 0;
      if (ds.pointHoverRadius == null) ds.pointHoverRadius = 4;
      if (ds.pointBackgroundColor == null) ds.pointBackgroundColor = color;
      if (ds.borderCapStyle == null) ds.borderCapStyle = 'round';
    } else {
      if (ds.backgroundColor == null) ds.backgroundColor = dsType === 'scatter' || dsType === 'bubble' ? withAlpha(color, 0.6) : color;
      if (ds.borderColor == null && (dsType === 'scatter' || dsType === 'bubble')) ds.borderColor = color;
      if (dsType === 'bar') {
        if (ds.categoryPercentage == null) ds.categoryPercentage = 0.74;
        if (ds.barPercentage == null) ds.barPercentage = 0.88;
        if (ds.maxBarThickness == null) ds.maxBarThickness = 96;
      }
    }
  });

  config.options = config.options || {};
  const o = config.options;
  o.plugins = o.plugins || {};

  // dark theme text colors
  if (theme === 'dark') {
    o.color = o.color || t.text;
    o.plugins.title = { color: t.title, ...(o.plugins.title || {}) };
    o.plugins.subtitle = o.plugins.subtitle ? { color: t.sub, ...o.plugins.subtitle } : o.plugins.subtitle;
    o.plugins.legend = o.plugins.legend || {};
    o.plugins.legend.labels = { color: t.text, ...(o.plugins.legend.labels || {}) };
  }

  // ---- cartesian axis styling (pro: no vertical grid, no axis border, format angka) ----
  if (CARTESIAN.has(type)) {
    const horizontal = o.indexAxis === 'y';
    const valueAxis = horizontal ? 'x' : 'y';
    const catAxis = horizontal ? 'y' : 'x';
    const bothValue = type === 'scatter' || type === 'bubble';
    o.scales = o.scales || {};
    const styleAxis = (name, isValue) => {
      const ax = (o.scales[name] = o.scales[name] || {});
      ax.grid = { color: t.grid, drawTicks: false, ...(ax.grid || {}) };
      // category axis: ga ada gridline (kecuali scatter/bubble)
      if (!isValue && !bothValue && ax.grid.display === undefined) ax.grid.display = false;
      ax.border = { display: false, ...(ax.border || {}) };
      ax.ticks = { color: theme === 'dark' ? t.text : '#64748b', padding: 8, font: { size: 12 }, ...(ax.ticks || {}) };
      if (isValue && ax.ticks.callback === undefined) ax.ticks.callback = (v) => fmtNum(Number(v));
    };
    styleAxis(valueAxis, true);
    styleAxis(catAxis, bothValue);
    if (bothValue) { styleAxis('x', true); styleAxis('y', true); }
  }

  // ---- legend & label handling ----
  const anyLabel = datasets.some((d) => typeof d.label === 'string' && d.label.length);
  if (!anyLabel) {
    if (datasets.length <= 1 && (!o.plugins.legend || o.plugins.legend.display === undefined)) {
      o.plugins.legend = { ...(o.plugins.legend || {}), display: false };
    } else {
      datasets.forEach((d, i) => { if (!d.label) d.label = `Series ${i + 1}`; });
    }
  }

  // ---- breathing room ----
  if (o.layout === undefined) o.layout = { padding: { top: 6, right: 18, bottom: 6, left: 8 } };
  return config;
}
