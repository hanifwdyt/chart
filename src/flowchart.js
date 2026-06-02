import { createCanvas, loadImage } from '@napi-rs/canvas';
import dagre from 'dagre';
import { drawBranding } from './branding.js';
import { resolvePalette } from './theme.js';

// ====== Parser: subset syntax mermaid flowchart ======
// Support: graph/flowchart TD|TB|LR|RL|BT ; node shapes [] () {} (()) ([]) {{}} ;
// connector --> --- -.-> ==> ; label |text| atau -- text --> ; chain A-->B-->C.

const SHAPES = [
  [/^(\w+)\(\((.*?)\)\)/, 'circle'],
  [/^(\w+)\(\[(.*?)\]\)/, 'stadium'],
  [/^(\w+)\{\{(.*?)\}\}/, 'hexagon'],
  [/^(\w+)\[(.*?)\]/, 'rect'],
  [/^(\w+)\((.*?)\)/, 'round'],
  [/^(\w+)\{(.*?)\}/, 'diamond'],
];
const CONNECTORS = ['==>', '-.->', '-->', '---', '==='];

function parseMermaid(def) {
  const lines = String(def).split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  let dir = 'TB';
  const nodes = new Map(); // id -> {label, shape}
  const edges = [];

  const ensureNode = (id, label, shape) => {
    if (!nodes.has(id)) nodes.set(id, { label: label ?? id, shape: shape ?? 'rect' });
    else if (label != null) { const n = nodes.get(id); n.label = label; if (shape) n.shape = shape; }
    return id;
  };

  // ambil node token di awal string -> {id, rest}
  const takeNode = (s) => {
    for (const [re, shape] of SHAPES) {
      const m = s.match(re);
      if (m) return { id: m[1], label: m[2], shape, rest: s.slice(m[0].length) };
    }
    const m = s.match(/^(\w+)/);
    if (m) return { id: m[1], label: null, shape: null, rest: s.slice(m[0].length) };
    return null;
  };

  for (const raw of lines) {
    let line = raw;
    const head = line.match(/^(graph|flowchart)\s+(TB|TD|LR|RL|BT)\b/i);
    if (head) { dir = head[2].toUpperCase() === 'TD' ? 'TB' : head[2].toUpperCase(); line = line.slice(head[0].length).trim(); if (!line) continue; }

    // normalisasi label bentuk `-- text -->` / `== text ==>` jadi `-->|text|`
    line = line.replace(/--\s*([^->|]+?)\s*-->/g, '-->|$1|').replace(/==\s*([^=>|]+?)\s*==>/g, '==>|$1|');

    // parse chain: node (connector (|label|)? node)*
    let s = line.trim();
    let left = takeNode(s);
    if (!left) continue;
    ensureNode(left.id, left.label, left.shape);
    s = left.rest.trim();
    while (s) {
      const conn = CONNECTORS.find((c) => s.startsWith(c));
      if (!conn) break;
      s = s.slice(conn.length).trim();
      let label;
      const lab = s.match(/^\|([^|]*)\|/);
      if (lab) { label = lab[1].trim(); s = s.slice(lab[0].length).trim(); }
      const right = takeNode(s);
      if (!right) break;
      ensureNode(right.id, right.label, right.shape);
      edges.push({ from: left.id, to: right.id, label, style: conn === '-.->' ? 'dashed' : 'solid' });
      left = right;
      s = right.rest.trim();
    }
  }
  return { dir, nodes, edges };
}

// terima struktur eksplisit {nodes:[{id,label,shape}], edges:[{from,to,label}]}
function fromStructured(spec) {
  const nodes = new Map();
  (spec.nodes || []).forEach((n) => nodes.set(n.id, { label: n.label ?? n.id, shape: n.shape || 'rect' }));
  const edges = (spec.edges || []).map((e) => ({ from: e.from, to: e.to, label: e.label, style: e.style || 'solid' }));
  // pastikan node dari edges ada
  edges.forEach((e) => { if (!nodes.has(e.from)) nodes.set(e.from, { label: e.from, shape: 'rect' }); if (!nodes.has(e.to)) nodes.set(e.to, { label: e.to, shape: 'rect' }); });
  return { dir: (spec.direction || 'TB').toUpperCase(), nodes, edges };
}

// ====== Theme ======
function colors(theme, palette) {
  const pal = resolvePalette(palette);
  if (theme === 'dark') {
    return { pal, bg: '#0f172a', nodeFill: '#1e293b', nodeText: '#e2e8f0', title: '#f1f5f9', sub: '#94a3b8', border: pal[0], edge: '#94a3b8', edgeText: '#cbd5e1', labelBg: '#0f172a' };
  }
  return { pal, bg: '#ffffff', nodeFill: '#eef1ff', nodeText: '#15140f', title: '#0f172a', sub: '#64748b', border: pal[0], edge: '#94a3b8', edgeText: '#475569', labelBg: '#ffffff' };
}

// Resolusi tampilan node per "style" + index (buat colorful).
function nodeAppearance(style, c, i) {
  const accent = c.pal[i % c.pal.length];
  switch (style) {
    case 'solid': return { fill: c.border, text: '#ffffff', border: c.border, bw: 0 };
    case 'colorful': return { fill: accent, text: '#ffffff', border: accent, bw: 0 };
    case 'outline': return { fill: c.bg === 'transparent' ? '#ffffff00' : c.bg, text: c.border, border: c.border, bw: 2.4 };
    default: return { fill: c.nodeFill, text: c.nodeText, border: c.border, bw: 1.8 };
  }
}

function wrapLabel(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

const LIMITS = { maxNodes: 200, maxEdges: 400 };

export async function renderFlowchart({
  definition, nodes: nodeSpec, edges: edgeSpec, direction,
  width = 800, height = 600, devicePixelRatio = 2, backgroundColor,
  theme = 'light', palette, watermark = {}, logo = null, title, subtitle, caption, style = 'soft',
}) {
  let parsed;
  if (definition) parsed = parseMermaid(definition);
  else parsed = fromStructured({ nodes: nodeSpec, edges: edgeSpec, direction });
  if (direction) parsed.dir = String(direction).toUpperCase() === 'TD' ? 'TB' : String(direction).toUpperCase();

  if (parsed.nodes.size === 0) throw Object.assign(new Error('Flowchart kosong — ga ada node terdeteksi.'), { status: 400 });
  if (parsed.nodes.size > LIMITS.maxNodes) throw Object.assign(new Error(`Maksimal ${LIMITS.maxNodes} node.`), { status: 400 });
  if (parsed.edges.length > LIMITS.maxEdges) throw Object.assign(new Error(`Maksimal ${LIMITS.maxEdges} edge.`), { status: 400 });

  const c = colors(theme, palette);
  const bg = backgroundColor || c.bg;
  const FONT = '15px sans-serif';
  const PADX = 18, PADY = 12, LINEH = 19;

  // canvas pengukur teks
  const meas = createCanvas(10, 10).getContext('2d');
  meas.font = FONT;

  // ukur tiap node
  const sized = new Map();
  for (const [id, n] of parsed.nodes) {
    const lines = wrapLabel(meas, n.label, 180);
    const textW = Math.max(...lines.map((l) => meas.measureText(l).width));
    let w = Math.max(70, Math.ceil(textW) + PADX * 2);
    let h = lines.length * LINEH + PADY * 2;
    if (n.shape === 'diamond') { w += 30; h += 24; }
    if (n.shape === 'circle') { const d = Math.max(w, h) + 10; w = d; h = d; }
    sized.set(id, { ...n, lines, w, h });
  }

  // layout dagre
  const g = new dagre.graphlib.Graph({ multigraph: true, directed: true });
  g.setGraph({ rankdir: parsed.dir, nodesep: 38, ranksep: 52, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const [id, n] of sized) g.setNode(id, { width: n.w, height: n.h });
  parsed.edges.forEach((e, i) => g.setEdge(e.from, e.to, { labelpos: 'c' }, 'e' + i));
  dagre.layout(g);

  const gw = g.graph().width || 100;
  const gh = g.graph().height || 100;

  // canvas final + fit-to-bounds
  const W = width * devicePixelRatio, H = height * devicePixelRatio;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const transparent = bg === 'transparent' || bg === 'none';
  if (!transparent) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }

  const dpr = devicePixelRatio;
  const sidePad = 26 * dpr;
  const topPad = 22 * dpr;
  let headerH = 0;
  if (title) headerH += 26 * dpr;
  if (subtitle) headerH += 20 * dpr;
  if (title || subtitle) headerH += 12 * dpr;
  const captionH = caption ? 26 * dpr : 0;
  const bottomPad = 20 * dpr;

  const topRegion = topPad + headerH;
  const bottomRegion = bottomPad + captionH;
  const availW = W - sidePad * 2;
  const availH = H - topRegion - bottomRegion;
  const scale = Math.min(availW / gw, availH / gh, dpr * 1.5);
  const offX = (W - gw * scale) / 2;
  const offY = topRegion + Math.max(0, (availH - gh * scale) / 2);

  // header: title (bold) + subtitle (muted), kiri-atas
  if (title || subtitle) {
    let ty = topPad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (title) {
      ctx.fillStyle = c.title;
      ctx.font = `700 ${18 * dpr}px sans-serif`;
      ctx.fillText(String(title), sidePad, ty);
      ty += 24 * dpr;
    }
    if (subtitle) {
      ctx.fillStyle = c.sub;
      ctx.font = `400 ${13 * dpr}px sans-serif`;
      ctx.fillText(String(subtitle), sidePad, ty);
    }
  }
  // caption bottom-left
  if (caption) {
    ctx.fillStyle = c.sub;
    ctx.font = `400 ${12 * dpr}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(caption), sidePad, H - bottomPad * 0.5);
  }

  ctx.save();
  ctx.translate(offX, offY);
  ctx.scale(scale, scale);

  // edges dulu (di belakang node)
  ctx.lineWidth = 1.6;
  parsed.edges.forEach((e, i) => {
    const edge = g.edge(e.from, e.to, 'e' + i);
    if (!edge || !edge.points || edge.points.length < 2) return;
    const pts = edge.points;
    ctx.strokeStyle = c.edge;
    ctx.setLineDash(e.style === 'dashed' ? [6, 5] : []);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();
    ctx.setLineDash([]);
    // arrowhead
    const p2 = pts[pts.length - 1], p1 = pts[pts.length - 2];
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const a = 8;
    ctx.fillStyle = c.edge;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x - a * Math.cos(ang - 0.4), p2.y - a * Math.sin(ang - 0.4));
    ctx.lineTo(p2.x - a * Math.cos(ang + 0.4), p2.y - a * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
    // label
    if (e.label) {
      const mid = pts[Math.floor(pts.length / 2)];
      ctx.font = '12px sans-serif';
      const tw = ctx.measureText(e.label).width;
      ctx.fillStyle = c.labelBg;
      ctx.fillRect(mid.x - tw / 2 - 4, mid.y - 9, tw + 8, 18);
      ctx.fillStyle = c.edgeText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.label, mid.x, mid.y);
    }
  });

  // nodes
  ctx.font = FONT;
  let ni = 0;
  for (const [id, n] of sized) {
    const pos = g.node(id);
    if (!pos) { ni++; continue; }
    const ap = nodeAppearance(style, c, ni);
    const x = pos.x - n.w / 2, y = pos.y - n.h / 2;
    drawShape(ctx, n.shape, x, y, n.w, n.h);
    ctx.fillStyle = ap.fill;
    ctx.fill();
    if (ap.bw > 0) { ctx.lineWidth = ap.bw; ctx.strokeStyle = ap.border; ctx.stroke(); }
    // text
    ctx.fillStyle = ap.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = pos.y - ((n.lines.length - 1) * LINEH) / 2;
    n.lines.forEach((ln, k) => ctx.fillText(ln, pos.x, startY + k * LINEH));
    ni++;
  }
  ctx.restore();

  // branding (watermark + logo)
  let logoState = null;
  if (logo && logo.src) {
    try { logoState = { ...logo, image: await loadImage(Buffer.from(logo.src.split(',')[1], 'base64')) }; } catch {}
  }
  drawBranding(ctx, W, H, { watermark, logo: logoState });

  return canvas.toBuffer('image/png');
}

function drawShape(ctx, shape, x, y, w, h) {
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath();
  } else if (shape === 'circle') {
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  } else if (shape === 'stadium') {
    roundRect(ctx, x, y, w, h, h / 2);
  } else if (shape === 'round') {
    roundRect(ctx, x, y, w, h, 12);
  } else if (shape === 'hexagon') {
    const o = h * 0.28;
    ctx.moveTo(x + o, y); ctx.lineTo(x + w - o, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w - o, y + h); ctx.lineTo(x + o, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath();
  } else {
    roundRect(ctx, x, y, w, h, 5);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
