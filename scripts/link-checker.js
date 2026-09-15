(function (root, factory) {
  var core = root.SMCore;
  if (!core && typeof require !== 'undefined') {
    try { core = require('./core-utils.js'); } catch (e) { core = null; }
  }
  var api = factory(core);
  root.SMLinkChecker = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (SMCore) {
  'use strict';

  var DEFAULT_TIMEOUT_MS = 8000;
  var DEFAULT_CONCURRENCY = 6;
  var MAX_CONCURRENCY = 16;
  var DEFAULT_PER_HOST_MS = 300;
  var DEFAULT_CACHE_SIZE = 512;
  var HEAD_FALLBACK_STATUSES = { 400: 1, 403: 1, 405: 1, 406: 1, 501: 1 };
  var REDIRECT_STATUSES = { 301: 1, 302: 1, 303: 1, 307: 1, 308: 1 };

  var defaultCache = (SMCore && SMCore.createLruCache)
    ? SMCore.createLruCache(DEFAULT_CACHE_SIZE)
    : createFallbackCache(DEFAULT_CACHE_SIZE);
  var limiterByInterval = new Map();

  function createFallbackCache(limit) {
    var map = new Map();
    var max = Math.max(1, Number(limit) || 256);
    return {
      get: function (k) {
        if (!map.has(k)) return undefined;
        var v = map.get(k);
        map.delete(k); map.set(k, v);
        return v;
      },
      set: function (k, v) {
        if (map.has(k)) map.delete(k);
        map.set(k, v);
        if (map.size > max) map.delete(map.keys().next().value);
        return v;
      },
      has: function (k) { return map.has(k); },
      clear: function () { map.clear(); },
      get size() { return map.size; }
    };
  }

  function getSM() { return SMCore || {}; }

  function safe(u) {
    if (getSM().safeUrl) return getSM().safeUrl(u);
    if (!u || typeof u !== 'string' || !u.trim()) return null;
    try { return new URL(u.trim()); } catch (e) {
      try { return new URL('https://' + u.trim()); } catch (e2) { return null; }
    }
  }

  function norm(u) {
    if (getSM().normalizeUrl) return getSM().normalizeUrl(u);
    var p = safe(u);
    return p ? p.href.toLowerCase() : String(u || '').trim().toLowerCase();
  }

  function hostOf(u) {
    if (getSM().getHostname) return getSM().getHostname(u);
    var p = safe(u);
    return p ? p.hostname.toLowerCase() : '';
  }

  function doSleep(ms) {
    if (getSM().sleep) return getSM().sleep(ms);
    return new Promise(function (r) { setTimeout(r, Math.max(0, Number(ms) || 0)); });
  }

  function getLimiter(intervalMs) {
    var key = String(intervalMs);
    if (!limiterByInterval.has(key)) {
      var lim = (getSM().createRateLimiter)
        ? getSM().createRateLimiter({ intervalMs: intervalMs, maxPerInterval: 1 })
        : { acquire: function () { return Promise.resolve(); } };
      limiterByInterval.set(key, lim);
    }
    return limiterByInterval.get(key);
  }

  function resolveCache(cacheOpt) {
    if (cacheOpt === false || cacheOpt === null) return null;
    if (cacheOpt && typeof cacheOpt.get === 'function' && typeof cacheOpt.set === 'function') return cacheOpt;
    if (typeof cacheOpt === 'number') return createFallbackCache(cacheOpt);
    return defaultCache;
  }

  function classifyUrl(url) {
    if (url == null || typeof url !== 'string' || url.trim() === '') {
      return { kind: 'empty', protocol: '', host: '' };
    }
    var parsed = safe(url);
    if (!parsed) return { kind: 'invalid', protocol: '', host: '' };
    var protocol = String(parsed.protocol || '').toLowerCase();
    var host = String(parsed.hostname || '').toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return { kind: 'http', protocol: protocol, host: host };
    }
    return { kind: 'other', protocol: protocol, host: host };
  }

  function isAbortError(err) {
    return !!err && (err.name === 'AbortError' ||
      (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') ||
      /aborted|abort/i.test(String((err && err.message) || '')) && String((err && err.code) || '') !== 'ENOTFOUND');
  }

  function fetchWithTimeout(url, init, timeoutMs, outerSignal) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    var onOuterAbort = null;
    if (!ctrl) {
      return rootFetch()(url, init);
    }
    if (outerSignal) {
      if (outerSignal.aborted) ctrl.abort(outerSignal.reason || undefined);
      else {
        onOuterAbort = function () { ctrl.abort(outerSignal.reason || undefined); };
        try { outerSignal.addEventListener('abort', onOuterAbort, { once: true }); } catch (e) {}
      }
    }
    timer = setTimeout(function () { ctrl.abort(); }, Math.max(1, timeoutMs));
    var p = rootFetch()(url, Object.assign({}, init, { signal: ctrl.signal }));
    return p.then(function (res) {
      clearTimeout(timer);
      if (onOuterAbort && outerSignal) { try { outerSignal.removeEventListener('abort', onOuterAbort); } catch (e) {} }
      return res;
    }, function (err) {
      clearTimeout(timer);
      if (onOuterAbort && outerSignal) { try { outerSignal.removeEventListener('abort', onOuterAbort); } catch (e) {} }
      throw err;
    });
  }

  function rootFetch() {
    if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
      return globalThis.fetch.bind(globalThis);
    }
    if (typeof fetch === 'function') return fetch;
    throw new Error('fetch is not available');
  }

  function mapResponse(status, finalUrl, inputUrl) {
    var s = Number(status);
    var fu = finalUrl || inputUrl || null;
    if (s >= 200 && s < 300) return { httpStatus: s, finalUrl: fu, status: 'ok', reason: 'ok (' + s + ')' };
    if (s >= 300 && s < 400) {
      var rl = REDIRECT_STATUSES[s] ? 'redirect (' + s + ')' : 'redirect (' + s + ')';
      return { httpStatus: s, finalUrl: fu, status: 'redirect', reason: fu && fu !== inputUrl ? rl + ' -> ' + fu : rl };
    }
    if (s === 401 || s === 403 || s === 429) return { httpStatus: s, finalUrl: fu, status: 'blocked', reason: 'blocked (' + s + ')' };
    if (s === 404 || s === 410) return { httpStatus: s, finalUrl: fu, status: 'broken', reason: 'not found (' + s + ')' };
    if (s >= 500 && s < 600) return { httpStatus: s, finalUrl: fu, status: 'server_error', reason: 'server error (' + s + ')' };
    if (s >= 400 && s < 500) return { httpStatus: s, finalUrl: fu, status: 'broken', reason: 'client error (' + s + ')' };
    return { httpStatus: s, finalUrl: fu, status: 'broken', reason: 'unexpected status (' + s + ')' };
  }

  function jitterMs() { return 200 + Math.random() * 300; }

  async function probeHttp(urlString, opts) {
    var timeoutMs = opts.timeoutMs;
    var retries = opts.retries;
    var limiter = opts.limiter;
    var host = opts.host;
    var outerSignal = opts.signal;
    var start = Date.now();
    var attempts = 0;
    var method = 'HEAD';
    var res = null;

    async function doReq(m) {
      if (limiter) await limiter.acquire(host);
      attempts += 1;
      var init = { method: m, redirect: 'follow' };
      if (m === 'GET') init.headers = { Range: 'bytes=0-0' };
      return fetchWithTimeout(urlString, init, timeoutMs, outerSignal);
    }

    // HEAD first
    try {
      res = await doReq('HEAD');
    } catch (err) {
      if (isAbortError(err) || (outerSignal && outerSignal.aborted)) {
        return { httpStatus: null, finalUrl: null, status: 'timeout', reason: 'timeout after ' + timeoutMs + 'ms', attempts: attempts, elapsedMs: Date.now() - start };
      }
      // network error -> fallback GET
      try {
        res = await doReq('GET');
      } catch (err2) {
        if (isAbortError(err2)) {
          return { httpStatus: null, finalUrl: null, status: 'timeout', reason: 'timeout after ' + timeoutMs + 'ms', attempts: attempts, elapsedMs: Date.now() - start };
        }
        return { httpStatus: null, finalUrl: null, status: 'broken', reason: 'network error: ' + (err2 && err2.message ? err2.message : String(err2)), attempts: attempts, elapsedMs: Date.now() - start };
      }
      return finishWithRetries(res, 'GET');
    }

    var st = Number(res && res.status);
    if (HEAD_FALLBACK_STATUSES[st]) {
      try {
        var res2 = await doReq('GET');
        return finishWithRetries(res2, 'GET');
      } catch (err) {
        if (isAbortError(err)) {
          return { httpStatus: null, finalUrl: null, status: 'timeout', reason: 'timeout after ' + timeoutMs + 'ms', attempts: attempts, elapsedMs: Date.now() - start };
        }
        return { httpStatus: null, finalUrl: null, status: 'broken', reason: 'network error: ' + (err && err.message ? err.message : String(err)), attempts: attempts, elapsedMs: Date.now() - start };
      }
    }
    return finishWithRetries(res, 'HEAD');

    async function finishWithRetries(r, usedMethod) {
      var s = Number(r && r.status);
      var rUrl = (r && r.url) || urlString;
      // 5xx retry with jitter
      if (s >= 500 && s < 600 && retries > 0) {
        await doSleep(jitterMs());
        try {
          if (limiter) await limiter.acquire(host);
          attempts += 1;
          var init = { method: usedMethod, redirect: 'follow' };
          if (usedMethod === 'GET') init.headers = { Range: 'bytes=0-0' };
          var rr = await fetchWithTimeout(urlString, init, timeoutMs, outerSignal);
          var ss = Number(rr && rr.status);
          var uu = (rr && rr.url) || urlString;
          // redirected-but-followed detection
          if (ss >= 200 && ss < 300 && (rr.redirected || (uu && uu !== urlString))) {
            return { httpStatus: ss, finalUrl: uu, status: 'redirect', reason: 'redirected -> ' + uu, attempts: attempts, elapsedMs: Date.now() - start };
          }
          var m = mapResponse(ss, uu, urlString);
          m.attempts = attempts; m.elapsedMs = Date.now() - start;
          return m;
        } catch (err) {
          if (isAbortError(err)) {
            return { httpStatus: null, finalUrl: null, status: 'timeout', reason: 'timeout after ' + timeoutMs + 'ms', attempts: attempts, elapsedMs: Date.now() - start };
          }
          return { httpStatus: s, finalUrl: rUrl, status: 'server_error', reason: 'server error (' + s + '), retry failed: ' + (err && err.message ? err.message : String(err)), attempts: attempts, elapsedMs: Date.now() - start };
        }
      }
      if (s >= 200 && s < 300 && (r.redirected || (rUrl && rUrl !== urlString))) {
        return { httpStatus: s, finalUrl: rUrl, status: 'redirect', reason: 'redirected -> ' + rUrl, attempts: attempts, elapsedMs: Date.now() - start };
      }
      var mapped = mapResponse(s, rUrl, urlString);
      mapped.attempts = attempts;
      mapped.elapsedMs = Date.now() - start;
      return mapped;
    }
  }

  async function checkBookmark(bookmark, options) {
    var bm = bookmark || {};
    var id = bm.id != null ? String(bm.id) : '';
    var url = bm.url != null ? String(bm.url) : '';
    var title = bm.title != null ? String(bm.title) : '';
    var opts = options || {};
    var timeoutMs = opts.timeoutMs != null ? Math.max(1, Number(opts.timeoutMs) || DEFAULT_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
    var retries = opts.retries != null ? Math.max(0, Number(opts.retries) || 0) : 1;
    var perHostMs = opts.perHostIntervalMs != null ? Math.max(0, Number(opts.perHostIntervalMs) || 0) : DEFAULT_PER_HOST_MS;
    var cache = opts._cache || resolveCache(opts.cache);
    var limiter = opts._limiter || getLimiter(perHostMs);
    var start = Date.now();
    var checkedAt = new Date().toISOString();

    function base(extra) {
      return Object.assign({ id: id, url: url, title: title, httpStatus: null, finalUrl: null, elapsedMs: Date.now() - start, attempts: 0, checkedAt: checkedAt }, extra);
    }

    var cls;
    try { cls = classifyUrl(url); } catch (e) {
      return base({ status: 'invalid', reason: 'invalid url' });
    }
    if (cls.kind === 'empty') return base({ status: 'empty', reason: 'empty url' });
    if (cls.kind === 'invalid') return base({ status: 'invalid', reason: 'invalid url' });
    if (cls.kind !== 'http') return base({ status: 'unsupported', reason: 'unsupported protocol (' + (cls.protocol || 'unknown') + ')' });

    var cacheKey = null;
    try {
      cacheKey = norm(url);
      if (cache) {
        var hit = cache.get(cacheKey);
        if (hit) {
          return base({ status: hit.status, reason: hit.reason, httpStatus: hit.httpStatus, finalUrl: hit.finalUrl, attempts: 0 });
        }
      }
    } catch (e) { cacheKey = null; }

    if (opts.signal && opts.signal.aborted) {
      return base({ status: 'timeout', reason: 'aborted before request' });
    }

    try {
      var out = await probeHttp(url, { timeoutMs: timeoutMs, retries: retries, limiter: limiter, host: cls.host || hostOf(url), signal: opts.signal });
      var result = base({ status: out.status, reason: out.reason, httpStatus: out.httpStatus, finalUrl: out.finalUrl, attempts: out.attempts, elapsedMs: out.elapsedMs });
      if (cache && cacheKey) {
        try { cache.set(cacheKey, { status: result.status, reason: result.reason, httpStatus: result.httpStatus, finalUrl: result.finalUrl }); } catch (e) {}
      }
      return result;
    } catch (err) {
      if (isAbortError(err)) return base({ status: 'timeout', reason: 'timeout after ' + timeoutMs + 'ms' });
      return base({ status: 'broken', reason: 'probe failed: ' + (err && err.message ? err.message : String(err)) });
    }
  }

  async function scan(bookmarks, options) {
    var start = Date.now();
    var opts = options || {};
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var timeoutMs = opts.timeoutMs != null ? Math.max(1, Number(opts.timeoutMs) || DEFAULT_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
    var retries = opts.retries != null ? Math.max(0, Number(opts.retries) || 0) : 1;
    var perHostMs = opts.perHostIntervalMs != null ? Math.max(0, Number(opts.perHostIntervalMs) || 0) : DEFAULT_PER_HOST_MS;
    var conc = Math.max(1, Math.min(Number(opts.concurrency) || DEFAULT_CONCURRENCY, MAX_CONCURRENCY));
    var cache = resolveCache(opts.cache);
    var limiter = getLimiter(perHostMs);
    var shared = { timeoutMs: timeoutMs, retries: retries, perHostIntervalMs: perHostMs, signal: opts.signal, _cache: cache, _limiter: limiter };

    var results = new Array(list.length);
    var groups = new Map(); // normKey -> { url, indices: [] }
    var directCount = 0;

    for (var i = 0; i < list.length; i++) {
      var bm = list[i] || {};
      var raw = bm.url != null ? String(bm.url) : '';
      var cls;
      try { cls = classifyUrl(raw); } catch (e) { cls = { kind: 'invalid', protocol: '', host: '' }; }
      if (cls.kind !== 'http') {
        var checkedAt = new Date().toISOString();
        var st = cls.kind === 'empty' ? 'empty' : cls.kind === 'invalid' ? 'invalid' : 'unsupported';
        var reason = st === 'empty' ? 'empty url' : st === 'invalid' ? 'invalid url' : 'unsupported protocol (' + (cls.protocol || 'unknown') + ')';
        results[i] = { id: bm.id != null ? String(bm.id) : String(i), url: raw, title: bm.title != null ? String(bm.title) : '', status: st, reason: reason, httpStatus: null, finalUrl: null, elapsedMs: 0, attempts: 0, checkedAt: checkedAt };
        directCount += 1;
        if (typeof opts.onProgress === 'function') { try { opts.onProgress(directCount, list.length); } catch (e) {} }
      } else {
        var key;
        try { key = norm(raw); } catch (e) { key = raw.trim().toLowerCase(); }
        if (!groups.has(key)) groups.set(key, { url: raw, indices: [] });
        groups.get(key).indices.push(i);
      }
    }

    var uniques = Array.from(groups.entries());
    var done = directCount;
    function report() {
      done += 1;
      if (typeof opts.onProgress === 'function') { try { opts.onProgress(Math.min(done, list.length), list.length); } catch (e) {} }
    }

    async function worker(entry) {
      var key = entry[0];
      var g = entry[1];
      var rep = g.indices[0] != null ? list[g.indices[0]] : {};
      var probed;
      // cache fast-path: checkBookmark handles cache internally
      try {
        probed = await checkBookmark({ id: rep && rep.id != null ? rep.id : '', url: g.url, title: rep && rep.title != null ? rep.title : '' }, shared);
      } catch (err) {
        probed = { id: '', url: g.url, title: '', status: 'broken', reason: 'probe failed: ' + (err && err.message ? err.message : String(err)), httpStatus: null, finalUrl: null, elapsedMs: 0, attempts: 0, checkedAt: new Date().toISOString() };
      }
      for (var k = 0; k < g.indices.length; k++) {
        var idx = g.indices[k];
        var obm = list[idx] || {};
        results[idx] = {
          id: obm.id != null ? String(obm.id) : String(idx),
          url: obm.url != null ? String(obm.url) : '',
          title: obm.title != null ? String(obm.title) : '',
          status: probed.status,
          reason: probed.reason,
          httpStatus: probed.httpStatus,
          finalUrl: probed.finalUrl,
          elapsedMs: probed.elapsedMs,
          attempts: probed.attempts,
          checkedAt: probed.checkedAt
        };
        report();
      }
      return true;
    }

    try {
      if (getSM().runPool) {
        await getSM().runPool(uniques, worker, { limit: conc });
      } else {
        var cursor = 0;
        async function drain() {
          while (cursor < uniques.length) {
            var e = uniques[cursor++];
            await worker(e);
          }
        }
        var n = Math.min(conc, Math.max(1, uniques.length));
        var ps = [];
        for (var w = 0; w < n; w++) ps.push(drain());
        await Promise.all(ps);
      }
    } catch (e) {
      // never reject because of pool failure; fill gaps
      for (var j = 0; j < results.length; j++) {
        if (!results[j]) {
          var fb = list[j] || {};
          results[j] = { id: fb.id != null ? String(fb.id) : String(j), url: fb.url != null ? String(fb.url) : '', title: fb.title != null ? String(fb.title) : '', status: 'broken', reason: 'scan failed: ' + (e && e.message ? e.message : String(e)), httpStatus: null, finalUrl: null, elapsedMs: 0, attempts: 0, checkedAt: new Date().toISOString() };
        }
      }
    }

    var summary = { total: list.length, ok: 0, redirect: 0, broken: 0, server_error: 0, blocked: 0, timeout: 0, invalid: 0, empty: 0, unsupported: 0 };
    for (var s = 0; s < results.length; s++) {
      var r = results[s];
      if (r && summary[r.status] != null && r.status !== 'total') summary[r.status] += 1;
    }
    var skipped = summary.empty + summary.invalid + summary.unsupported;
    return { results: results, summary: summary, skipped: skipped, elapsedMs: Date.now() - start };
  }

  return { classifyUrl: classifyUrl, checkBookmark: checkBookmark, scan: scan };
});
