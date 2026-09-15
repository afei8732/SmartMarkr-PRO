/**
 * Snapshot backup / restore manager.
 *
 * Before any destructive bulk operation SmartMarkr writes a full bookmark tree
 * snapshot into chrome.storage.local (bounded ring buffer). Snapshots can be
 * restored or exported as JSON, which is what makes the bulk tools reversible
 * beyond the single-step undo stack.
 *
 * Exposed as `SMBackup`; also usable from Node tests with an injected adapter.
 */
(function (root, factory) {
  const api = factory(root.SMCore || (typeof require === 'function' ? require('./core-utils.js') : null));
  root.SMBackup = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  const STORAGE_KEY = 'smartmarkr.snapshots';
  const MAX_SNAPSHOTS = 5;
  const SNAPSHOT_VERSION = 1;

  function storageArea() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;
    return chrome.storage.local;
  }

  function callApi(fn, context, ...args) {
    return new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          const err = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError;
          if (err) reject(new Error(err.message || String(err)));
          else resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function readRaw() {
    const area = storageArea();
    if (!area) return [];
    const result = await callApi(area.get, area, STORAGE_KEY);
    const list = result && result[STORAGE_KEY];
    return Array.isArray(list) ? list : [];
  }

  async function writeRaw(list) {
    const area = storageArea();
    if (!area) return;
    await callApi(area.set, area, { [STORAGE_KEY]: list.slice(-MAX_SNAPSHOTS) });
  }

  /** Flatten a chrome bookmark tree into ordered {id,parentId,index,...} rows. */
  function flattenTree(tree) {
    const rows = [];
    const roots = Array.isArray(tree) ? tree : [tree];
    const visit = (node, parentId, index) => {
      if (!node) return;
      rows.push({
        id: node.id,
        parentId: parentId == null ? node.parentId : parentId,
        index: index == null ? node.index : index,
        title: node.title || '',
        url: node.url || null,
        dateAdded: node.dateAdded || null,
        dateGroupModified: node.dateGroupModified || null
      });
      if (Array.isArray(node.children)) {
        node.children.forEach((child, i) => visit(child, node.id, i));
      }
    };
    roots.forEach((node, i) => visit(node, node.parentId, i));
    return rows;
  }

  function countNodes(rows) {
    let bookmarks = 0;
    let folders = 0;
    for (const row of rows) {
      if (row.url) bookmarks += 1;
      else folders += 1;
    }
    return { bookmarks, folders, total: rows.length };
  }

  function describeAction(action, details) {
    const base = String(action || 'unknown');
    if (!details) return base;
    if (details.count != null) return base + ' (' + details.count + ')';
    return base;
  }

  async function createSnapshot(tree, action, details) {
    const rows = flattenTree(tree);
    const stats = countNodes(rows);
    const snapshot = {
      version: SNAPSHOT_VERSION,
      id: 'snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      action: describeAction(action, details),
      details: details || null,
      stats,
      nodes: rows
    };
    const existing = await readRaw();
    existing.push(snapshot);
    await writeRaw(existing);
    return snapshot;
  }

  async function listSnapshots() {
    const list = await readRaw();
    return list
      .map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        action: item.action,
        stats: item.stats || countNodes(item.nodes || [])
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async function getSnapshot(id) {
    const list = await readRaw();
    return list.find((item) => item.id === id) || null;
  }

  async function deleteSnapshot(id) {
    const list = await readRaw();
    await writeRaw(list.filter((item) => item.id !== id));
  }

  async function clearSnapshots() {
    await writeRaw([]);
  }

  function snapshotToJson(snapshot) {
    return JSON.stringify(snapshot, null, 2);
  }

  function snapshotToHtml(snapshot) {
    const rows = (snapshot && snapshot.nodes) || [];
    const escape = (value) => String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>'
    ];

    const byParent = new Map();
    for (const row of rows) {
      const parent = row.parentId == null ? '__root__' : row.parentId;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(row);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => (a.index == null ? 0 : a.index) - (b.index == null ? 0 : b.index));
    }

    const seen = new Set();
    const emit = (parentId, depth) => {
      const indent = '    '.repeat(depth + 1);
      for (const row of byParent.get(parentId) || []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (row.url) {
          lines.push(indent + '<DT><A HREF="' + escape(row.url) + '" ADD_DATE="' +
            escape(row.dateAdded || '') + '">' + escape(row.title) + '</A>');
        } else {
          lines.push(indent + '<DT><H3 ADD_DATE="' + escape(row.dateAdded || '') + '">' +
            escape(row.title) + '</H3>');
          lines.push(indent + '<DL><p>');
          emit(row.id, depth + 1);
          lines.push(indent + '</DL><p>');
        }
      }
    };
    emit('__root__', 0);
    lines.push('</DL><p>');
    return lines.join('\n');
  }

  /**
   * Restore a snapshot through an injected bookmark adapter:
   *   { removeTree(id), create(data) }
   * Existing non-restorable roots are skipped; everything is first removed to
   * keep the resulting tree identical to the snapshot.
   */
  async function restoreSnapshot(snapshot, adapter, options) {
    const opts = options || {};
    if (!snapshot || !Array.isArray(snapshot.nodes)) {
      throw new Error('Invalid snapshot payload');
    }
    const rows = snapshot.nodes;
    const roots = rows.filter((row) => row.parentId == null || row.parentId === '0');
    const removable = opts.removableIds ? new Set(opts.removableIds) : null;
    // Browser-managed root ids that must be reused rather than recreated.
    const BUILTIN_ROOTS = new Set(opts.builtinRootIds || ['0', '1', '2', '3']);

    for (const root of roots) {
      if (BUILTIN_ROOTS.has(String(root.id))) continue;
      const canRemove = !removable || removable.has(root.id);
      if (!canRemove) continue;
      try {
        await adapter.removeTree(root.id);
      } catch {
        /* root may already be gone */
      }
    }

    // Built-in roots are reused; everything else is recreated with a fresh id.
    const idMap = new Map();
    const rootIdMap = opts.rootIdMap || {};
    for (const row of roots) {
      if (BUILTIN_ROOTS.has(String(row.id))) {
        idMap.set(row.id, rootIdMap[row.id] || row.id);
      }
    }
    if (opts.targetFolderId) {
      idMap.set('__target__', opts.targetFolderId);
    }
    const ordered = rows.slice().sort((a, b) => {
      const depthA = a.url ? 1 : 0;
      const depthB = b.url ? 1 : 0;
      return depthA - depthB;
    });
    let created = 0;
    for (const row of ordered) {
      if (idMap.has(row.id)) continue;
      const parentId = row.parentId == null ? null : idMap.get(row.parentId);
      if (parentId == null) continue;
      const data = { parentId, title: row.title };
      if (row.url) data.url = row.url;
      if (row.index != null) data.index = row.index;
      try {
        const result = await adapter.create(data);
        idMap.set(row.id, result && result.id != null ? result.id : row.id);
        created += 1;
      } catch {
        /* keep restoring the rest */
      }
    }
    return { created, total: rows.length };
  }

  async function maybeCreateSnapshot(tree, action, details, enabled) {
    if (enabled === false) return null;
    return createSnapshot(tree, action, details);
  }

  return {
    STORAGE_KEY,
    MAX_SNAPSHOTS,
    SNAPSHOT_VERSION,
    flattenTree,
    countNodes,
    createSnapshot,
    maybeCreateSnapshot,
    listSnapshots,
    getSnapshot,
    deleteSnapshot,
    clearSnapshots,
    snapshotToJson,
    snapshotToHtml,
    restoreSnapshot
  };
});
