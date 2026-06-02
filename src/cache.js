import { createHash } from 'crypto';

/**
 * LRU cache sederhana berbasis Map (insertion order = recency order).
 * O(1) get/set, eviction O(1). Dipakai nyimpen buffer image hasil render
 * supaya request identik (mis. <img src> yang sama di-embed di banyak tempat)
 * ga di-render ulang.
 */
export class LRUCache {
  constructor(maxEntries = 200) {
    this.max = maxEntries;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val); // refresh recency
    return val;
  }

  set(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.max) {
      this.map.delete(this.map.keys().next().value); // buang yang paling lama
    }
  }

  get size() {
    return this.map.size;
  }
}

/** Hash deterministik dari opts render -> cache key. */
export function cacheKey(opts) {
  return createHash('sha1').update(JSON.stringify(opts)).digest('hex');
}

/**
 * Concurrency limiter: maksimal N tugas berjalan bersamaan, sisanya antri.
 * Render itu CPU-bound & sinkron, jadi ini ngebatesin berapa render berat
 * yang nge-block event loop sekaligus + jadi backpressure anti-flood.
 */
export function createLimiter(maxConcurrent = 4) {
  let active = 0;
  const queue = [];

  const drain = () => {
    if (active >= maxConcurrent || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active--;
        drain();
      });
  };

  const run = (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      drain();
    });

  run.stats = () => ({ active, queued: queue.length });
  return run;
}
