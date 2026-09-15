(function (root, factory) {
  var api = factory(root);
  root.SMAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function getCore() {
    try {
      if (root && root.SMCore) return root.SMCore;
    } catch (_) { /* ignore */ }
    if (typeof globalThis !== 'undefined' && globalThis.SMCore) return globalThis.SMCore;
    try {
      if (typeof require === 'function') return require('./core-utils.js');
    } catch (_) { /* ignore */ }
    return null;
  }

  var Core = getCore();

  function coreSleep(ms) {
    if (Core && typeof Core.sleep === 'function') return Core.sleep(ms);
    return new Promise(function (resolve) { setTimeout(resolve, Math.max(0, Number(ms) || 0)); });
  }

  function chunkLocal(items, size) {
    var list = Array.from(items || []);
    var step = Math.max(1, Number(size) || 1);
    var out = [];
    for (var i = 0; i < list.length; i += step) out.push(list.slice(i, i + step));
    return out;
  }

  function normalizeBaseUrl(baseUrl) {
    var s = String(baseUrl == null ? '' : baseUrl).trim();
    if (!s) throw new Error('ai-client: baseUrl is required');
    s = s.replace(/\/+$/, '');
    if (/\/v1$/i.test(s)) {
      return s.replace(/\/[Vv]1$/, '/v1');
    }
    return s + '/v1';
  }

  function pickTimeout(config, options) {
    var t = options && options.timeoutMs != null ? options.timeoutMs : config && config.timeoutMs;
    var n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return 60000;
    return Math.floor(n);
  }

  function pickRetries(options) {
    if (options && options.retries != null) {
      var n = Number(options.retries);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.floor(n);
    }
    return 2;
  }

  function buildHeaders(config, options) {
    var headers = { 'Content-Type': 'application/json' };
    if (config && config.apiKey) headers.Authorization = 'Bearer ' + config.apiKey;
    var extra = (config && config.extraHeaders) || {};
    var extra2 = (options && (options.extraHeaders || options.headers)) || {};
    [extra, extra2].forEach(function (src) {
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(function (k) {
        if (/authorization/i.test(k)) return;
        headers[k] = src[k];
      });
      if (src.Authorization || src.authorization) {
        // allow explicit override but never echo values into errors
        headers.Authorization = src.Authorization || src.authorization;
      }
    });
    // Re-assert config key without leaking it elsewhere
    if (config && config.apiKey) headers.Authorization = 'Bearer ' + config.apiKey;
    return headers;
  }

  function sanitizeMessage(msg) {
    return String(msg == null ? '' : msg);
  }

  function isRetryStatus(status) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  function backoffDelay(attempt) {
    var base = Math.min(5000, 400 * Math.pow(2, attempt));
    return base + Math.floor(Math.random() * 150);
  }

  async function readBodyTruncated(res) {
    try {
      var t = await res.text();
      t = String(t == null ? '' : t);
      return t.slice(0, 300);
    } catch (_) {
      return '';
    }
  }

  async function fetchWithRetry(url, init, opts) {
    var retries = pickRetries(opts);
    var timeoutMs = opts && opts.timeoutMs != null ? Number(opts.timeoutMs) : 60000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = 60000;
    var outerSignal = opts && opts.signal ? opts.signal : null;
    var lastError = null;

    for (var attempt = 0; attempt <= retries; attempt++) {
      if (outerSignal && outerSignal.aborted) {
        var abortErr = new Error('AI request aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = null;
      var onOuterAbort = null;
      var signal = outerSignal || null;
      if (controller) {
        signal = controller.signal;
        // Link outer signal
        if (outerSignal) {
          if (outerSignal.aborted) controller.abort();
          else {
            onOuterAbort = function () { try { controller.abort(); } catch (_) {} };
            try {
              if (typeof outerSignal.addEventListener === 'function') {
                outerSignal.addEventListener('abort', onOuterAbort, { once: true });
              }
            } catch (_) { /* ignore */ }
          }
        }
        timer = setTimeout(function () { try { controller.abort(); } catch (_) {} }, timeoutMs);
      }
      var reqInit = Object.assign({}, init);
      if (signal) reqInit.signal = signal;
      try {
        var fetchFn = (typeof globalThis !== 'undefined' && globalThis.fetch) || (typeof fetch !== 'undefined' ? fetch : null);
        if (!fetchFn) throw new Error('ai-client: fetch is not available');
        var res = await fetchFn(url, reqInit);
        if (timer) clearTimeout(timer);
        if (outerSignal && typeof outerSignal.removeEventListener === 'function' && onOuterAbort) {
          try { outerSignal.removeEventListener('abort', onOuterAbort); } catch (_) {}
        }
        if (res && res.ok) return res;
        var status = res ? res.status : 0;
        var body = await readBodyTruncated(res);
        var suffix = body ? (': ' + body) : '';
        if (status === 401 || status === 403) {
          throw new Error('AI request unauthorized (HTTP ' + status + ')' + suffix);
        }
        if (isRetryStatus(status) && attempt < retries) {
          lastError = new Error('AI request failed (HTTP ' + status + ')' + suffix);
          await coreSleep(backoffDelay(attempt));
          continue;
        }
        throw new Error('AI request failed (HTTP ' + status + ')' + suffix);
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (outerSignal && typeof outerSignal.removeEventListener === 'function' && onOuterAbort) {
          try { outerSignal.removeEventListener('abort', onOuterAbort); } catch (_) {}
        }
        var name = err && err.name;
        var msg = sanitizeMessage(err && err.message);
        // Outer abort: fail fast, no retry
        if (name === 'AbortError' && outerSignal && outerSignal.aborted) throw err;
        // Already-formatted HTTP errors: only retry if they were retryable and attempts remain.
        // fetchWithRetry above handles retry for HTTP statuses before throwing, so any
        // Error starting with 'AI request failed (HTTP' or 'unauthorized' should propagate,
        // except timeout-aborts which are retryable network errors.
        var isHttpError = /^AI request (failed|unauthorized)/.test(msg);
        var isTimeoutAbort = name === 'AbortError' && !(outerSignal && outerSignal.aborted);
        if (isHttpError && !isTimeoutAbort) throw err;
        lastError = err;
        if (attempt < retries) {
          // Timeout abort or network error -> retry
          await coreSleep(backoffDelay(attempt));
          continue;
        }
        if (isTimeoutAbort) {
          throw new Error('AI request timed out after ' + timeoutMs + 'ms');
        }
        throw err instanceof Error ? err : new Error(sanitizeMessage(err));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('AI request failed');
  }

  async function listModels(config, options) {
    var cfg = Object.assign({}, config || {});
    var opts = Object.assign({}, options || {});
    var base = normalizeBaseUrl(cfg.baseUrl);
    var timeoutMs = pickTimeout(cfg, opts);
    var headers = buildHeaders(cfg, opts);
    var res = await fetchWithRetry(base + '/models', { method: 'GET', headers: headers }, { retries: pickRetries(opts), timeoutMs: timeoutMs, signal: opts.signal });
    var body = null;
    try { body = await res.json(); } catch (_) { body = null; }
    var arr = null;
    if (Array.isArray(body)) arr = body;
    else if (body && Array.isArray(body.data)) arr = body.data;
    else if (body && Array.isArray(body.models)) arr = body.models;
    else arr = [];
    return arr.map(function (item) {
      if (typeof item === 'string') return item;
      if (item && typeof item.id === 'string') return item.id;
      if (item && typeof item.name === 'string') return item.name;
      return String(item);
    }).filter(Boolean);
  }

  function extractText(raw, fallbackModel) {
    void fallbackModel;
    if (!raw || typeof raw !== 'object') return '';
    var choices = raw.choices;
    if (Array.isArray(choices) && choices.length) {
      var first = choices[0] || {};
      if (first.message && typeof first.message.content === 'string') return first.message.content;
      if (typeof first.text === 'string') return first.text;
      if (Array.isArray(first.message && first.message.content)) {
        // content parts array
        return first.message.content.map(function (p) {
          if (typeof p === 'string') return p;
          if (p && typeof p.text === 'string') return p.text;
          return '';
        }).join('');
      }
    }
    if (typeof raw.content === 'string') return raw.content;
    if (typeof raw.text === 'string') return raw.text;
    return '';
  }

  async function chat(config, messages, options) {
    var cfg = Object.assign({}, config || {});
    var opts = Object.assign({}, options || {});
    if (!cfg.baseUrl) throw new Error('ai-client: config.baseUrl is required');
    if (!cfg.model && !opts.model) throw new Error('ai-client: config.model is required');
    var base = normalizeBaseUrl(cfg.baseUrl);
    var timeoutMs = pickTimeout(cfg, opts);
    var headers = buildHeaders(cfg, opts);
    var model = opts.model || cfg.model;
    var temperature = opts.temperature != null ? opts.temperature : cfg.temperature;
    var maxTokens = opts.maxTokens != null ? opts.maxTokens : (cfg.maxTokens != null ? cfg.maxTokens : opts.max_tokens);
    var body = { model: model, messages: messages };
    if (temperature != null) body.temperature = temperature;
    if (maxTokens != null) body.max_tokens = maxTokens;
    if (opts.response_format != null) body.response_format = opts.response_format;
    var res = await fetchWithRetry(base + '/chat/completions',
      { method: 'POST', headers: headers, body: JSON.stringify(body) },
      { retries: pickRetries(opts), timeoutMs: timeoutMs, signal: opts.signal });
    var raw = null;
    try { raw = await res.json(); } catch (e) {
      throw new Error('AI request failed: invalid JSON response');
    }
    if (raw && raw.error) {
      var emsg = (raw.error.message || raw.error.code || 'unknown error');
      throw new Error('AI request failed: ' + String(emsg).slice(0, 300));
    }
    var text = extractText(raw, model);
    return { text: text, model: (raw && raw.model) || model, usage: (raw && raw.usage) || null, raw: raw };
  }

  function stripBOM(s) {
    if (s && s.charCodeAt(0) === 0xFEFF) return s.slice(1);
    return s;
  }

  function extractCandidate(text) {
    var s = stripBOM(String(text == null ? '' : text));
    var fence = s.match(/```(?:\s*json)?\s*([\s\S]*?)```/i);
    var candidate = fence ? fence[1].trim() : s.trim();
    // Slice out JSON object/array to drop leading/trailing prose
    var firstBrace = candidate.indexOf('{');
    var firstBracket = candidate.indexOf('[');
    var start = -1;
    var endChar = '';
    if (firstBrace === -1 && firstBracket === -1) return candidate;
    if (firstBrace === -1) { start = firstBracket; endChar = ']'; }
    else if (firstBracket === -1) { start = firstBrace; endChar = '}'; }
    else if (firstBrace < firstBracket) { start = firstBrace; endChar = '}'; }
    else { start = firstBracket; endChar = ']'; }
    var end = candidate.lastIndexOf(endChar);
    if (start !== -1 && end !== -1 && end > start) return candidate.slice(start, end + 1).trim();
    return candidate;
  }

  function repairJSON(s) {
    var out = String(s);
    // trailing commas before } or ]
    out = out.replace(/,\s*([}\]])/g, '$1');
    // single-quoted strings -> double-quoted (handles keys and values)
    out = out.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, function (m, inner) {
      var esc = inner.replace(/"/g, '\\"');
      return '"' + esc + '"';
    });
    // unquoted keys -> quoted
    out = out.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
    return out;
  }

  async function chatJSON(config, messages, options) {
    var result = await chat(config, messages, options);
    var rawText = result.text == null ? '' : String(result.text);
    var cleaned = stripBOM(rawText).trim();
    var candidate = extractCandidate(rawText);
    try {
      var data = JSON.parse(candidate);
      var repaired = candidate !== cleaned;
      // If candidate parsed but needed repair chars (trailing comma etc.),
      // candidate !== cleaned may be false when no prose; detect via strict re-parse
      if (!repaired) {
        try { JSON.parse(cleaned); repaired = false; } catch (_) { repaired = true; }
      }
      return { data: data, text: rawText, repaired: repaired };
    } catch (_) { /* try repair */ }
    try {
      var fixed = repairJSON(candidate);
      var data2 = JSON.parse(fixed);
      return { data: data2, text: rawText, repaired: true };
    } catch (_) { /* fall through */ }
    throw new Error('Failed to parse model output as JSON: ' + rawText.slice(0, 300));
  }

  async function testConnection(config, options) {
    var cfg = Object.assign({}, config || {});
    var opts = Object.assign({}, options || {});
    var start = Date.now();
    try {
      var models = await listModels(cfg, opts);
      return { ok: true, modelCount: models.length, models: models, latencyMs: Date.now() - start, error: null };
    } catch (err) {
      return { ok: false, modelCount: 0, models: [], latencyMs: Date.now() - start, error: sanitizeMessage(err && err.message) || 'connection failed' };
    }
  }

  async function runBatches(items, batchSize, worker, options) {
    var list = Array.isArray(items) ? items.slice() : Array.from(items || []);
    var size = Math.max(1, Math.floor(Number(batchSize) || 20));
    var opts = {};
    var fn = worker;
    // Allow runBatches(items, worker) overload? Spec fixes 4 args; keep tolerant:
    if (typeof batchSize === 'function') { fn = batchSize; size = 20; opts = worker || {}; }
    else opts = options || {};
    if (typeof fn !== 'function') throw new Error('ai-client: worker function is required');
    var concurrency = Math.max(1, Math.min(Number(opts.concurrency != null ? opts.concurrency : opts.limit) || 2, 8));
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    var batches = (Core && typeof Core.chunk === 'function') ? Core.chunk(list, size) : chunkLocal(list, size);
    var total = batches.length;
    var results = new Array(total);
    var errors = [];
    var done = 0;

    function progress() {
      if (onProgress) { try { onProgress(done, total); } catch (_) {} }
    }

    async function runOne(batch, index) {
      try {
        var r = await fn(batch, index);
        results[index] = r;
      } catch (err) {
        results[index] = undefined;
        errors.push({ index: index, error: err instanceof Error ? err.message : String(err), batch: batch });
      } finally {
        done += 1;
        progress();
      }
    }

    if (Core && typeof Core.runPool === 'function') {
      await Core.runPool(batches, function (batch, index) { return runOne(batch, index); }, { limit: concurrency });
    } else {
      var cursor = 0;
      async function drain() {
        while (cursor < batches.length) {
          var idx = cursor++;
          await runOne(batches[idx], idx);
        }
      }
      var workers = [];
      for (var i = 0; i < Math.min(concurrency, Math.max(total, 1)); i++) workers.push(drain());
      await Promise.all(workers);
    }
    return { results: results, errors: errors };
  }

  return {
    normalizeBaseUrl: normalizeBaseUrl,
    listModels: listModels,
    chat: chat,
    chatJSON: chatJSON,
    testConnection: testConnection,
    runBatches: runBatches
  };
});
