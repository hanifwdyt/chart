# node:20-slim (debian glibc) — @napi-rs/canvas butuh glibc, bukan musl.
FROM node:20-slim

WORKDIR /app

# Font dasar biar teks chart ga kotak-kotak (sans-serif fallback).
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

# Install deps deterministik dari lockfile dulu (layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/livez').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
