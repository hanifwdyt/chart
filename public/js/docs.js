// Docs: type chips from API + sticky TOC active state.
async function chips() {
  const box = document.getElementById('typeChips');
  if (!box) return;
  try {
    const t = await fetch('/api/v1/types').then((r) => r.json());
    box.innerHTML = t.types.map((x) => `<span>${x}</span>`).join('');
  } catch {}
}

function toc() {
  const links = [...document.querySelectorAll('.docs-toc a')];
  const sections = links.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    }),
    { rootMargin: '-18% 0px -72% 0px' }
  );
  sections.forEach((s) => obs.observe(s));
}

chips();
toc();
