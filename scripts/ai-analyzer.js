(function (root, factory) {
  var api = factory(root);
  root.SMAIAnalyzer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULT_TAXONOMY = [
    { id: 'ai', label: 'AI' },
    { id: 'dev', label: 'Dev' },
    { id: 'docs', label: 'Docs' },
    { id: 'design', label: 'Design' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' },
    { id: 'news', label: 'News' },
    { id: 'social', label: 'Social' },
    { id: 'edu', label: 'Edu' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'office', label: 'Office' },
    { id: 'game', label: 'Game' },
    { id: 'finance', label: 'Finance' },
    { id: 'travel', label: 'Travel' },
    { id: 'other', label: 'Other' }
  ];

  function getAIClient() {
    if (root && root.SMAI) return root.SMAI;
    if (typeof globalThis !== 'undefined' && globalThis.SMAI) return globalThis.SMAI;
    try {
      if (typeof require === 'function') return require('./ai-client.js');
    } catch (e) { /* missing peer: ignore */ }
    return null;
  }

  function getArchive() {
    if (root && root.SMArchive) return root.SMArchive;
    if (typeof globalThis !== 'undefined' && globalThis.SMArchive) return globalThis.SMArchive;
    try {
      if (typeof require === 'function') return require('./archive-classifier.js');
    } catch (e) { /* ignore */ }
    return null;
  }

  function normTaxonomy(taxonomy) {
    if (!Array.isArray(taxonomy) || !taxonomy.length) return DEFAULT_TAXONOMY;
    var out = [];
    for (var i = 0; i < taxonomy.length; i++) {
      var t = taxonomy[i];
      if (!t) continue;
      if (typeof t === 'string') out.push({ id: t, label: t });
      else if (t.id) out.push({ id: String(t.id), label: t.label != null ? String(t.label) : String(t.id) });
    }
    return out.length ? out : DEFAULT_TAXONOMY;
  }

  function validIdSet(taxonomy) {
    var tax = normTaxonomy(taxonomy);
    var s = new Set();
    for (var i = 0; i < tax.length; i++) s.add(tax[i].id);
    return s;
  }

  function labelFor(taxonomy, id) {
    var tax = normTaxonomy(taxonomy);
    for (var i = 0; i < tax.length; i++) if (tax[i].id === id) return tax[i].label;
    return id;
  }

  function leafFolder(bm) {
    if (!bm) return '';
    var p = bm.path != null ? bm.path : bm.folder;
    if (Array.isArray(p)) {
      for (var i = p.length - 1; i >= 0; i--) {
        var s = p[i] == null ? '' : String(p[i]).trim();
        if (s) return s.slice(0, 80);
      }
      return '';
    }
    if (typeof p === 'string') {
      var parts = p.split(/[\\/]/).map(function (x) { return x.trim(); }).filter(Boolean);
      return (parts.length ? parts[parts.length - 1] : p.trim()).slice(0, 80);
    }
    if (bm.folderName != null) return String(bm.folderName).slice(0, 80);
    return '';
  }

  function trimBookmark(bm) {
    bm = bm || {};
    return {
      id: bm.id == null ? '' : String(bm.id),
      title: String(bm.title == null ? '' : bm.title).slice(0, 200),
      url: String(bm.url == null ? '' : bm.url).slice(0, 300),
      folder: leafFolder(bm)
    };
  }

  function buildMessages(bookmarks, taxonomy, options) {
    var tax = normTaxonomy(taxonomy);
    var ids = tax.map(function (t) { return t.id; });
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var trimmed = list.map(trimBookmark);
    var sys = [
      'You are a bookmark classifier/organizer.',
      'Task: assign each input bookmark exactly one category.',
      'Allowed category ids: ' + ids.join(', ') + '.',
      'Rules: NEVER invent ids outside the taxonomy. Output STRICT JSON only, no prose, no markdown fences.',
      'Required shape: {"assignments":[{"id":"<bookmark id>","category":"<id>","confidence":0-1,"tags":["..."],"reason":"<short>"}]}.',
      'You must return one entry per input bookmark (' + trimmed.length + ' entries), preserving each bookmark id verbatim.'
    ].join(' ');
    var user = JSON.stringify({ categories: ids, bookmarks: trimmed });
    var msgs = [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ];
    if (options && options.modelHint) msgs.push({ role: 'user', content: String(options.modelHint) });
    return msgs;
  }

  function extractJson(text) {
    var s = String(text == null ? '' : text);
    // strip markdown fences
    s = s.replace(/```(?:json)?/gi, '```');
    var fence = s.match(/```([\s\S]*?)```/);
    if (fence) s = fence[1];
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    return s;
  }

  function toValidSet(validIds) {
    if (validIds instanceof Set) return validIds;
    if (Array.isArray(validIds)) return new Set(validIds.map(String));
    if (validIds && typeof validIds === 'object') return new Set(Object.keys(validIds).map(String));
    return new Set(['other']);
  }

  function parseAssignments(text, validIds) {
    var valid = toValidSet(validIds);
    var assignments = [];
    var invalid = [];
    var missing = [];
    var raw;
    try {
      raw = JSON.parse(extractJson(text));
    } catch (e) {
      return { assignments: assignments, invalid: invalid, missing: missing };
    }
    var list = raw && Array.isArray(raw.assignments) ? raw.assignments : (Array.isArray(raw) ? raw : null);
    if (!list) return { assignments: assignments, invalid: invalid, missing: missing };
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') { invalid.push({ index: i, reason: 'not an object' }); continue; }
      var id = e.id == null ? '' : String(e.id);
      var cat = e.category == null ? '' : String(e.category);
      var conf = Number(e.confidence);
      if (!id || !cat || !valid.has(cat)) { invalid.push({ index: i, id: id || null, reason: 'unknown id or category' }); continue; }
      if (typeof e.id === 'undefined' || typeof e.category === 'undefined') { invalid.push({ index: i, reason: 'malformed fields' }); continue; }
      if (!isFinite(conf)) conf = 0.5;
      conf = Math.min(1, Math.max(0, conf));
      var tags = Array.isArray(e.tags) ? e.tags.filter(function (t) { return typeof t === 'string' && t; }).map(String).slice(0, 8) : [];
      var reason = e.reason == null ? '' : String(e.reason).slice(0, 200);
      assignments.push({ id: id, category: cat, confidence: conf, tags: tags, reason: reason });
    }
    return { assignments: assignments, invalid: invalid, missing: missing };
  }

  function isAIConfigured(aiConfig, client) {
    if (!aiConfig || typeof aiConfig !== 'object') return false;
    var hasCred = !!(aiConfig.apiKey || aiConfig.key || aiConfig.token ||
      aiConfig.baseUrl || aiConfig.baseURL || aiConfig.apiBase || aiConfig.endpoint);
    if (!hasCred) return false;
    if (!client) return false;
    var fn = client.chatJSON || client.chatJson || client.completeJSON || client.completeJson || client.requestJSON || client.chat;
    return typeof fn === 'function';
  }

  function chatFnOf(client) {
    return client.chatJSON || client.chatJson || client.completeJSON || client.completeJson || client.requestJSON || client.chat;
  }

  function normChatText(out) {
    if (out == null) return '';
    if (typeof out === 'string') return out;
    if (typeof out.content === 'string') return out.content;
    if (typeof out.text === 'string') return out.text;
    if (out.message) {
      if (typeof out.message === 'string') return out.message;
      if (typeof out.message.content === 'string') return out.message.content;
    }
    if (Array.isArray(out.choices) && out.choices.length) {
      var c = out.choices[0];
      if (typeof c === 'string') return c;
      if (c && c.message && typeof c.message.content === 'string') return c.message.content;
      if (c && typeof c.text === 'string') return c.text;
    }
    try { return JSON.stringify(out); } catch (e) { return String(out); }
  }

  function chunkOf(list, size) {
    var out = [];
    var n = Math.max(1, Math.floor(Number(size)) || 25);
    for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
    return out;
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, Math.max(0, Number(ms) || 0)); });
  }

  function localClassify(bm, taxonomy) {
    var arch = getArchive();
    var cat = 'other';
    var conf = 0.15;
    var reasons = [];
    if (arch && typeof arch.classify === 'function') {
      try {
        var r = arch.classify(bm || {});
        if (typeof r === 'string' && r) { cat = r; conf = 0.5; }
        else if (r && typeof r.category === 'string' && r.category) {
          cat = r.category;
          if (isFinite(Number(r.confidence))) conf = Number(r.confidence);
          if (Array.isArray(r.reasons)) reasons = r.reasons.map(String).slice(0, 3);
        }
      } catch (e) { /* ignore */ }
    }
    var valid = validIdSet(taxonomy);
    if (!valid.has(cat)) { cat = 'other'; conf = 0.15; }
    return { category: cat, confidence: Math.min(1, Math.max(0, conf)), reasons: reasons };
  }

  function analyzeBookmarks(bookmarks, aiConfig, options) {
    var opts = options || {};
    var tax = normTaxonomy(opts.taxonomy);
    var valid = validIdSet(tax);
    var batchSize = opts.batchSize == null ? 25 : Math.max(1, Math.floor(Number(opts.batchSize)) || 25);
    var concurrency = opts.concurrency == null ? 2 : Math.max(1, Math.floor(Number(opts.concurrency)) || 2);
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    var signal = opts.signal || null;
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var t0 = Date.now();
    var byId = {};
    for (var bi = 0; bi < list.length; bi++) {
      var b = list[bi] || {};
      byId[b.id == null ? '' : String(b.id)] = b;
    }

    function buildResult(id, cat, conf, tags, reason, source) {
      return {
        id: String(id),
        category: valid.has(cat) ? cat : 'other',
        label: labelFor(tax, valid.has(cat) ? cat : 'other'),
        confidence: isFinite(Number(conf)) ? Math.min(1, Math.max(0, Number(conf))) : 0.5,
        tags: Array.isArray(tags) ? tags.map(String) : [],
        reason: reason == null ? '' : String(reason).slice(0, 200),
        source: source
      };
    }

    function fallbackResults(items) {
      return items.map(function (bm) {
        var id = bm && bm.id != null ? String(bm.id) : '';
        var lc = localClassify(bm, tax);
        return buildResult(id, lc.category, lc.confidence, [], (lc.reasons[0] || 'local fallback'), 'local');
      });
    }

    function finish(results, errors, fallbackCount, failedCount, analyzedCount) {
      var byCategory = {};
      var groupsMap = {};
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
        if (!groupsMap[r.category]) groupsMap[r.category] = [];
        groupsMap[r.category].push(r);
      }
      var groups = Object.keys(groupsMap).map(function (cat) {
        return { category: cat, label: labelFor(tax, cat), items: groupsMap[cat] };
      });
      groups.sort(function (a, b) { return b.items.length - a.items.length; });
      return {
        results: results,
        stats: {
          total: list.length,
          analyzed: analyzedCount,
          failed: failedCount,
          fallback: fallbackCount,
          byCategory: byCategory,
          elapsedMs: Date.now() - t0
        },
        groups: groups,
        errors: errors
      };
    }

    // Never reject: wrap everything.
    return (async function run() {
      var errors = [];
      if (!list.length) return finish([], errors, 0, 0, 0);
      var client = getAIClient();
      if (!isAIConfigured(aiConfig, client)) {
        var fb = fallbackResults(list);
        if (onProgress) { try { onProgress(fb.length, list.length); } catch (e) {} }
        return finish(fb, errors, fb.length, 0, fb.length);
      }
      var chatFn = chatFnOf(client);
      var batches = chunkOf(list, batchSize);
      var out = new Array(list.length);
      var indexById = {};
      for (var i = 0; i < list.length; i++) indexById[String(list[i] && list[i].id != null ? list[i].id : '')] = i;
      var fallbackCount = 0;
      var failedCount = 0;
      var done = 0;
      var cursor = 0;

      function checkAborted() {
        if (signal && signal.aborted) {
          var err = new Error('aborted');
          err.name = 'AbortError';
          throw err;
        }
      }

      async function processBatch(batch) {
        checkAborted();
        var msgs = buildMessages(batch, tax);
        var lastErr = null;
        for (var attempt = 0; attempt < 3; attempt++) {
          try {
            checkAborted();
            // SMAI.chatJSON signature is (config, messages, options).
            var out2 = await chatFn(aiConfig, msgs, { signal: signal });
            return normChatText(out2);
          } catch (e) {
            lastErr = e;
            if (signal && signal.aborted) throw e;
            if (attempt < 2) await sleep(200 * (attempt + 1));
          }
        }
        throw lastErr || new Error('chat request failed');
      }

      async function worker() {
        while (true) {
          if (signal && signal.aborted) return;
          var bi2 = cursor++;
          if (bi2 >= batches.length) return;
          var batch = batches[bi2];
          try {
            var text = await processBatch(batch);
            var parsed = parseAssignments(text, valid);
            var seen = {};
            for (var k = 0; k < parsed.assignments.length; k++) {
              var a = parsed.assignments[k];
              seen[a.id] = a;
            }
            for (var j = 0; j < parsed.invalid.length; j++) {
              errors.push({ batch: bi2, reason: 'invalid assignment', detail: parsed.invalid[j] });
            }
            for (var m = 0; m < batch.length; m++) {
              var bm = batch[m];
              var id = bm && bm.id != null ? String(bm.id) : '';
              var hit = seen[id];
              var idx = indexById[id] != null ? indexById[id] : null;
              if (hit) {
                out[idx] = buildResult(id, hit.category, hit.confidence, hit.tags, hit.reason, 'ai');
              } else {
                var lc = localClassify(bm, tax);
                fallbackCount++;
                errors.push({ batch: bi2, id: id, reason: 'missing assignment; repaired locally' });
                out[idx] = buildResult(id, lc.category, lc.confidence, [], 'repaired locally', 'local');
              }
            }
          } catch (e) {
            if (signal && signal.aborted) {
              // mark remaining in this batch as failed-local
              for (var f = 0; f < batch.length; f++) {
                var b2 = batch[f];
                var id2 = b2 && b2.id != null ? String(b2.id) : '';
                var idx2 = indexById[id2];
                if (!out[idx2]) {
                  var lc2 = localClassify(b2, tax);
                  fallbackCount++;
                  out[idx2] = buildResult(id2, lc2.category, lc2.confidence, [], 'aborted; local fallback', 'local');
                }
              }
              errors.push({ batch: bi2, reason: String((e && e.message) || e) });
              return;
            }
            failedCount += batch.length;
            fallbackCount += batch.length;
            errors.push({ batch: bi2, reason: String((e && e.message) || e) });
            for (var q = 0; q < batch.length; q++) {
              var bb = batch[q];
              var id3 = bb && bb.id != null ? String(bb.id) : '';
              var ix = indexById[id3];
              var lc3 = localClassify(bb, tax);
              out[ix] = buildResult(id3, lc3.category, lc3.confidence, [], 'ai failed; local fallback', 'local');
            }
          } finally {
            done += batch.length;
            if (onProgress) { try { onProgress(Math.min(done, list.length), list.length); } catch (e2) {} }
          }
        }
      }

      var workers = [];
      var n = Math.min(concurrency, batches.length);
      for (var w = 0; w < n; w++) workers.push(worker());
      await Promise.all(workers);
      var results = out.filter(Boolean);
      return finish(results, errors, fallbackCount, failedCount, results.length);
    })().catch(function (e) {
      var fb = fallbackResults(list);
      return finish(fb, [{ reason: String((e && e.message) || e) }], fb.length, list.length, fb.length);
    });
  }

  function planFromAnalysis(analysis, options) {
    var opts = options || {};
    var min = opts.minGroupSize == null ? 1 : Math.max(1, Math.floor(Number(opts.minGroupSize)) || 1);
    var src = (analysis && Array.isArray(analysis.results)) ? analysis.results :
      (analysis && Array.isArray(analysis.groups) ? analysis.groups.reduce(function (acc, g) {
        return acc.concat(g.items || []);
      }, []) : []);
    var map = {};
    for (var i = 0; i < src.length; i++) {
      var r = src[i] || {};
      var cat = r.category != null ? String(r.category) : 'other';
      if (!map[cat]) map[cat] = { name: r.label != null ? String(r.label) : cat, items: [] };
      map[cat].items.push({ id: r.id, category: r.category, label: r.label, confidence: r.confidence, tags: r.tags, reason: r.reason, source: r.source });
      if (r.label != null && (!map[cat].name || map[cat].name === cat)) map[cat].name = String(r.label);
    }
    var groups = Object.keys(map).map(function (k) { return { name: map[k].name || k, items: map[k].items }; });
    groups = groups.filter(function (g) { return g.items.length >= min; });
    groups.sort(function (a, b) { return b.items.length - a.items.length; });
    return groups;
  }

  return {
    DEFAULT_TAXONOMY: DEFAULT_TAXONOMY,
    buildMessages: buildMessages,
    parseAssignments: parseAssignments,
    analyzeBookmarks: analyzeBookmarks,
    planFromAnalysis: planFromAnalysis
  };
});
