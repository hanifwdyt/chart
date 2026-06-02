import { createCanvas } from '@napi-rs/canvas';
import { Chart } from 'chart.js/auto';
import { _adapters } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { watermarkPlugin } from './watermark.js';

// Minimal time adapter so time-axis charts don't crash headless.
// Cukup buat formatting angka epoch jadi tanggal sederhana.
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

// Datalabels harus di-opt-in per request, jadi register manual saat dipakai.
const DATALABELS = ChartDataLabels;

const DEFAULT_BG = '#ffffff';

/**
 * Render Chart.js config jadi buffer image.
 * @param {object} opts
 * @param {object} opts.config  Chart.js config { type, data, options }
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {number} opts.devicePixelRatio
 * @param {string} opts.backgroundColor  CSS color atau 'transparent'
 * @param {string} opts.format  'png' | 'jpeg' | 'webp'
 * @param {boolean} opts.watermark  tampilkan watermark chart.hanif.app
 * @returns {Promise<Buffer>}
 */
export async function renderChart({
  config,
  width = 800,
  height = 600,
  devicePixelRatio = 2,
  backgroundColor = DEFAULT_BG,
  format = 'png',
  watermark = true,
}) {
  const canvas = createCanvas(width * devicePixelRatio, height * devicePixelRatio);
  // Polyfill ringan biar Chart.js happy di headless.
  canvas.style = { width: `${width}px`, height: `${height}px` };
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;

  const ctx = canvas.getContext('2d');

  // Background fill (kecuali transparent)
  const transparent = backgroundColor === 'transparent' || backgroundColor === 'none';
  if (!transparent) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const plugins = [watermarkPlugin({ enabled: watermark, devicePixelRatio })];

  // Aktifkan datalabels cuma kalau diminta di options.plugins.datalabels
  if (config?.options?.plugins?.datalabels) {
    plugins.push(DATALABELS);
  }

  const merged = {
    ...config,
    options: {
      responsive: false,
      animation: false,
      devicePixelRatio,
      ...config.options,
      plugins: {
        ...(config.options?.plugins || {}),
      },
    },
    plugins,
  };

  const chart = new Chart(ctx, merged);
  chart.update('none');

  let buffer;
  if (format === 'jpeg' || format === 'jpg') {
    buffer = canvas.toBuffer('image/jpeg', 90);
  } else if (format === 'webp') {
    buffer = canvas.toBuffer('image/webp', 90);
  } else {
    buffer = canvas.toBuffer('image/png');
  }

  chart.destroy();
  return buffer;
}

export const MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};
