# chart.hanif.app

Chart **image generation API**. Kirim data (config Chart.js) → terima image chart (PNG/JPEG/WebP). Di-render server-side, tiap image dikasih watermark `chart.hanif.app`.

Ada juga **website** dengan: landing page, live playground, gallery semua jenis chart, dan API docs lengkap.

## Stack
- **Express** — HTTP server & static frontend
- **Chart.js v4** — chart engine
- **@napi-rs/canvas** — render ke canvas headless (prebuilt binary, no native build)
- Frontend vanilla HTML/CSS/JS (no framework)

## Jalanin lokal
```bash
npm install
npm start          # default :3000
# atau dev (auto-reload)
npm run dev
```
Buka `http://localhost:3000`.

## API singkat

### POST `/api/v1/chart`
```bash
curl -X POST http://localhost:3000/api/v1/chart \
  -H "Content-Type: application/json" -o chart.png \
  -d '{"type":"bar","data":{"labels":["A","B","C"],"datasets":[{"data":[5,9,3]}]}}'
```

### GET `/api/v1/chart?c=<json|base64>`
Enak buat `<img src>`:
```html
<img src="http://localhost:3000/api/v1/chart?c=<encoded-json>&width=600" />
```

### Parameter
| Param | Default | Ket |
|---|---|---|
| `type` / `chart.type` | — | **wajib** |
| `data` / `chart.data` | — | **wajib** `{labels, datasets}` |
| `options` | `{}` | opsi Chart.js |
| `width` / `height` | 800 / 600 | px (50–3000) |
| `devicePixelRatio` | 2 | ketajaman (1–4) |
| `backgroundColor` | `#ffffff` | atau `transparent` |
| `format` | `png` | `png` `jpeg` `webp` |
| `watermark` | `true` | watermark domain |

### Jenis chart
`bar` `line` `area` `horizontalBar` `stackedBar` `pie` `doughnut` `polarArea` `radar` `scatter` `bubble` `mixed`

### Endpoint lain
- `GET /api/v1/types` — daftar type, format, preset
- `GET /api/v1/presets` — semua config preset
- `GET /api/v1/presets/:key` — config preset tertentu
- `GET /health` — health check

## Deploy (Docker)
```bash
docker build -t chart-hanif .
docker run -p 3000:3000 chart-hanif
```
Image pakai `node:20-slim` + font DejaVu (biar teks chart ga kotak-kotak).
