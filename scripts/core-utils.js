/**
 * SmartMarkr core utilities (no browser APIs, no dependencies).
 *
 * Exposed as `globalThis.SMCore` in the extension context and as a CommonJS
 * module for Node-based unit tests.
 */
(function (root, factory) {
  const api = factory();
  root.SMCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_name', 'utm_reader', 'utm_referrer', 'gclid', 'fbclid',
    'msclkid', 'yclid', 'dclid', 'igshid', 'mc_cid', 'mc_eid', 'spm',
    'scm', 'share_source', 'share_medium', 'from_source', 'from', 'ref',
    'referer', 'referrer', 'source', 'src', 's_kwcid', 'trk', 'si'
  ]);

  // Common multi-label public suffixes. Keeps base-domain inference accurate
  // enough without shipping the full PSL.
  const MULTI_SUFFIXES = new Set([
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
    'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'ac.uk', 'gov.uk',
    'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'co.nz', 'net.nz', 'org.nz', 'govt.nz',
    'com.tw', 'org.tw', 'net.tw', 'edu.tw', 'gov.tw',
    'com.hk', 'org.hk', 'net.hk', 'edu.hk', 'gov.hk',
    'com.sg', 'org.sg', 'net.sg', 'edu.sg', 'gov.sg',
    'co.kr', 'or.kr', 'ne.kr', 'go.kr', 're.kr',
    'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.ru',
    'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in',
    'co.za', 'co.il', 'com.my', 'com.ph', 'com.vn', 'com.pk'
  ]);

  const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with',
    'is', 'are', 'was', 'be', 'by', 'at', 'from', 'as', 'it', 'this',
    'that', 'your', 'you', 'we', 'our', 'us', 'how', 'what', 'why', 'best',
    'guide', 'tutorial', 'official', 'home', 'homepage', 'index', 'www',
    'com', 'http', 'https', 'html', 'page', 'site', '网站', '首页', '官网',
    '教程', '指南', '下载', '免费', '在线'
  ]);

  function safeUrl(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      return new URL(trimmed);
    } catch {
      try {
        return new URL('https://' + trimmed);
      } catch {
        return null;
      }
    }
  }

  /**
   * Canonical form used for exact-duplicate matching.
   * Drops fragments, tracking params and default ports, sorts query keys and
   * normalises case so `HTTP://Example.com/a/?utm_source=x#top` and
   * `https://example.com/a` collapse to the same key.
   */
  function normalizeUrl(input, options) {
    const opts = options || {};
    const parsed = safeUrl(input);
    if (!parsed) return (input || '').trim().toLowerCase();

    const protocol = (parsed.protocol || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return parsed.href.toLowerCase();
    }

    const keepParams = opts.keepParams || null;
    const params = [];
    parsed.searchParams.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!opts.keepTracking && TRACKING_PARAMS.has(lower) && !(keepParams && keepParams.has(lower))) return;
      params.push([lower, value]);
    });
    params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    let host = parsed.hostname.toLowerCase();
    if (parsed.port && !((protocol === 'http:' && parsed.port === '80') || (protocol === 'https:' && parsed.port === '443'))) {
      host += ':' + parsed.port;
    }

    let pathname = parsed.pathname || '/';
    if (pathname.length > 1 && pathname.endsWith('/') && !opts.keepTrailingSlash) {
      pathname = pathname.replace(/\/+$/, '') || '/';
    }

    const query = params.map(([k, v]) => (v === '' ? k : k + '=' + v)).join('&');
    return protocol + '//' + host + pathname + (query ? '?' + query : '');
  }

  /** Hostname without `www.` prefix. */
  function getHostname(input, stripWww) {
    const parsed = safeUrl(input);
    if (!parsed) return '';
    let host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (stripWww !== false && host.startsWith('www.')) host = host.slice(4);
    return host;
  }

  /** Registrable domain, e.g. `news.bbc.co.uk` -> `bbc.co.uk`. */
  function getBaseDomain(input) {
    const host = getHostname(input, false);
    if (!host || /^\d+(\.\d+){3}$/.test(host)) return host;
    const parts = host.split('.').filter(Boolean);
    if (parts.length <= 2) return host;
    const lastTwo = parts.slice(-2).join('.');
    if (MULTI_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }

  /** FNV-1a 32-bit hash, stable across sessions, used for cheap bucketing. */
  function hashString(input) {
    let text = String(input == null ? '' : input);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  /** Stable short key for grouping, e.g. `a1b2c3d4`. */
  function shortHash(input) {
    return ('00000000' + hashString(input).toString(16)).slice(-8);
  }

  function isCjk(char) {
    const code = char.codePointAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
  }

  /**
   * Title tokeniser: Latin words (len >= 2) plus CJK bigrams.
   * Returns a de-duplicated array of tokens.
   */
  function tokenizeTitle(title) {
    const text = String(title == null ? '' : title).toLowerCase();
    if (!text) return [];
    const tokens = new Set();
    const latin = text.match(/[a-z0-9][a-z0-9+#._-]{1,}/g) || [];
    for (const word of latin) {
      const cleaned = word.replace(/[._-]+$/g, '');
      if (cleaned.length >= 2 && !STOPWORDS.has(cleaned)) tokens.add(cleaned);
    }
    const chars = Array.from(text);
    for (let i = 0; i < chars.length - 1; i++) {
      if (isCjk(chars[i]) && isCjk(chars[i + 1])) {
        const bigram = chars[i] + chars[i + 1];
        if (!STOPWORDS.has(bigram)) tokens.add(bigram);
      }
    }
    return Array.from(tokens);
  }

  function jaccardSimilarity(a, b) {
    const setA = a instanceof Set ? a : new Set(a || []);
    const setB = b instanceof Set ? b : new Set(b || []);
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;
    const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
    small.forEach((item) => { if (large.has(item)) intersection += 1; });
    return intersection / (setA.size + setB.size - intersection);
  }

  function diceCoefficient(a, b) {
    const s1 = String(a == null ? '' : a).toLowerCase().replace(/\s+/g, '');
    const s2 = String(b == null ? '' : b).toLowerCase().replace(/\s+/g, '');
    if (s1.length < 2 || s2.length < 2) return s1 === s2 && s1.length > 0 ? 1 : 0;
    const bigrams = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
      const gram = s1.slice(i, i + 2);
      bigrams.set(gram, (bigrams.get(gram) || 0) + 1);
    }
    let matches = 0;
    for (let j = 0; j < s2.length - 1; j++) {
      const gram = s2.slice(j, j + 2);
      const count = bigrams.get(gram) || 0;
      if (count > 0) {
        bigrams.set(gram, count - 1);
        matches += 1;
      }
    }
    return (2 * matches) / ((s1.length - 1) + (s2.length - 1));
  }

  /**
   * Bounded concurrency runner.
   * `worker(item, index)` may return a promise; results keep input order.
   */
  async function runPool(items, worker, options) {
    const list = Array.from(items || []);
    const opts = options || {};
    const limit = Math.max(1, Math.min(Number(opts.limit) || 4, list.length || 1));
    const results = new Array(list.length);
    let cursor = 0;
    const errors = [];

    async function drain() {
      while (cursor < list.length) {
        const index = cursor++;
        try {
          results[index] = await worker(list[index], index);
        } catch (error) {
          errors.push({ index, item: list[index], error });
          if (typeof opts.onError === 'function') opts.onError(error, list[index], index);
          results[index] = undefined;
        }
        if (typeof opts.onProgress === 'function') opts.onProgress(index + 1, list.length);
      }
    }

    await Promise.all(Array.from({ length: limit }, drain));
    return { results, errors };
  }

  /** Split an array into fixed-size chunks. */
  function chunk(items, size) {
    const list = Array.from(items || []);
    const step = Math.max(1, Number(size) || 1);
    const out = [];
    for (let i = 0; i < list.length; i += step) out.push(list.slice(i, i + step));
    return out;
  }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    const out = [];
    for (const item of items || []) {
      const key = keyFn(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function groupBy(items, keyFn) {
    const map = new Map();
    for (const item of items || []) {
      const key = keyFn(item);
      if (key == null) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }

  /** Simple LRU cache with bounded entries. */
  function createLruCache(maxEntries) {
    const limit = Math.max(1, Number(maxEntries) || 256);
    const map = new Map();
    return {
      get(key) {
        if (!map.has(key)) return undefined;
        const value = map.get(key);
        map.delete(key);
        map.set(key, value);
        return value;
      },
      set(key, value) {
        if (map.has(key)) map.delete(key);
        map.set(key, value);
        if (map.size > limit) map.delete(map.keys().next().value);
        return value;
      },
      has(key) { return map.has(key); },
      clear() { map.clear(); },
      get size() { return map.size; }
    };
  }

  /** Token-bucket rate limiter, one bucket per key (e.g. per host). */
  function createRateLimiter(options) {
    const opts = options || {};
    const intervalMs = Math.max(0, Number(opts.intervalMs) || 0);
    const maxPerInterval = Math.max(1, Number(opts.maxPerInterval) || 1);
    const buckets = new Map();

    async function acquire(key) {
      if (!intervalMs) return;
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket || now - bucket.start >= intervalMs) {
        bucket = { start: now, count: 0 };
        buckets.set(key, bucket);
      }
      if (bucket.count >= maxPerInterval) {
        const wait = intervalMs - (now - bucket.start);
        await new Promise((resolve) => setTimeout(resolve, Math.max(wait, 0)));
        bucket.start = Date.now();
        bucket.count = 0;
      }
      bucket.count += 1;
    }

    return { acquire, buckets };
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const context = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn.apply(context, args); }, wait);
    };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function formatDuration(ms) {
    const value = Math.max(0, Number(ms) || 0);
    if (value < 1000) return value + 'ms';
    const seconds = value / 1000;
    if (seconds < 60) return seconds.toFixed(1) + 's';
    const minutes = Math.floor(seconds / 60);
    return minutes + 'm' + Math.round(seconds % 60) + 's';
  }

  function toDateAdded(id) {
    const numeric = Number(id);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const date = new Date(numeric);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return {
    TRACKING_PARAMS,
    MULTI_SUFFIXES,
    safeUrl,
    normalizeUrl,
    getHostname,
    getBaseDomain,
    hashString,
    shortHash,
    tokenizeTitle,
    jaccardSimilarity,
    diceCoefficient,
    runPool,
    chunk,
    uniqueBy,
    groupBy,
    createLruCache,
    createRateLimiter,
    debounce,
    sleep,
    formatDuration,
    toDateAdded
  };
});
