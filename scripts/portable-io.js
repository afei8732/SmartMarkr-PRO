(function (root, factory) {
  var core = null;
  try {
    if (typeof require === 'function') core = require('./core-utils.js');
  } catch (e) { core = null; }
  if (!core && root && root.SMCore) core = root.SMCore;
  var api = factory(core);
  root.SMPortableIO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (SMCore) {
  'use strict';

  function getCore() {
    if (SMCore && typeof SMCore.normalizeUrl === 'function') return SMCore;
    if (typeof globalThis !== 'undefined' && globalThis.SMCore && typeof globalThis.SMCore.normalizeUrl === 'function') return globalThis.SMCore;
    return null;
  }

  function fallbackNormalize(input) {
    return String(input == null ? '' : input).trim().toLowerCase();
  }

  function normalizeUrl(url) {
    var core = getCore();
    try {
      if (core) return core.normalizeUrl(url);
    } catch (e) { /* fall through */ }
    return fallbackNormalize(url);
  }

  function exportJson(payload) {
    return JSON.stringify({
      schema: 'smartmarkr.backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: payload === undefined ? null : payload
    }, null, 2);
  }

  function parseJson(text) {
    try {
      var data = JSON.parse(String(text));
      return { ok: true, data: data, error: null };
    } catch (e) {
      return { ok: false, data: null, error: String((e && e.message) || e) };
    }
  }

  var NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    nbsp: ' ', copy: '©', reg: '®', hellip: '…',
    ndash: '–', mdash: '—', laquo: '«', raquo: '»'
  };

  function decodeHtmlEntities(text) {
    var s = String(text == null ? '' : text);
    if (s.indexOf('&') === -1) return s;
    return s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]+));/g, function (m, dec, hex, name) {
      try {
        if (dec) {
          var cp = parseInt(dec, 10);
          if (!isFinite(cp)) return m;
          return String.fromCodePoint(cp);
        }
        if (hex) {
          var cp2 = parseInt(hex, 16);
          if (!isFinite(cp2)) return m;
          return String.fromCodePoint(cp2);
        }
        var key = String(name);
        if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)) return NAMED_ENTITIES[key];
        var lower = key.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower];
        return m;
      } catch (e) { return m; }
    });
  }

  function parseAttrs(src) {
    var attrs = {};
    var i = 0;
    var n = src.length;
    function skipWs() { while (i < n && /\s/.test(src[i])) i++; }
    while (i < n) {
      skipWs();
      if (i >= n || src[i] === '/') { i++; continue; }
      var nameStart = i;
      while (i < n && /[^\s=/>]/.test(src[i])) i++;
      if (i <= nameStart) { i++; continue; }
      var name = src.slice(nameStart, i).toLowerCase();
      skipWs();
      var value = '';
      if (i < n && src[i] === '=') {
        i++;
        skipWs();
        if (i < n && (src[i] === '"' || src[i] === "'")) {
          var q = src[i];
          i++;
          var vStart = i;
          while (i < n && src[i] !== q) i++;
          value = src.slice(vStart, i);
          if (i < n) i++;
        } else {
          var uStart = i;
          while (i < n && !/\s/.test(src[i]) && src[i] !== '>' && src[i] !== '<') i++;
          value = src.slice(uStart, i);
        }
        try { value = decodeHtmlEntities(value); } catch (e) { /* keep raw */ }
      }
      if (name) attrs[name] = value;
    }
    return attrs;
  }

  function parseNetscapeHtml(html) {
    var s = String(html == null ? '' : html);
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    var records = [];
    var folderStack = [];
    var dlStack = [];
    var pendingFolder = null;
    var hasPending = false;
    var h3Open = false;
    var h3Buf = '';
    var aOpen = false;
    var aAttrs = null;
    var aBuf = '';

    function finalizeH3() {
      if (!h3Open) return;
      h3Open = false;
      var title = '';
      try { title = decodeHtmlEntities(h3Buf).trim(); } catch (e) { title = h3Buf.trim(); }
      pendingFolder = title;
      hasPending = true;
      h3Buf = '';
    }

    function finalizeAnchor() {
      if (!aOpen) return;
      aOpen = false;
      var attrs = aAttrs || {};
      aAttrs = null;
      var href = attrs.href != null ? String(attrs.href).trim() : '';
      var title = '';
      try { title = decodeHtmlEntities(aBuf).replace(/\s+/g, ' ').trim(); }
      catch (e) { title = String(aBuf).replace(/\s+/g, ' ').trim(); }
      aBuf = '';
      if (!href) return;
      var addDate = null;
      var rawDate = attrs.add_date != null ? attrs.add_date : attrs.adddate;
      if (rawDate != null && String(rawDate).trim() !== '') {
        var num = Number(String(rawDate).trim());
        if (isFinite(num)) addDate = num;
      }
      var icon = attrs.icon != null ? String(attrs.icon) : (attrs.icon_uri != null ? String(attrs.icon_uri) : null);
      if (icon != null && icon.trim() === '') icon = null;
      records.push({ title: title, url: href, path: folderStack.slice(), addDate: addDate, icon: icon || null });
    }

    var i = 0;
    var n = s.length;
    while (i < n) {
      var ch = s[i];
      if (ch !== '<') {
        var tStart = i;
        while (i < n && s[i] !== '<') i++;
        var text = s.slice(tStart, i);
        if (aOpen) aBuf += text;
        else if (h3Open) h3Buf += text;
        continue;
      }
      if (s.slice(i, i + 4) === '<!--') {
        var cEnd = s.indexOf('-->', i + 4);
        if (cEnd === -1) break;
        i = cEnd + 3;
        continue;
      }
      if (s.slice(i, i + 9).toUpperCase() === '<![CDATA[') {
        var cdEnd = s.indexOf(']]>', i + 9);
        var inner;
        if (cdEnd === -1) { inner = s.slice(i + 9); i = n; }
        else { inner = s.slice(i + 9, cdEnd); i = cdEnd + 3; }
        if (aOpen) aBuf += inner;
        else if (h3Open) h3Buf += inner;
        continue;
      }
      var j = i + 1;
      var quote = null;
      while (j < n) {
        var c = s[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
        j++;
      }
      if (j >= n) {
        var tail = s.slice(i + 1, Math.min(i + 200, n));
        if (aOpen && /^\s*\/a\s*$/i.test(tail) === false) { /* unclosed: finalize at EOF */ }
        break;
      }
      var tagInner = s.slice(i + 1, j);
      i = j + 1;
      var trimmed = tagInner.trim();
      if (!trimmed) continue;
      var upper = trimmed.toUpperCase();
      if (upper.slice(0, 8) === '!DOCTYPE' || upper[0] === '!' || upper[0] === '?') continue;
      var isClose = trimmed[0] === '/';
      var rest = isClose ? trimmed.slice(1).trim() : trimmed;
      var sp = rest.search(/\s|\//);
      var tagName = (sp === -1 ? rest : rest.slice(0, sp)).toLowerCase();
      tagName = tagName.replace(/\/$/, '');
      var attrSrc = sp === -1 ? '' : rest.slice(sp);
      if (!tagName) continue;

      if (tagName === 'h3' && !isClose) {
        if (aOpen) finalizeAnchor();
        if (h3Open) finalizeH3();
        h3Open = true;
        h3Buf = '';
        continue;
      }
      if (tagName === 'h3' && isClose) { finalizeH3(); continue; }
      if (tagName === 'a' && !isClose) {
        if (aOpen) finalizeAnchor();
        if (h3Open) finalizeH3();
        aAttrs = parseAttrs(attrSrc);
        aOpen = true;
        aBuf = '';
        continue;
      }
      if (tagName === 'a' && isClose) { finalizeAnchor(); continue; }
      if (tagName === 'dl' && !isClose) {
        if (aOpen) finalizeAnchor();
        if (h3Open) finalizeH3();
        if (hasPending) {
          folderStack.push(pendingFolder);
          dlStack.push(pendingFolder);
          pendingFolder = null;
          hasPending = false;
        } else {
          dlStack.push(null);
        }
        continue;
      }
      if (tagName === 'dl' && isClose) {
        if (aOpen) finalizeAnchor();
        if (h3Open) finalizeH3();
        hasPending = false;
        pendingFolder = null;
        var popped = dlStack.length ? dlStack.pop() : null;
        if (popped != null && folderStack.length) folderStack.pop();
        continue;
      }
      if (tagName === 'dt') {
        if (aOpen) finalizeAnchor();
        if (h3Open) finalizeH3();
        hasPending = false;
        pendingFolder = null;
        continue;
      }
      if ((tagName === 'p' || tagName === 'hr' || tagName === 'meta' || tagName === 'title' || tagName === 'h1' || tagName === 'br') && !isClose) {
        continue;
      }
      if (tagName === 'p' && isClose) continue;
    }
    finalizeAnchor();
    return records;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildNetscapeHtml(records) {
    var list = Array.isArray(records) ? records : [];
    var lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>'
    ];
    var root = { folders: new Map(), bookmarks: [] };
    for (var k = 0; k < list.length; k++) {
      var rec = list[k] || {};
      var path = Array.isArray(rec.path) ? rec.path : [];
      var node = root;
      for (var d = 0; d < path.length; d++) {
        var seg = String(path[d] == null ? '' : path[d]);
        if (!node.folders.has(seg)) node.folders.set(seg, { folders: new Map(), bookmarks: [] });
        node = node.folders.get(seg);
      }
      node.bookmarks.push(rec);
    }
    function emit(node, depth) {
      var indent = '    '.repeat(depth + 1);
      node.bookmarks.forEach(function (rec) {
        var url = String(rec.url == null ? '' : rec.url);
        var title = String(rec.title == null ? '' : rec.title);
        var addDate = rec.addDate != null && isFinite(Number(rec.addDate)) ? ' ADD_DATE="' + escapeHtml(String(rec.addDate)) + '"' : '';
        var icon = rec.icon ? ' ICON="' + escapeHtml(String(rec.icon)) + '"' : '';
        lines.push(indent + '<DT><A HREF="' + escapeHtml(url) + '"' + addDate + icon + '>' + escapeHtml(title) + '</A>');
      });
      node.folders.forEach(function (child, name) {
        lines.push(indent + '<DT><H3>' + escapeHtml(name) + '</H3>');
        lines.push(indent + '<DL><p>');
        emit(child, depth + 1);
        lines.push(indent + '</DL><p>');
      });
    }
    emit(root, 0);
    lines.push('</DL><p>');
    return lines.join('\n');
  }

  function isValidUrl(url) {
    if (typeof url !== 'string' || !url.trim()) return false;
    var core = getCore();
    if (core && typeof core.safeUrl === 'function') {
      try {
        var u = core.safeUrl(url.trim());
        if (!u) return false;
        var proto = String(u.protocol || '').toLowerCase();
        return proto === 'http:' || proto === 'https:';
      } catch (e) { return false; }
    }
    try {
      var parsed = new URL(url.trim());
      var p = parsed.protocol.toLowerCase();
      return p === 'http:' || p === 'https:';
    } catch (e) {
      try {
        var parsed2 = new URL('https://' + url.trim());
        return !!parsed2.hostname;
      } catch (e2) { return false; }
    }
  }

  function validateRecords(records) {
    var list = Array.isArray(records) ? records : [];
    var valid = [];
    var invalid = [];
    var duplicates = [];
    var seen = new Map();
    for (var idx = 0; idx < list.length; idx++) {
      var rec = list[idx];
      try {
        if (!rec || typeof rec !== 'object') {
          invalid.push({ index: idx, record: rec, error: 'not an object' });
          continue;
        }
        var url = rec.url;
        if (typeof url !== 'string' || !url.trim()) {
          invalid.push({ index: idx, record: rec, error: 'missing url' });
          continue;
        }
        if (!isValidUrl(url)) {
          invalid.push({ index: idx, record: rec, error: 'invalid url' });
          continue;
        }
        var key = normalizeUrl(url);
        if (seen.has(key)) {
          duplicates.push({ index: idx, url: url, duplicateOf: seen.get(key) });
        } else {
          seen.set(key, idx);
        }
        valid.push(rec);
      } catch (e) {
        invalid.push({ index: idx, record: rec, error: String((e && e.message) || e) });
      }
    }
    return {
      ok: invalid.length === 0,
      valid: valid,
      invalid: invalid,
      duplicates: duplicates,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount: duplicates.length
    };
  }

  async function importBookmarks(records, adapter, options) {
    var opts = options || {};
    var conflictPolicy = opts.conflictPolicy || 'skip';
    var dedupeByUrl = opts.dedupeByUrl !== false;
    var dryRun = !!opts.dryRun;
    var targetFolderId = opts.targetFolderId != null ? opts.targetFolderId : null;
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    var result = { created: 0, skipped: 0, failed: 0, errors: [] };
    var list = Array.isArray(records) ? records : [];
    var ad = adapter || {};

    var existingByUrl = new Map();
    if (dedupeByUrl && (conflictPolicy === 'skip' || conflictPolicy === 'overwrite')) {
      try {
        if (typeof ad.getChildren === 'function') {
          var children = await ad.getChildren(targetFolderId);
          if (Array.isArray(children)) {
            for (var c = 0; c < children.length; c++) {
              var child = children[c];
              if (!child || !child.url) continue;
              try {
                var key = normalizeUrl(child.url);
                if (!existingByUrl.has(key)) existingByUrl.set(key, []);
                existingByUrl.get(key).push(child);
              } catch (e) { /* ignore one bad child */ }
            }
          }
        }
      } catch (e) { /* proceed without existing map */ }
    }
    var batchSeen = new Set();

    for (var idx = 0; idx < list.length; idx++) {
      var rec = list[idx];
      try {
        var title = rec && rec.title != null ? String(rec.title) : '';
        var url = rec && rec.url != null ? String(rec.url).trim() : '';
        if (!url || !isValidUrl(url)) {
          result.failed += 1;
          result.errors.push({ index: idx, title: title, error: 'invalid url' });
          if (onProgress) { try { onProgress(idx + 1, list.length); } catch (e) {} }
          continue;
        }
        var key2 = dedupeByUrl ? normalizeUrl(url) : null;
        var exists = key2 != null && existingByUrl.has(key2) ? existingByUrl.get(key2) : null;
        var inBatch = key2 != null && batchSeen.has(key2);

        if (dedupeByUrl && conflictPolicy === 'skip' && (inBatch || (exists && exists.length))) {
          result.skipped += 1;
          if (onProgress) { try { onProgress(idx + 1, list.length); } catch (e) {} }
          continue;
        }
        if (dedupeByUrl && conflictPolicy === 'overwrite' && exists && exists.length) {
          if (!dryRun) {
            for (var e2 = 0; e2 < exists.length; e2++) {
              var ex = exists[e2];
              try {
                if (typeof ad.remove === 'function') await ad.remove(ex.id);
                else if (typeof ad.removeTree === 'function') await ad.removeTree(ex.id);
              } catch (e) { /* keep going */ }
            }
          }
          existingByUrl.set(key2, []);
        }
        if (dryRun) {
          result.created += 1;
          if (key2 != null) batchSeen.add(key2);
          if (onProgress) { try { onProgress(idx + 1, list.length); } catch (e) {} }
          continue;
        }
        var data = { parentId: targetFolderId, title: title, url: url };
        if (typeof ad.create !== 'function') throw new Error('adapter.create is not a function');
        await ad.create(data);
        result.created += 1;
        if (key2 != null) {
          batchSeen.add(key2);
          if (!existingByUrl.has(key2)) existingByUrl.set(key2, []);
        }
      } catch (e) {
        result.failed += 1;
        var t = (rec && rec.title != null) ? String(rec.title) : '';
        result.errors.push({ index: idx, title: t, error: String((e && e.message) || e) });
      }
      if (onProgress) { try { onProgress(idx + 1, list.length); } catch (e) {} }
    }
    return result;
  }

  return {
    exportJson: exportJson,
    parseJson: parseJson,
    decodeHtmlEntities: decodeHtmlEntities,
    parseNetscapeHtml: parseNetscapeHtml,
    buildNetscapeHtml: buildNetscapeHtml,
    validateRecords: validateRecords,
    importBookmarks: importBookmarks
  };
});
