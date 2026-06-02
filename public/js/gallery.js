import { chartUrl } from '/js/site.js';

async function init() {
  const grid = document.getElementById('galGrid');
  let presets, order;
  try {
    presets = await fetch('/api/v1/presets').then((r) => r.json());
    order = (await fetch('/api/v1/types').then((r) => r.json())).presets.map((p) => p.key);
  } catch { return; }

  grid.innerHTML = '';
  order.forEach((key, i) => {
    const p = presets[key];
    const n = String(i + 1).padStart(2, '0');
    const card = document.createElement('a');
    card.className = 'gal-card';
    card.href = `/playground?preset=${key}`;
    card.innerHTML = `
      <div class="gal-top"><span class="gal-fig">Fig. ${n}</span><span>${key}</span></div>
      <div class="thumb-skel">rendering…</div>
      <div class="gal-meta"><h4>${p.label}</h4><p>${p.desc}</p></div>`;
    grid.appendChild(card);

    const img = new Image();
    img.className = 'thumb';
    img.alt = `${p.label} chart specimen rendered by chart.hanif.app`;
    img.loading = 'lazy';
    img.onload = () => card.querySelector('.thumb-skel')?.replaceWith(img);
    img.src = chartUrl(p.config, { width: 520, height: 325 });
  });
}

init();
