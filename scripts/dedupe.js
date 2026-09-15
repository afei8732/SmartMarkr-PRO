(function (root, factory) {
  var SMCore = (root && root.SMCore) || null;
  if (!SMCore && typeof require !== 'undefined') {
    try { SMCore = require('./core-utils.js'); } catch (e) { SMCore = null; }
  }
  var api = factory(SMCore);
  root.SMDedupe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (SMCore) {
  'use strict';

  function toTime(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function pathDepth(bm) {
    if (Array.isArray(bm.path)) return bm.path.length;
    return bm.path != null ? 1 : 0;
  }

  function pickKeep(items) {
    var sorted = items.slice().sort(function (a, b) {
      var da = pathDepth(a), db = pathDepth(b);
      if (da !== db) return da - db;
      var ta = toTime(a.dateAdded, Infinity), tb = toTime(b.dateAdded, Infinity);
      if (ta !== tb) return ta - tb;
      var la = String(a.url || '').length, lb = String(b.url || '').length;
      if (la !== lb) return la - lb;
      var sa = String(a.id), sb = String(b.id);
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    var keepId = sorted[0] ? sorted[0].id : null;
    var rest = sorted.slice(1).sort(function (a, b) {
      return toTime(b.dateAdded, -Infinity) - toTime(a.dateAdded, -Infinity);
    });
    return { keepId: keepId, removeIds: rest.map(function (x) { return x.id; }) };
  }

  function findDuplicates(bookmarks, options) {
    var start = Date.now();
    var opts = options || {};
    var includeExact = opts.includeExact !== false;
    var includeSimilar = opts.includeSimilar !== false;
    var threshold = Number(opts.threshold);
    if (!Number.isFinite(threshold)) threshold = 0.82;
    var maxCandidates = Math.max(1, Number(opts.maxCandidatesPerItem) || 40);
    var maxBucket = Math.max(1, Number(opts.maxBucketSize) || 2000);
    var maxGroup = Math.max(2, Number(opts.maxGroupSize) || 200);

    var groups = [];
    var warnings = [];
    var candidatePairs = 0;
    var skippedBuckets = 0;
    var exactGroups = 0;
    var similarGroups = 0;
    var valid = [];

    if (!Array.isArray(bookmarks)) {
      warnings.push('findDuplicates expected an array of bookmarks');
      bookmarks = [];
    }

    for (var i = 0; i < bookmarks.length; i++) {
      try {
        var bm = bookmarks[i];
        if (!bm || typeof bm !== 'object' || bm.id == null ||
            typeof bm.url !== 'string' || !bm.url.trim()) {
          warnings.push('skipped malformed bookmark at index ' + i);
          continue;
        }
        valid.push(bm);
      } catch (e) {
        warnings.push('skipped malformed bookmark at index ' + i);
      }
    }

    function norm(u) {
      try { return SMCore.normalizeUrl(u); }
      catch (e) { return String(u || '').trim().toLowerCase(); }
    }
    function base(u) {
      try {
        var b = SMCore.getBaseDomain(u);
        if (b) return b.toLowerCase();
        var h = SMCore.getHostname(u);
        return (h || '__unknown').toLowerCase();
      } catch (e) { return '__unknown'; }
    }
    function toks(t) {
      try { return SMCore.tokenizeTitle(t) || []; }
      catch (e) { return []; }
    }
    function short(s) {
      try { return SMCore.shortHash(s); } catch (e) { return String(s).length + ''; }
    }

    // ---- Exact ----
    var normCache = new Array(valid.length);
    if (includeExact) {
      var map = new Map();
      for (var e = 0; e < valid.length; e++) {
        var n;
        try { n = norm(valid[e].url); } catch (err) { n = String(valid[e].url).toLowerCase(); }
        normCache[e] = n;
        if (!map.has(n)) map.set(n, []);
        map.get(n).push(valid[e]);
      }
      map.forEach(function (items, key) {
        if (items.length < 2) return;
        var parts = items.length > maxGroup
          ? chunkArr(items, maxGroup) : [items];
        for (var p = 0; p < parts.length; p++) {
          var piece = parts[p];
          if (piece.length < 2) continue;
          var sel = pickKeep(piece);
          groups.push({
            id: 'exact-' + short(key) + (parts.length > 1 ? '-' + p : ''),
            type: 'exact', key: key, score: 1, items: piece,
            keepId: sel.keepId, removeIds: sel.removeIds,
            reason: 'identical normalized URL (' + piece.length + ' bookmarks)'
          });
          exactGroups++;
        }
        if (items.length > maxGroup) warnings.push('exact group split: ' + key);
      });
    } else {
      for (var c = 0; c < valid.length; c++) {
        try { normCache[c] = norm(valid[c].url); } catch (e) { normCache[c] = ''; }
      }
    }

    // ---- Similar ----
    if (includeSimilar) {
      var buckets = new Map();
      for (var v = 0; v < valid.length; v++) {
        var bd;
        try { bd = base(valid[v].url); } catch (e) { bd = '__unknown'; }
        if (!buckets.has(bd)) buckets.set(bd, []);
        buckets.get(bd).push(v);
      }
      buckets.forEach(function (idxs, domain) {
        if (idxs.length < 2) return;
        if (idxs.length > maxBucket) {
          skippedBuckets++;
          warnings.push('skipped bucket ' + domain + ' (' + idxs.length + ' > ' + maxBucket + ')');
          return;
        }
        var nB = idxs.length;
        var tokenArr = new Array(nB), tokenSets = new Array(nB);
        var titleStr = new Array(nB);
        var index = new Map();
        for (var k = 0; k < nB; k++) {
          var bm2 = valid[idxs[k]];
          var t = toks(bm2.title);
          tokenArr[k] = t;
          tokenSets[k] = new Set(t);
          titleStr[k] = String(bm2.title == null ? '' : bm2.title);
          for (var q = 0; q < t.length; q++) {
            var tok = t[q];
            var post = index.get(tok);
            if (!post) { post = []; index.set(tok, post); }
            post.push(k);
          }
        }
        var pairSet = new Set();
        for (var a = 0; a < nB; a++) {
          if (!tokenArr[a].length) continue;
          var counts = new Map();
          for (var r = 0; r < tokenArr[a].length; r++) {
            var post2 = index.get(tokenArr[a][r]) || [];
            for (var s = 0; s < post2.length; s++) {
              var j = post2[s];
              if (j === a) continue;
              counts.set(j, (counts.get(j) || 0) + 1);
            }
          }
          if (!counts.size) continue;
          var ranked = Array.from(counts.entries())
            .sort(function (x, y) { return y[1] - x[1] || x[0] - y[0]; })
            .slice(0, maxCandidates);
          for (var u2 = 0; u2 < ranked.length; u2++) {
            var j2 = ranked[u2][0];
            var lo = a < j2 ? a : j2, hi = a < j2 ? j2 : a;
            pairSet.add(lo + ':' + hi);
          }
        }
        // union-find
        var parent = new Array(nB), rank = new Array(nB).fill(0);
        for (var w = 0; w < nB; w++) parent[w] = w;
        function find(x) {
          while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
          return x;
        }
        function union(x, y) {
          var rx = find(x), ry = find(y);
          if (rx === ry) return rx;
          if (rank[rx] < rank[ry]) parent[rx] = ry;
          else if (rank[rx] > rank[ry]) parent[ry] = rx;
          else { parent[ry] = rx; rank[rx]++; }
          return parent[rx];
        }
        var edges = [];
        pairSet.forEach(function (key2) {
          var parts2 = key2.split(':');
          var ia = Number(parts2[0]), ib = Number(parts2[1]);
          if (normCache[idxs[ia]] === normCache[idxs[ib]]) return; // already exact
          var sc;
          try {
            sc = 0.5 * SMCore.jaccardSimilarity(tokenSets[ia], tokenSets[ib]) +
                 0.2 * SMCore.diceCoefficient(titleStr[ia], titleStr[ib]) +
                 0.3 * SMCore.diceCoefficient(normCache[idxs[ia]], normCache[idxs[ib]]);
          } catch (e) { return; }
          candidatePairs++;
          if (sc >= threshold) { union(ia, ib); edges.push([ia, ib, sc]); }
        });
        var stat = new Map();
        for (var eg = 0; eg < edges.length; eg++) {
          var rr = find(edges[eg][0]);
          var cur = stat.get(rr) || { sum: 0, count: 0 };
          cur.sum += edges[eg][2]; cur.count++;
          stat.set(rr, cur);
        }
        var clusters = new Map();
        for (var m2 = 0; m2 < nB; m2++) {
          var root2 = find(m2);
          if (!stat.has(root2)) continue;
          if (!clusters.has(root2)) clusters.set(root2, []);
          clusters.get(root2).push(m2);
        }
        clusters.forEach(function (members, rootKey) {
          if (members.length < 2) return;
          var st = stat.get(rootKey) || { sum: threshold, count: 1 };
          var avg = st.sum / (st.count || 1);
          var itemsAll = members.map(function (mi) { return valid[idxs[mi]]; });
          // deterministic order before chunking
          itemsAll.sort(function (x, y) { return String(x.id) < String(y.id) ? -1 : 1; });
          var pieces = itemsAll.length > maxGroup ? chunkArr(itemsAll, maxGroup) : [itemsAll];
          for (var pi = 0; pi < pieces.length; pi++) {
            if (pieces[pi].length < 2) continue;
            var sel2 = pickKeep(pieces[pi]);
            var ids = pieces[pi].map(function (x) { return String(x.id); }).sort().join(',');
            groups.push({
              id: 'similar-' + short(domain + ':' + ids) + (pieces.length > 1 ? '-' + pi : ''),
              type: 'similar', key: domain + ':' + short(ids),
              score: Math.round(avg * 1000) / 1000,
              items: pieces[pi], keepId: sel2.keepId, removeIds: sel2.removeIds,
              reason: 'similar titles/urls in ' + domain + ' (score ' + (Math.round(avg * 100) / 100) + ')'
            });
            similarGroups++;
          }
        });
      });
    }

    return {
      groups: groups,
      stats: {
        scanned: valid.length,
        exactGroups: exactGroups,
        similarGroups: similarGroups,
        candidatePairs: candidatePairs,
        elapsedMs: Date.now() - start,
        skippedBuckets: skippedBuckets
      },
      warnings: warnings
    };
  }

  function chunkArr(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  return { findDuplicates: findDuplicates };
});
