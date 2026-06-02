// chart.hanif.app — frontend playground & gallery logic
const API = '/api/v1/chart';
const $ = (s) => document.querySelector(s);

let PRESETS = {};
let ORDER = [];

// ---------- Build GET URL dari state playground ----------
function buildUrl(config, params) {
  const c = encodeURIComponent(JSON.stringify(config));
  const q = new URLSearchParams(params);
  return `${location.origin}${API}?c=${c}&${q.toString()}`;
}

function currentParams() {
  return {
    width: $('#pgWidth').value || 800,
    height: $('#pgHeight').value || 500,
    format: $('#pgFormat').value,
    backgroundColor: $('#pgBg').value || '#ffffff',
    watermark: $('#pgWatermark').checked ? 'true' : 'false',
  };
}

// ---------- Render playground ----------
async function render() {
  const errBox = $('#pgError');
  errBox.hidden = true;
  let config;
  try {
    config = JSON.parse($('#configInput').value);
  } catch (e) {
    errBox.hidden = false;
    errBox.textContent = 'JSON invalid: ' + e.message;
    return;
  }

  const params = currentParams();
  const body = { ...config, ...numeric(params) };

  $('#pgLoading').hidden = false;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Gagal render' }));
      throw new Error(err.message || 'Gagal render');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    $('#pgImg').src = url;
    $('#downloadBtn').href = url;
    $('#downloadBtn').download = `chart.${params.format}`;

    // Update GET URL display
    const getUrl = buildUrl(config, params);
    $('#pgUrl').textContent = getUrl;
  } catch (e) {
    errBox.hidden = false;
    errBox.textContent = e.message;
  } finally {
    $('#pgLoading').hidden = true;
  }
}

function numeric(p) {
  return {
    width: Number(p.width),
    height: Number(p.height),
    format: p.format,
    backgroundColor: p.backgroundColor,
    watermark: p.watermark === 'true',
  };
}

// ---------- Load preset ke editor ----------
function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  $('#configInput').value = JSON.stringify(p.config, null, 2);
  $('#presetSelect').value = key;
  render();
  $('#playground').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Gallery ----------
function buildGallery() {
  const grid = $('#galleryGrid');
  grid.innerHTML = '';
  ORDER.forEach((key) => {
    const p = PRESETS[key];
    const card = document.createElement('button');
    card.className = 'gallery-card';
    card.innerHTML = `
      <div class="thumb-skel">rendering ${p.label}…</div>
      <div class="meta"><h4>${p.label}</h4><p>${p.desc}</p></div>`;
    card.addEventListener('click', () => loadPreset(key));
    grid.appendChild(card);

    // Render thumbnail via GET URL (lazy-ish, langsung set src)
    const url = buildUrl(p.config, { width: 480, height: 300, format: 'png', backgroundColor: '#ffffff', watermark: 'true' });
    const img = new Image();
    img.className = 'thumb';
    img.alt = p.label;
    img.loading = 'lazy';
    img.onload = () => { const skel = card.querySelector('.thumb-skel'); if (skel) skel.replaceWith(img); };
    img.src = url;
  });
}

// ---------- Type chips ----------
function buildChips(types) {
  const box = $('#typeChips');
  box.innerHTML = types.map((t) => `<span>${t}</span>`).join('');
}

// ---------- Preset dropdown ----------
function buildPresetSelect() {
  const sel = $('#presetSelect');
  sel.innerHTML = ORDER.map((k) => `<option value="${k}">${PRESETS[k].label}</option>`).join('');
  sel.addEventListener('change', () => loadPreset(sel.value));
}

// ---------- Hero image ----------
function setHero() {
  const cfg = PRESETS.line?.config || PRESETS[ORDER[0]].config;
  $('#heroImg').src = buildUrl(cfg, { width: 640, height: 420, format: 'png', backgroundColor: '#ffffff', watermark: 'true' });
}

// ---------- Copy buttons ----------
function wireCopy() {
  document.querySelectorAll('.copy-code').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const t = btn.textContent; btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = t), 1200);
      });
    });
  });

  $('#copyUrlBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#pgUrl').textContent).then(() => {
      const b = $('#copyUrlBtn'); const t = b.textContent; b.textContent = 'Copied!';
      setTimeout(() => (b.textContent = t), 1200);
    });
  });
}

// ---------- Docs TOC active state ----------
function wireToc() {
  const links = document.querySelectorAll('.docs-toc a');
  const sections = [...links].map((l) => document.querySelector(l.getAttribute('href')));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach((s) => s && obs.observe(s));
}

// ---------- Init ----------
async function init() {
  wireCopy();
  wireToc();
  $('#renderBtn').addEventListener('click', render);
  ['#pgWidth', '#pgHeight', '#pgFormat', '#pgBg', '#pgWatermark'].forEach((s) =>
    $(s).addEventListener('change', render)
  );
  // Ctrl/Cmd+Enter buat render
  $('#configInput').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); render(); }
  });

  try {
    const [presetsRes, typesRes] = await Promise.all([
      fetch('/api/v1/presets').then((r) => r.json()),
      fetch('/api/v1/types').then((r) => r.json()),
    ]);
    PRESETS = presetsRes;
    ORDER = typesRes.presets.map((p) => p.key);
    buildChips(typesRes.types);
  } catch (e) {
    console.error('Gagal load metadata', e);
    return;
  }

  buildPresetSelect();
  buildGallery();
  setHero();

  // Load default preset (bar) ke editor
  $('#configInput').value = JSON.stringify(PRESETS.bar.config, null, 2);
  render();
}

init();
