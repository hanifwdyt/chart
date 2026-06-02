// Preset config tiap jenis chart — dipakai gallery, playground default, & dokumentasi.

const PALETTE = ['#6366f1', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export const PRESETS = {
  bar: {
    label: 'Bar',
    desc: 'Bandingin nilai antar kategori.',
    config: {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        datasets: [{ label: 'Penjualan', data: [12, 19, 8, 15, 22, 17], backgroundColor: PALETTE[0] }],
      },
      options: { plugins: { title: { display: true, text: 'Penjualan per Bulan' } } },
    },
  },
  line: {
    label: 'Line',
    desc: 'Tren data sepanjang waktu.',
    config: {
      type: 'line',
      data: {
        labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        datasets: [
          { label: 'Visitor', data: [120, 190, 170, 220, 280, 310, 250], borderColor: PALETTE[0], backgroundColor: PALETTE[0], tension: 0.35 },
          { label: 'Signup', data: [30, 45, 40, 60, 75, 90, 70], borderColor: PALETTE[1], backgroundColor: PALETTE[1], tension: 0.35 },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Traffic Mingguan' } } },
    },
  },
  area: {
    label: 'Area',
    desc: 'Line dengan fill — volume kumulatif.',
    config: {
      type: 'area',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{ label: 'Revenue', data: [45, 62, 58, 81], borderColor: PALETTE[4], backgroundColor: 'rgba(16,185,129,0.25)', tension: 0.3 }],
      },
      options: { plugins: { title: { display: true, text: 'Revenue per Kuartal' } } },
    },
  },
  horizontalBar: {
    label: 'Horizontal Bar',
    desc: 'Bar mendatar — enak buat label panjang.',
    config: {
      type: 'horizontalBar',
      data: {
        labels: ['Indonesia', 'Malaysia', 'Singapura', 'Thailand', 'Vietnam'],
        datasets: [{ label: 'Pengguna (juta)', data: [180, 28, 5, 42, 70], backgroundColor: PALETTE.slice(0, 5) }],
      },
      options: { plugins: { title: { display: true, text: 'Pengguna per Negara' } } },
    },
  },
  stackedBar: {
    label: 'Stacked Bar',
    desc: 'Komposisi bertumpuk per kategori.',
    config: {
      type: 'stackedBar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [
          { label: 'Produk A', data: [12, 19, 8, 15], backgroundColor: PALETTE[0] },
          { label: 'Produk B', data: [8, 11, 14, 9], backgroundColor: PALETTE[1] },
          { label: 'Produk C', data: [5, 7, 6, 12], backgroundColor: PALETTE[3] },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Penjualan per Produk' } } },
    },
  },
  pie: {
    label: 'Pie',
    desc: 'Proporsi bagian dari keseluruhan.',
    config: {
      type: 'pie',
      data: {
        labels: ['Mobile', 'Desktop', 'Tablet'],
        datasets: [{ data: [62, 30, 8], backgroundColor: PALETTE.slice(0, 3) }],
      },
      options: { plugins: { title: { display: true, text: 'Trafik per Device' } } },
    },
  },
  doughnut: {
    label: 'Doughnut',
    desc: 'Pie dengan lubang tengah.',
    config: {
      type: 'doughnut',
      data: {
        labels: ['Selesai', 'Proses', 'Pending'],
        datasets: [{ data: [70, 20, 10], backgroundColor: [PALETTE[4], PALETTE[3], PALETTE[2]] }],
      },
      options: { plugins: { title: { display: true, text: 'Status Task' } } },
    },
  },
  polarArea: {
    label: 'Polar Area',
    desc: 'Radial — nilai dengan radius berbeda.',
    config: {
      type: 'polarArea',
      data: {
        labels: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency'],
        datasets: [{ data: [11, 16, 7, 14, 9], backgroundColor: PALETTE.map((c) => c + 'cc') }],
      },
      options: { plugins: { title: { display: true, text: 'Skor Performa' } } },
    },
  },
  radar: {
    label: 'Radar',
    desc: 'Banding beberapa metrik multi-axis.',
    config: {
      type: 'radar',
      data: {
        labels: ['HTML', 'CSS', 'JS', 'React', 'Node', 'SQL'],
        datasets: [
          { label: 'Andi', data: [90, 85, 80, 75, 70, 65], borderColor: PALETTE[0], backgroundColor: 'rgba(99,102,241,0.2)' },
          { label: 'Budi', data: [70, 75, 90, 85, 88, 60], borderColor: PALETTE[2], backgroundColor: 'rgba(244,63,94,0.2)' },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Skill Assessment' } } },
    },
  },
  scatter: {
    label: 'Scatter',
    desc: 'Sebaran titik X-Y, korelasi.',
    config: {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Tinggi vs Berat',
          data: [{ x: 160, y: 55 }, { x: 165, y: 60 }, { x: 170, y: 68 }, { x: 175, y: 72 }, { x: 180, y: 80 }, { x: 185, y: 88 }],
          backgroundColor: PALETTE[5],
        }],
      },
      options: { plugins: { title: { display: true, text: 'Korelasi Tinggi-Berat' } } },
    },
  },
  bubble: {
    label: 'Bubble',
    desc: 'Scatter dengan dimensi ukuran (r).',
    config: {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Produk',
          data: [{ x: 20, y: 30, r: 15 }, { x: 40, y: 10, r: 10 }, { x: 30, y: 50, r: 25 }, { x: 60, y: 35, r: 18 }],
          backgroundColor: 'rgba(6,182,212,0.6)',
        }],
      },
      options: { plugins: { title: { display: true, text: 'Harga vs Penjualan vs Margin' } } },
    },
  },
  mixed: {
    label: 'Mixed',
    desc: 'Gabung bar + line dalam satu chart.',
    config: {
      type: 'mixed',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei'],
        datasets: [
          { type: 'bar', label: 'Revenue', data: [40, 55, 48, 70, 62], backgroundColor: PALETTE[0] },
          { type: 'line', label: 'Target', data: [50, 50, 60, 60, 70], borderColor: PALETTE[2], tension: 0.3 },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Revenue vs Target' } } },
    },
  },
};

export const PRESET_ORDER = [
  'bar', 'line', 'area', 'horizontalBar', 'stackedBar',
  'pie', 'doughnut', 'polarArea', 'radar', 'scatter', 'bubble', 'mixed',
];
