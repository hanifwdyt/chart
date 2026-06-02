// Shared site behavior: nav, scroll reveal, copy, dogfooded chart images.
const API = '/api/v1/chart';

export function chartUrl(config, params = {}) {
  const merged = { width: 720, height: 460, format: 'png', backgroundColor: '#ffffff', watermark: 'true', ...params };
  const c = encodeURIComponent(JSON.stringify(config));
  const q = new URLSearchParams(merged);
  return `${API}?c=${c}&${q.toString()}`;
}

// ---- mobile nav ----
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
}

// ---- scroll reveal ----
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  els.forEach((el) => obs.observe(el));
}

// ---- copy buttons ----
function initCopy() {
  document.querySelectorAll('.copy-code').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.closest('[data-code]')?.querySelector('code')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = t), 1200);
      });
    });
  });
}

// ---- footer year ----
function initYear() {
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

// ---- dogfood chart images: <img data-chart-preset="line"> ----
async function initDogfood() {
  const imgs = [...document.querySelectorAll('[data-chart-preset]')];
  if (!imgs.length) return;
  let presets;
  try { presets = await fetch('/api/v1/presets').then((r) => r.json()); } catch { return; }
  imgs.forEach((img) => {
    const key = img.dataset.chartPreset;
    const cfg = presets[key]?.config;
    if (!cfg) return;
    const w = Number(img.dataset.w) || 720;
    const h = Number(img.dataset.h) || 460;
    img.src = chartUrl(cfg, { width: w, height: h });
  });
}

export function boot() {
  initNav();
  initReveal();
  initCopy();
  initYear();
  initDogfood();
}

document.addEventListener('DOMContentLoaded', boot);
