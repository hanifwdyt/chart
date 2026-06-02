// Branding plugin: watermark teks (default chart.hanif.app atau custom) +
// optional logo image overlay. Dipakai B2B media yang mau branding sendiri.

const DEFAULT_TEXT = 'chart.hanif.app';

function pos(position, w, h, pad, bw, bh) {
  const map = {
    'top-left': [pad, pad, 'left', 'top'],
    'top-right': [w - pad, pad, 'right', 'top'],
    'bottom-left': [pad, h - pad, 'left', 'bottom'],
    'bottom-right': [w - pad, h - pad, 'right', 'bottom'],
    'top-center': [w / 2, pad, 'center', 'top'],
    'bottom-center': [w / 2, h - pad, 'center', 'bottom'],
    center: [w / 2, h / 2, 'center', 'middle'],
  };
  return map[position] || map['bottom-right'];
}

// Hitung koordinat kiri-atas untuk gambar logo sesuai posisi.
function logoXY(position, w, h, pad, dw, dh) {
  const right = w - pad - dw, bottom = h - pad - dh, cx = (w - dw) / 2, cy = (h - dh) / 2;
  const map = {
    'top-left': [pad, pad], 'top-right': [right, pad],
    'bottom-left': [pad, bottom], 'bottom-right': [right, bottom],
    'top-center': [cx, pad], 'bottom-center': [cx, bottom], center: [cx, cy],
  };
  return map[position] || map['top-right'];
}

/**
 * @param {object} opts
 * @param {object|null} opts.watermark  { text, position, color, opacity, size } | null (disabled)
 * @param {object|null} opts.logo       { image, position, height, opacity } | null
 */
// Gambar watermark + logo langsung ke ctx — dipakai plugin Chart.js & flowchart.
export function drawBranding(ctx, width, height, { watermark, logo } = {}) {
  {
      // --- watermark text (kecil & subtle — profesional, ga numpuk) ---
      if (watermark) {
        const text = watermark.text || DEFAULT_TEXT;
        // ukuran kecil & dibatasi (ga membesar di canvas gede)
        const fontSize = watermark.size || Math.max(10, Math.min(13, Math.round(Math.min(width, height) * 0.022)));
        const opacity = watermark.opacity != null ? watermark.opacity : (watermark.color ? 0.5 : 0.26);
        const [x, y, align, baseline] = pos(watermark.position || 'bottom-right', width, height, Math.round(fontSize * 1.1));
        ctx.save();
        ctx.font = `500 ${fontSize}px sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = baseline === 'middle' ? 'middle' : baseline;
        ctx.fillStyle = watermark.color || '#0f172a';
        ctx.globalAlpha = opacity;
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      // --- logo image ---
      if (logo && logo.image) {
        const img = logo.image;
        const targetH = logo.height || Math.max(24, Math.round(height * 0.08));
        const ratio = img.width && img.height ? img.width / img.height : 1;
        const dh = targetH;
        const dw = Math.round(targetH * ratio);
        const pad = logo.margin != null ? logo.margin : Math.round(targetH * 0.4);
        const [lx, ly] = logoXY(logo.position || 'top-right', width, height, pad, dw, dh);
        ctx.save();
        ctx.globalAlpha = logo.opacity != null ? logo.opacity : 1;
        try { ctx.drawImage(img, lx, ly, dw, dh); } catch {}
        ctx.restore();
      }
  }
}

// Plugin Chart.js (afterDraw) yang mendelegasikan ke drawBranding.
export function brandingPlugin({ watermark, logo } = {}) {
  return {
    id: 'hanifBranding',
    afterDraw(chart) {
      drawBranding(chart.ctx, chart.width, chart.height, { watermark, logo });
    },
  };
}

export { DEFAULT_TEXT };
