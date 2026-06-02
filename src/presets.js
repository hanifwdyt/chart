// Preset config for each chart type — used by gallery, playground defaults & docs.

const PALETTE = ['#6366f1', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export const PRESETS = {
  bar: {
    label: 'Bar',
    desc: 'Compare values across categories.',
    config: {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ label: 'Sales', data: [12, 19, 8, 15, 22, 17], backgroundColor: PALETTE[0] }],
      },
      options: { plugins: { title: { display: true, text: 'Monthly Sales' } } },
    },
  },
  line: {
    label: 'Line',
    desc: 'Trends over time.',
    config: {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          { label: 'Visitors', data: [120, 190, 170, 220, 280, 310, 250], borderColor: PALETTE[0], backgroundColor: PALETTE[0], tension: 0.35 },
          { label: 'Signups', data: [30, 45, 40, 60, 75, 90, 70], borderColor: PALETTE[1], backgroundColor: PALETTE[1], tension: 0.35 },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Weekly Traffic' } } },
    },
  },
  area: {
    label: 'Area',
    desc: 'Line with fill — cumulative volume.',
    config: {
      type: 'area',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{ label: 'Revenue', data: [45, 62, 58, 81], borderColor: PALETTE[4], backgroundColor: 'rgba(16,185,129,0.25)', tension: 0.3 }],
      },
      options: { plugins: { title: { display: true, text: 'Revenue per Quarter' } } },
    },
  },
  horizontalBar: {
    label: 'Horizontal Bar',
    desc: 'Bars on their side — great for long labels.',
    config: {
      type: 'horizontalBar',
      data: {
        labels: ['Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam'],
        datasets: [{ label: 'Users (millions)', data: [180, 28, 5, 42, 70], backgroundColor: PALETTE.slice(0, 5) }],
      },
      options: { plugins: { title: { display: true, text: 'Users by Country' } } },
    },
  },
  stackedBar: {
    label: 'Stacked Bar',
    desc: 'Stacked composition per category.',
    config: {
      type: 'stackedBar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [
          { label: 'Product A', data: [12, 19, 8, 15], backgroundColor: PALETTE[0] },
          { label: 'Product B', data: [8, 11, 14, 9], backgroundColor: PALETTE[1] },
          { label: 'Product C', data: [5, 7, 6, 12], backgroundColor: PALETTE[3] },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Sales by Product' } } },
    },
  },
  pie: {
    label: 'Pie',
    desc: 'Parts of a whole.',
    config: {
      type: 'pie',
      data: {
        labels: ['Mobile', 'Desktop', 'Tablet'],
        datasets: [{ data: [62, 30, 8], backgroundColor: PALETTE.slice(0, 3) }],
      },
      options: { plugins: { title: { display: true, text: 'Traffic by Device' } } },
    },
  },
  doughnut: {
    label: 'Doughnut',
    desc: 'A pie with a hole in the middle.',
    config: {
      type: 'doughnut',
      data: {
        labels: ['Done', 'Doing', 'Pending'],
        datasets: [{ data: [70, 20, 10], backgroundColor: [PALETTE[4], PALETTE[3], PALETTE[2]] }],
      },
      options: { plugins: { title: { display: true, text: 'Task Status' } } },
    },
  },
  polarArea: {
    label: 'Polar Area',
    desc: 'Radial — values as varying radii.',
    config: {
      type: 'polarArea',
      data: {
        labels: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency'],
        datasets: [{ data: [11, 16, 7, 14, 9], backgroundColor: PALETTE.map((c) => c + 'cc') }],
      },
      options: { plugins: { title: { display: true, text: 'Performance Score' } } },
    },
  },
  radar: {
    label: 'Radar',
    desc: 'Compare metrics across many axes.',
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
    desc: 'X–Y point cloud, correlation.',
    config: {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Height vs Weight',
          data: [{ x: 160, y: 55 }, { x: 165, y: 60 }, { x: 170, y: 68 }, { x: 175, y: 72 }, { x: 180, y: 80 }, { x: 185, y: 88 }],
          backgroundColor: PALETTE[5],
        }],
      },
      options: { plugins: { title: { display: true, text: 'Height–Weight Correlation' } } },
    },
  },
  bubble: {
    label: 'Bubble',
    desc: 'Scatter with a size dimension (r).',
    config: {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Products',
          data: [{ x: 20, y: 30, r: 15 }, { x: 40, y: 10, r: 10 }, { x: 30, y: 50, r: 25 }, { x: 60, y: 35, r: 18 }],
          backgroundColor: 'rgba(6,182,212,0.6)',
        }],
      },
      options: { plugins: { title: { display: true, text: 'Price vs Sales vs Margin' } } },
    },
  },
  mixed: {
    label: 'Mixed',
    desc: 'Combine bar + line in one chart.',
    config: {
      type: 'mixed',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [
          { type: 'bar', label: 'Revenue', data: [40, 55, 48, 70, 62], backgroundColor: PALETTE[0] },
          { type: 'line', label: 'Target', data: [50, 50, 60, 60, 70], borderColor: PALETTE[2], tension: 0.3 },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Revenue vs Target' } } },
    },
  },
  stackedArea: {
    label: 'Stacked Area',
    desc: 'Filled areas stacked into a total.',
    config: {
      type: 'stackedArea',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          { label: 'Organic', data: [20, 30, 28, 40, 45, 52] },
          { label: 'Paid', data: [10, 14, 18, 16, 22, 26] },
          { label: 'Referral', data: [5, 8, 7, 12, 14, 18] },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Acquisition Channels' } } },
    },
  },
  steppedLine: {
    label: 'Stepped Line',
    desc: 'Step transitions instead of slopes.',
    config: {
      type: 'steppedLine',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [{ label: 'Active pods', data: [2, 2, 5, 8, 6, 3] }],
      },
      options: { plugins: { title: { display: true, text: 'Autoscaling Steps' } } },
    },
  },
  sparkline: {
    label: 'Sparkline',
    desc: 'Minimal inline trend, no axes.',
    config: {
      type: 'sparkline',
      data: { labels: Array.from({ length: 14 }, (_, i) => i + 1), datasets: [{ data: [4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15, 19] }] },
    },
  },
  gauge: {
    label: 'Gauge',
    desc: 'Half-circle gauge for a single KPI.',
    config: {
      type: 'gauge',
      data: { labels: ['Used', 'Free'], datasets: [{ data: [68, 32], backgroundColor: [PALETTE[0], '#e5e7eb'] }] },
      options: { plugins: { title: { display: true, text: 'Disk Usage · 68%' } } },
    },
  },
  progressRing: {
    label: 'Progress Ring',
    desc: 'Full ring for completion / progress.',
    config: {
      type: 'progressRing',
      data: { labels: ['Done', 'Left'], datasets: [{ data: [82, 18], backgroundColor: [PALETTE[4], '#e5e7eb'] }] },
      options: { plugins: { title: { display: true, text: 'Goal · 82%' } } },
    },
  },
  multiAxis: {
    label: 'Multi-Axis',
    desc: 'Two y-axes for different units.',
    config: {
      type: 'multiAxis',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [
          { label: 'Revenue ($k)', data: [40, 55, 48, 70, 62], yAxisID: 'y', borderColor: PALETTE[0] },
          { label: 'Conversion (%)', data: [2.1, 2.8, 2.5, 3.4, 3.0], yAxisID: 'y1', borderColor: PALETTE[2] },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Revenue vs Conversion' } } },
    },
  },
};

export const PRESET_ORDER = [
  'bar', 'line', 'area', 'stackedArea', 'horizontalBar', 'stackedBar',
  'pie', 'doughnut', 'gauge', 'progressRing', 'polarArea', 'radar',
  'scatter', 'bubble', 'sparkline', 'steppedLine', 'multiAxis', 'mixed',
];
