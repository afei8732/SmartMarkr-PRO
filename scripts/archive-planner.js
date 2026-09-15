(function (root, factory) {
  var api = factory(root);
  root.SMArchivePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULT_ROOT = ['\uD83D\uDCE6 SmartMarkr \u5F52\u6863'];

  function getCore() {
    if (root && root.SMCore) return root.SMCore;
    if (typeof require === 'function') {
      try { return require('./core-utils.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function getArchiveClassifier() {
    if (root && root.SMArchive) return root.SMArchive;
    if (typeof require === 'function') {
      try { return require('./archive-classifier.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function clonePath(p) {
    if (!Array.isArray(p)) return [];
    return p.slice();
  }

  function normOptions(options) {
    var o = options || {};
    return {
      strategy: o.strategy || 'type',
      archiveRootPath: Array.isArray(o.archiveRootPath) && o.archiveRootPath.length ? o.archiveRootPath.slice() : DEFAULT_ROOT.slice(),
      minGroupSize: o.minGroupSize == null ? 2 : Math.max(1, Math.floor(Number(o.minGroupSize)) || 1),
      maxDepth: o.maxDepth == null ? 3 : Math.max(1, Math.floor(Number(o.maxDepth)) || 1),
      onlyUnfiled: o.onlyUnfiled == null ? true : !!o.onlyUnfiled,
      dateBuckets: o.dateBuckets || 'year',
      dryRun: !!o.dryRun,
      customRules: o.customRules
    };
  }

  function isUnderRoot(path, archiveRoot) {
    if (!Array.isArray(path) || path.length < archiveRoot.length) return false;
    for (var i = 0; i < archiveRoot.length; i++) {
      if (String(path[i]) !== String(archiveRoot[i])) return false;
    }
    return true;
  }

  function isUnfiled(b) {
    var p = b ? b.path : null;
    return !Array.isArray(p) || p.length === 0;
  }

  function sanitizeFolderName(raw, fallback) {
    var s = raw == null ? '' : String(raw);
    s = s.replace(/[\x00-\x1F\x7F]/g, '');
    s = s.replace(/[\\/:*?"<>|]/g, '');
    s = s.trim().replace(/\s+/g, ' ');
    if (s.length > 80) s = s.slice(0, 80).trim();
    if (!s) {
      var fb = fallback == null ? 'ungrouped' : String(fallback);
      fb = fb.replace(/[\x00-\x1F\x7F]/g, '').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, ' ');
      if (fb.length > 80) fb = fb.slice(0, 80).trim();
      s = fb || 'ungrouped';
    }
    return s;
  }

  function getHostname(url) {
    var core = getCore();
    if (core && typeof core.getHostname === 'function') {
      try { return core.getHostname(url) || ''; } catch (e) { return ''; }
    }
    if (!url || typeof url !== 'string') return '';
    var t = url.trim();
    try { return new URL(t).hostname.toLowerCase(); }
    catch (e) {
      try { return new URL('https://' + t).hostname.toLowerCase(); }
      catch (e2) { return ''; }
    }
  }

  function getBaseDomain(url) {
    var core = getCore();
    if (core && typeof core.getBaseDomain === 'function') {
      try { return core.getBaseDomain(url) || getHostname(url); } catch (e) { /* fallthrough */ }
    }
    return getHostname(url);
  }

  function classifyType(bookmark) {
    var clf = getArchiveClassifier();
    if (clf) {
      try {
        if (typeof clf.classify === 'function') {
          var c = clf.classify(bookmark);
          if (typeof c === 'string' && c) return [c];
          if (Array.isArray(c) && c.length) return c.map(String);
        }
        if (typeof clf.getType === 'function') {
          var t = clf.getType(bookmark);
          if (typeof t === 'string' && t) return [t];
        }
      } catch (e) { /* fallthrough */ }
    }
    var host = getBaseDomain(bookmark ? bookmark.url : '');
    var h = host.toLowerCase();
    var url = String((bookmark && bookmark.url) || '').toLowerCase();
    if (!h && !url) return ['\u5176\u4ED6'];
    if (/(github\.com|gitlab|stackoverflow|gitee|npmjs|mdn|w3schools|codepen|dev\.to|csdn|juejin|runoob)/.test(h)) return ['\u5F00\u53D1'];
    if (/(youtube|bilibili|vimeo|twitch|douyin|iqiyi|youku|netflix)/.test(h)) return ['\u89C6\u9891'];
    if (/(zhihu|weibo|twitter|x\.com|douban|reddit|v2ex|hupu|tieba)/.test(h)) return ['\u793E\u4EA4'];
    if (/(medium|jianshu|sspai|hexo|notion|yuque|docs\.|developer\.|wikipedia|readthedocs|gitbook)/.test(h)) return ['\u6587\u6863'];
    if (/(sina|163\.com|sohu|thepaper|qq\.com|toutiao|nytimes|bbc|news)/.test(h)) return ['\u65B0\u95FB'];
    if (/(taobao|jd\.com|tmall|amazon|smzdm|pinduoduo)/.test(h)) return ['\u8D2D\u7269'];
    if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|dmg|exe|apk)(\?|#|$)/.test(url)) return ['\u6587\u6863'];
    return ['\u5176\u4ED6'];
  }

  function bookmarkYear(b) {
    var v = b ? (b.dateAdded != null ? b.dateAdded : (b.addedAt != null ? b.addedAt : (b.createdAt != null ? b.createdAt : b.date))) : null;
    var d = null;
    if (v instanceof Date) d = v;
    else if (typeof v === 'number' && isFinite(v)) d = new Date(v > 1e12 ? v : (v > 1e10 ? v : v * 1000));
    else if (typeof v === 'string' && v) { var t = Date.parse(v); if (!isNaN(t)) d = new Date(t); }
    if (!d || isNaN(d.getTime())) {
      var id = b ? Number(b.id) : NaN;
      if (isFinite(id) && id > 0) { var d2 = new Date(id); if (!isNaN(d2.getTime()) && d2.getFullYear() >= 1990 && d2.getFullYear() <= 2100) d = d2; }
    }
    if (!d || isNaN(d.getTime())) return null;
    return d;
  }

  function segmentsFor(strategy, b, opts) {
    var raw;
    if (strategy === 'domain') {
      var dom = getBaseDomain(b.url) || getHostname(b.url) || 'unknown';
      raw = [dom];
    } else if (strategy === 'type') {
      raw = classifyType(b);
    } else if (strategy === 'date') {
      var d = bookmarkYear(b);
      if (!d) raw = ['unknown-date'];
      else if (opts.dateBuckets === 'year-month') {
        var m = String(d.getMonth() + 1);
        if (m.length < 2) m = '0' + m;
        raw = [String(d.getFullYear()), String(d.getFullYear()) + '-' + m];
      } else if (typeof opts.dateBuckets === 'function') {
        try {
          var r = opts.dateBuckets(b, d);
          raw = Array.isArray(r) ? r : [String(r)];
        } catch (e) { raw = [String(d.getFullYear())]; }
      } else {
        raw = [String(d.getFullYear())];
      }
    } else if (strategy === 'folder') {
      var p = Array.isArray(b.path) ? b.path : [];
      raw = p.length ? [String(p[0])] : ['\u672A\u5206\u7C7B'];
    } else if (strategy === 'custom') {
      var rules = opts.customRules;
      if (typeof rules === 'function') {
        try {
          var out = rules(b);
          if (out == null) raw = ['\u5176\u4ED6'];
          else if (Array.isArray(out)) raw = out.length ? out.map(String) : ['\u5176\u4ED6'];
          else raw = [String(out)];
        } catch (e) { raw = ['\u5176\u4ED6']; }
      } else if (Array.isArray(rules) && rules.length) {
        raw = null;
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (!rule) continue;
          if (typeof rule === 'string') { raw = [rule]; break; }
          var folder = rule.folder || rule.name || rule.to;
          var pat = rule.pattern || rule.match || rule.host || rule.domain;
          var hit = false;
          if (pat == null) hit = true;
          else if (pat instanceof RegExp) hit = pat.test(String(b.url || '') + ' ' + String(b.title || ''));
          else hit = (String(b.url || '') + ' ' + String(b.title || '')).toLowerCase().indexOf(String(pat).toLowerCase()) !== -1;
          if (hit) { raw = Array.isArray(folder) ? folder.map(String) : [String(folder || '\u5176\u4ED6')]; break; }
        }
        if (!raw) raw = ['\u5176\u4ED6'];
      } else {
        raw = classifyType(b);
      }
    } else {
      raw = classifyType(b);
    }
    // sanitize + collapse depth
    var clean = [];
    for (var j = 0; j < raw.length; j++) {
      clean.push(sanitizeFolderName(raw[j], 'group-' + (j + 1)));
    }
    if (clean.length > opts.maxDepth) clean = clean.slice(0, opts.maxDepth);
    if (!clean.length) clean = ['\u5176\u4ED6'];
    return { segments: clean, rawNames: raw.map(String) };
  }

  function planArchive(bookmarks, options) {
    var opts = normOptions(options);
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var total = list.length;
    var alreadyFiled = 0;
    var skipped = 0;
    var warnings = [];
    var conflicts = [];
    var operations = [];

    // groupKey -> { segments, rawNames, members: [] }
    var groups = new Map();
    var i, b, fromPath;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || typeof b !== 'object') { skipped++; continue; }
      fromPath = clonePath(b.path);
      if (isUnderRoot(fromPath, opts.archiveRootPath)) { alreadyFiled++; continue; }
      if (opts.onlyUnfiled && !isUnfiled(b)) {
        skipped++;
        continue;
      }
      var seg = segmentsFor(opts.strategy, b, opts);
      var key = seg.segments.join('\u0001').toLowerCase();
      var g = groups.get(key);
      if (!g) { g = { segments: seg.segments, rawNames: seg.rawNames, members: [] }; groups.set(key, g); }
      g.members.push({ bookmark: b, fromPath: fromPath });
    }

    // collision detection: same parent + same lowercased name from different raw names
    var nameMap = new Map(); // parentKey + '\n' + lower -> Set(raw)
    var nameIds = new Map();
    groups.forEach(function (g) {
      var parent = opts.archiveRootPath.concat(g.segments.slice(0, -1)).join('/');
      var lower = g.segments[g.segments.length - 1].toLowerCase();
      var mk = parent + '\n' + lower;
      if (!nameMap.has(mk)) { nameMap.set(mk, new Set()); nameIds.set(mk, []); }
      for (var k = 0; k < g.rawNames.length; k++) nameMap.get(mk).add(String(g.rawNames[k]));
      for (var m = 0; m < g.members.length; m++) {
        var id = g.members[m].bookmark ? g.members[m].bookmark.id : undefined;
        if (id !== undefined) nameIds.get(mk).push(id);
      }
    });
    nameMap.forEach(function (rawSet, mk) {
      if (rawSet.size > 1) {
        var parts = mk.split('\n');
        conflicts.push({
          type: 'folder-collision',
          message: 'Folder name collision under "' + parts[0] + '": ' + Array.from(rawSet).join(' / '),
          bookmarkIds: nameIds.get(mk).slice()
        });
      }
    });

    var folders = [];
    var folderSeen = new Map(); // fullPathKey -> folder entry
    var maxDepth = 0;

    groups.forEach(function (g) {
      if (g.members.length < opts.minGroupSize) {
        skipped += g.members.length;
        warnings.push('Skipped ' + g.members.length + ' item(s) in group "' + g.segments.join('/') + '": below minGroupSize ' + opts.minGroupSize + '.');
        return;
      }
      var toFolder = opts.archiveRootPath.concat(g.segments);
      if (g.segments.length > maxDepth) maxDepth = g.segments.length;
      var reason = 'strategy:' + opts.strategy + ' group:' + g.segments.join('/');
      for (var m = 0; m < g.members.length; m++) {
        var mb = g.members[m].bookmark;
        operations.push({
          bookmarkId: mb.id,
          title: mb.title,
          url: mb.url,
          fromPath: g.members[m].fromPath.slice(),
          toFolder: toFolder.slice(),
          reason: reason
        });
      }
      // register folder chain entries (each level)
      var acc = opts.archiveRootPath.slice();
      for (var d = 0; d < g.segments.length; d++) {
        acc = acc.concat([g.segments[d]]);
        var fk = acc.join('\u0001');
        var fe = folderSeen.get(fk);
        if (!fe) {
          fe = { path: acc.slice(), name: acc[acc.length - 1], count: 0, parentPath: acc.slice(0, -1) };
          folderSeen.set(fk, fe);
          folders.push(fe);
        }
      }
      var leafKey = toFolder.join('\u0001');
      var leaf = folderSeen.get(leafKey);
      if (leaf) leaf.count += g.members.length;
    });

    folders.sort(function (a, c) {
      var x = a.path.join('/'), y = c.path.join('/');
      return x < y ? -1 : (x > y ? 1 : 0);
    });

    return {
      operations: operations,
      folders: folders,
      conflicts: conflicts,
      stats: {
        total: total,
        movable: operations.length,
        alreadyFiled: alreadyFiled,
        skipped: skipped,
        folderCount: folders.length,
        maxDepth: maxDepth
      },
      warnings: warnings
    };
  }

  function withStrategy(strategy, bookmarks, options) {
    var o = options || {};
    var merged = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) merged[k] = o[k];
    merged.strategy = strategy;
    return planArchive(bookmarks, merged);
  }

  function planArchiveByDomain(bookmarks, options) { return withStrategy('domain', bookmarks, options); }
  function planArchiveByType(bookmarks, options) { return withStrategy('type', bookmarks, options); }
  function planArchiveByDate(bookmarks, options) { return withStrategy('date', bookmarks, options); }
  function planArchiveByFolder(bookmarks, options) { return withStrategy('folder', bookmarks, options); }

  function treeSet(existingTree) {
    var set = new Set();
    if (!existingTree) return set;
    var arr = Array.isArray(existingTree) ? existingTree : (Array.isArray(existingTree.folders) ? existingTree.folders : []);
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (Array.isArray(e)) set.add(e.join('/'));
      else if (typeof e === 'string') set.add(e);
      else if (e && Array.isArray(e.path)) set.add(e.path.join('/'));
    }
    return set;
  }

  function simulateApply(plan, existingTree) {
    var p = plan || { operations: [], folders: [], conflicts: [] };
    var ops = Array.isArray(p.operations) ? p.operations : [];
    var flds = Array.isArray(p.folders) ? p.folders : [];
    var existing = treeSet(existingTree);
    var creates = [];
    var seen = new Set();
    for (var i = 0; i < flds.length; i++) {
      var fp = Array.isArray(flds[i].path) ? flds[i].path.join('/') : String(flds[i].path || '');
      if (!existing.has(fp) && !seen.has(fp)) { seen.add(fp); creates.push(flds[i].path.slice()); }
    }
    return {
      creates: creates,
      moves: ops.length,
      conflicts: Array.isArray(p.conflicts) ? p.conflicts.slice() : []
    };
  }

  function verifyResult(before, after, plan) {
    var p = plan || { operations: [] };
    var ops = Array.isArray(p.operations) ? p.operations : [];
    var afterMap = new Map();
    var arr = Array.isArray(after) ? after : [];
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i];
      if (a && a.id !== undefined) afterMap.set(a.id, a);
    }
    var mismatches = [];
    var checked = 0;
    for (var j = 0; j < ops.length; j++) {
      var op = ops[j];
      checked++;
      var cur = afterMap.get(op.bookmarkId);
      var actual = cur ? (Array.isArray(cur.path) ? cur.path : []) : null;
      var expected = op.toFolder || [];
      var ok = !!cur && Array.isArray(actual) && actual.length === expected.length;
      if (ok) {
        for (var k = 0; k < expected.length; k++) {
          if (String(actual[k]) !== String(expected[k])) { ok = false; break; }
        }
      }
      if (!ok) mismatches.push({ bookmarkId: op.bookmarkId, expected: expected.slice(), actual: actual ? actual.slice() : actual });
    }
    return { ok: mismatches.length === 0, checked: checked, mismatches: mismatches };
  }

  return {
    planArchive: planArchive,
    planArchiveByDomain: planArchiveByDomain,
    planArchiveByType: planArchiveByType,
    planArchiveByDate: planArchiveByDate,
    planArchiveByFolder: planArchiveByFolder,
    simulateApply: simulateApply,
    verifyResult: verifyResult
  };
});
