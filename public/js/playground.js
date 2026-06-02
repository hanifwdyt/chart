import { chartUrl } from '/js/site.js';
const API = '/api/v1/chart';
const $ = (s) => document.querySelector(s);

let PRESETS = {};
let ORDER = [];

const EXAMPLES = {
  shortcut: {
    type: 'bar',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    values: [12, 19, 8, 15, 22],
    title: 'Shortcut mode — just labels + values',
  },
  dark: {
    type: 'line',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    series: [
      { name: 'Revenue', data: [40, 55, 48, 70, 62] },
      { name: 'Target', data: [50, 50, 60, 60, 70] },
    ],
    title: 'Dark + series shortcut',
    theme: 'dark',
  },
  gauge: {
    type: 'gauge',
    data: { labels: ['Used', 'Free'], datasets: [{ data: [72, 28], backgroundColor: ['#2730ff', '#e5e7eb'] }] },
    title: 'CPU · 72%',
  },
  branding: {
    type: 'bar',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    values: [20, 35, 28, 45],
    title: 'Your brand, your chart',
    watermark: { text: 'ACME MEDIA', position: 'bottom-left', color: '#2730ff' },
  },
};

function currentParams() {
  return {
    width: $('#pgWidth').value || 800,
    height: $('#pgHeight').value || 500,
    format: $('#pgFormat').value,
    backgroundColor: $('#pgBg').value || '#ffffff',
    theme: $('#pgTheme').value,
    palette: $('#pgPalette').value,
    watermark: $('#pgWatermark').checked ? 'true' : 'false',
  };
}

function bodyFrom(config, p) {
  const body = {
    ...config,
    width: Number(p.width),
    height: Number(p.height),
    format: p.format,
    backgroundColor: p.backgroundColor,
    watermark: p.watermark === 'true',
  };
  if (p.theme === 'dark') body.theme = 'dark';
  if (p.palette) body.palette = p.palette;
  return body;
}

function urlParams(p) {
  const out = { width: p.width, height: p.height, format: p.format, backgroundColor: p.backgroundColor, watermark: p.watermark };
  if (p.theme === 'dark') out.theme = 'dark';
  if (p.palette) out.palette = p.palette;
  return out;
}

async function render() {
  const errBox = $('#pgError');
  errBox.hidden = true;
  let config;
  try {
    config = JSON.parse($('#configInput').value);
  } catch (e) {
    errBox.hidden = false; errBox.textContent = 'Invalid JSON: ' + e.message; return;
  }
  const p = currentParams();
  $('#pgLoading').hidden = false;
  const t0 = performance.now();
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyFrom(config, p)) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Render failed' }));
      throw new Error(err.message || 'Render failed');
    }
    const cache = res.headers.get('x-cache') || '';
    const blob = await res.blob();
    const ms = Math.round(performance.now() - t0);
    const url = URL.createObjectURL(blob);
    $('#pgImg').src = url;
    $('#downloadBtn').href = url;
    $('#downloadBtn').download = `chart.${p.format}`;
    $('#pgUrl').textContent = location.origin + chartUrl(config, urlParams(p));
    const badge = $('#pgBadge');
    badge.textContent = `${ms}ms · ${cache === 'HIT' ? 'cached' : 'fresh'} · ${(blob.size / 1024).toFixed(0)}KB`;
    badge.className = 'pg-badge' + (cache === 'HIT' ? ' hit' : '');
  } catch (e) {
    errBox.hidden = false; errBox.textContent = e.message;
  } finally {
    $('#pgLoading').hidden = true;
  }
}

// debounce biar live-render terasa instan tapi ga spam request tiap ketik
let timer;
function liveRender() { clearTimeout(timer); timer = setTimeout(render, 450); }

function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  $('#configInput').value = JSON.stringify(p.config, null, 2);
  $('#presetSelect').value = key;
  render();
}

function loadExample(key) {
  const ex = EXAMPLES[key];
  if (!ex) return;
  $('#configInput').value = JSON.stringify(ex, null, 2);
  if (ex.theme === 'dark') $('#pgTheme').value = 'dark'; else $('#pgTheme').value = 'light';
  render();
}

async function init() {
  $('#renderBtn').addEventListener('click', render);
  ['#pgWidth', '#pgHeight', '#pgFormat', '#pgBg', '#pgTheme', '#pgPalette', '#pgWatermark'].forEach((s) => $(s).addEventListener('change', render));
  $('#configInput').addEventListener('input', liveRender);
  $('#configInput').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); render(); } });
  $('#copyUrlBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#pgUrl').textContent).then(() => { const b = $('#copyUrlBtn'); const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => (b.textContent = t), 1200); });
  });
  document.querySelectorAll('.pg-chip').forEach((c) => c.addEventListener('click', () => loadExample(c.dataset.ex)));

  try {
    const [presets, types] = await Promise.all([
      fetch('/api/v1/presets').then((r) => r.json()),
      fetch('/api/v1/types').then((r) => r.json()),
    ]);
    PRESETS = presets;
    ORDER = types.presets.map((p) => p.key);
  } catch (e) { console.error(e); return; }

  const sel = $('#presetSelect');
  sel.innerHTML = ORDER.map((k) => `<option value="${k}">${PRESETS[k].label}</option>`).join('');
  sel.addEventListener('change', () => loadPreset(sel.value));

  const wanted = new URLSearchParams(location.search).get('preset');
  loadPreset(ORDER.includes(wanted) ? wanted : 'bar');
}

init();
