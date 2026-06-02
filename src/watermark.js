const WATERMARK_TEXT = 'chart.hanif.app';

/**
 * Plugin Chart.js buat nempelin watermark domain di pojok kanan bawah.
 * Subtle tapi tetep kebaca — branding chart.hanif.app.
 */
export function watermarkPlugin({ enabled = true, devicePixelRatio = 1 } = {}) {
  return {
    id: 'hanifWatermark',
    afterDraw(chart) {
      if (!enabled) return;
      const { ctx } = chart;
      const { width, height } = chart;

      ctx.save();
      const fontSize = Math.max(10, Math.round(width * 0.018));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const pad = Math.round(fontSize * 0.8);
      const x = width - pad;
      const y = height - pad;

      // Soft shadow biar kebaca di background apapun
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(WATERMARK_TEXT, x + 0.5, y + 0.5);
      ctx.fillStyle = 'rgba(15,23,42,0.32)';
      ctx.fillText(WATERMARK_TEXT, x, y);
      ctx.restore();
    },
  };
}

export { WATERMARK_TEXT };
