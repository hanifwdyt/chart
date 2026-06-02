import { chartUrl } from '/js/site.js';
const API = '/api/v1/chart';
const $ = (s) => document.querySelector(s);

let PRESETS = {};
let ORDER = [];

function currentParams() {
  return {
    width: $('#pgWidth').value || 800,
    height: $('#pgHeight').value || 500,
    format: $('#pgFormat').value,
    backgroundColor: $('#pgBg').value || '#ffffff',
    watermark: $('#pgWatermark').checked ? 'true' : 'false',
  };
}

function numeric(p) {
  return { width: Number(p.width), height: Number(p.height), format: p.format, backgroundColor: p.backgroundColor, watermark: p.watermark === 'true' };
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
  const params = currentParams();
  $('#pgLoading').hidden = false;
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...config, ...numeric(params) }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Render failed' }));
      throw new Error(err.message || 'Render failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    $('#pgImg').src = url;
    $('#downloadBtn').href = url;
    $('#downloadBtn').download = `chart.${params.format}`;
    $('#pgUrl').textContent = location.origin + chartUrl(config, params);
  } catch (e) {
    errBox.hidden = false; errBox.textContent = e.message;
  } finally {
    $('#pgLoading').hidden = true;
  }
}

function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  $('#configInput').value = JSON.stringify(p.config, null, 2);
  $('#presetSelect').value = key;
  render();
}

async function init() {
  $('#renderBtn').addEventListener('click', render);
  ['#pgWidth', '#pgHeight', '#pgFormat', '#pgBg', '#pgWatermark'].forEach((s) => $(s).addEventListener('change', render));
  $('#configInput').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); render(); } });
  $('#copyUrlBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#pgUrl').textContent).then(() => { const b = $('#copyUrlBtn'); const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => (b.textContent = t), 1200); });
  });

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
