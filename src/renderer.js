import { createCanvas, loadImage } from '@napi-rs/canvas';
import { Chart } from 'chart.js/auto';
import { _adapters } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { brandingPlugin } from './branding.js';
import { applyGlobalDefaults, applyTheme } from './theme.js';

applyGlobalDefaults(Chart);

// Minimal time adapter so time-axis charts don't crash headless.
_adapters._date.override({
  formats: () => ({}),
  parse: (v) => (v == null ? null : +new Date(v)),
  format: (t) => new Date(t).toISOString().slice(0, 10),
  add: (t, amount, unit) => {
    const d = new Date(t);
    const map = { day: 'Date', month: 'Month', year: 'FullYear', hour: 'Hours', minute: 'Minutes' };
    const fn = map[unit] || 'Date';
    d[`set${fn}`](d[`get${fn}`]() + amount);
    return +d;
  },
  diff: (a, b) => a - b,
  startOf: (t) => t,
  endOf: (t) => t,
});

const DATALABELS = ChartDataLabels;

export async function renderChart({
  config,
  width = 800,
  height = 600,
  devicePixelRatio = 2,
  backgroundColor = '#ffffff',
  format = 'png',
  theme = 'light',
  palette,
  caption,
  watermark = {},
  logo = null,
}) {
  applyTheme(config, { theme, palette });

  // caption/source di bawah-kiri — reserve ruang biar ga nabrak axis labels
  if (caption) {
    const o = config.options;
    const p = o.layout && typeof o.layout.padding === 'object' ? o.layout.padding : (o.layout = o.layout || {}, o.layout.padding = { top: 6, right: 18, bottom: 6, left: 8 });
    p.bottom = (p.bottom || 0) + 24;
  }

  // Load logo image (data URI) sebelum render — async, sekali per request.
  let logoState = null;
  if (logo && logo.src) {
    try {
      const buf = Buffer.from(logo.src.split(',')[1], 'base64');
      const img = await loadImage(buf);
      logoState = { ...logo, image: img };
    } catch { /* logo gagal di-load -> skip, jangan gagalin render */ }
  }

  const canvas = createCanvas(width * devicePixelRatio, height * devicePixelRatio);
  canvas.style = { width: `${width}px`, height: `${height}px` };
  const ctx = canvas.getContext('2d');

  const transparent = backgroundColor === 'transparent' || backgroundColor === 'none';
  // Background di-fill via plugin: Chart.js clear() canvas tiap draw, jadi fill
  // manual sebelum render bakal ke-wipe. destination-over nempelin di belakang.
  const bgPlugin = {
    id: 'bgFill',
    beforeDraw(chart) {
      if (transparent) return;
      const c = chart.ctx;
      c.save();
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = backgroundColor;
      c.fillRect(0, 0, chart.width, chart.height);
      c.restore();
    },
  };

  const captionPlugin = caption ? {
    id: 'caption',
    afterDraw(chart) {
      const c = chart.ctx;
      c.save();
      c.font = `400 ${Math.max(10, Math.min(13, Math.round(chart.width * 0.016)))}px sans-serif`;
      c.fillStyle = theme === 'dark' ? '#94a3b8' : '#94a3b8';
      c.textAlign = 'left';
      c.textBaseline = 'bottom';
      c.fillText(caption, 8, chart.height - 6);
      c.restore();
    },
  } : null;

  const plugins = [bgPlugin, brandingPlugin({ watermark, logo: logoState })];
  if (captionPlugin) plugins.push(captionPlugin);
  if (config?.options?.plugins?.datalabels) plugins.push(DATALABELS);

  const merged = {
    ...config,
    options: {
      responsive: false,
      animation: false,
      devicePixelRatio,
      ...config.options,
      plugins: { ...(config.options?.plugins || {}) },
    },
    plugins,
  };

  const chart = new Chart(ctx, merged);
  let buffer;
  try {
    chart.update('none');
    if (format === 'jpeg' || format === 'jpg') buffer = canvas.toBuffer('image/jpeg', 90);
    else if (format === 'webp') buffer = canvas.toBuffer('image/webp', 90);
    else buffer = canvas.toBuffer('image/png');
  } finally {
    chart.destroy();
  }
  return buffer;
}

export const MIME = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp' };
