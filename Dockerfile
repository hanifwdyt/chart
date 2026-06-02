# node:20-slim (debian glibc) — @napi-rs/canvas butuh glibc, bukan musl.
FROM node:20-slim

WORKDIR /app

# Font dasar biar teks chart ga kotak-kotak (sans-serif fallback).
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
