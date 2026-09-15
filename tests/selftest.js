'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Require by path (tolerates globalThis.* or module.exports shapes).
const SMCore = require('../scripts/core-utils.js');
const SMDedupe = require('../scripts/dedupe.js');
const SMLinkChecker = require('../scripts/link-checker.js');
const SMPortableIO = require('../scripts/portable-io.js');
const SMBackup = require('../scripts/backup-manager.js');

describe('SMCore.normalizeUrl', () => {
  it('removes tracking, drops hash, sorts query, strips default port, collapses slash', () => {
    const a = SMCore.normalizeUrl('HTTP://Example.com:80/a/?utm_source=x&fbclid=1&b=2&a=1#top');
    assert.equal(a, 'http://example.com/a?a=1&b=2');
    const b = SMCore.normalizeUrl('https://example.com:443/x/?b=2&a=1');
    assert.equal(b, 'https://example.com/x?a=1&b=2');
    const c = SMCore.normalizeUrl('https://example.com/x/?utm_medium=y');
    assert.equal(c, 'https://example.com/x');
  });
});

describe('SMCore.getBaseDomain', () => {
  it('handles example.com, news.bbc.co.uk, 10jqka.com.cn', () => {
    assert.equal(SMCore.getBaseDomain('https://sub.example.com/p'), 'example.com');
    assert.equal(SMCore.getBaseDomain('https://news.bbc.co.uk/news'), 'bbc.co.uk');
    assert.equal(SMCore.getBaseDomain('https://stock.10jqka.com.cn/x'), '10jqka.com.cn');
  });
});

describe('SMCore.tokenizeTitle', () => {
  it('returns CJK bigrams and drops stopwords', () => {
    const toks = SMCore.tokenizeTitle('The Best Guide to Machine Learning 机器学习入门教程');
    assert.ok(toks.includes('machine'));
    assert.ok(toks.includes('learning'));
    assert.ok(!toks.includes('the'));
    assert.ok(!toks.includes('guide'));
    assert.ok(!toks.includes('best'));
    // CJK bigrams from 机器学习 (machine learning)
    assert.ok(toks.includes('机器') || toks.includes('器学') || toks.includes('学习'));
  });
});

describe('findDuplicates exact', () => {
  it('finds exact duplicates across tracking params and reports removeIds', () => {
    const bms = [
      { id: '1', url: 'https://example.com/a?utm_source=x', title: 'A' },
      { id: '2', url: 'https://example.com/a?fbclid=123#sec', title: 'A copy' },
      { id: '3', url: 'https://other.com/a', title: 'Other' },
    ];
    const res = SMDedupe.findDuplicates(bms);
    const exact = res.groups.filter((g) => g.type === 'exact');
    assert.equal(exact.length, 1);
    assert.equal(exact[0].items.length, 2);
    assert.ok(exact[0].keepId === '1' || exact[0].keepId === '2');
    assert.equal(exact[0].removeIds.length, 1);
    assert.deepEqual([...exact[0].removeIds, exact[0].keepId].sort(), ['1', '2']);
  });
});

describe('findDuplicates similar', () => {
  it('finds similar titles within same base domain above threshold', () => {
    const t1 = 'Sourdough Bread Baking Tutorial Complete Handbook';
    const t2 = 'Sourdough Bread Baking Tutorial Complete Handbook 2024';
    const bms = [
      { id: 'a', url: 'https://example.com/guides/sourdough-baking-handbook', title: t1 },
      { id: 'b', url: 'https://example.com/guides/sourdough-baking-handbook-2024', title: t2 },
      { id: 'c', url: 'https://other.org/guides/sourdough-baking-handbook', title: t1 },
    ];
    const res = SMDedupe.findDuplicates(bms, { threshold: 0.8 });
    const sim = res.groups.filter((g) => g.type === 'similar');
    assert.ok(sim.length >= 1);
    const g = sim.find((x) => x.items.some((i) => i.id === 'a') && x.items.some((i) => i.id === 'b'));
    assert.ok(g, 'expected a+b similar group, got ' + JSON.stringify(sim.map((s) => s.items.map((i) => i.id))));
    assert.ok(g.score >= 0.8);
    // cross-domain item must not leak in
    assert.ok(!g.items.some((i) => i.id === 'c'));
  });
});

describe('findDuplicates perf', () => {
  it('handles 3000 bookmarks under 5s', () => {
    const bms = [];
    for (let i = 0; i < 3000; i++) {
      bms.push({
        id: 'id' + i,
        url: 'https://site' + (i % 50) + '.example.com/page-' + i + '/unique-token-' + i,
        title: 'Unique bookmark title number ' + i + ' zebrafish ' + i,
      });
    }
    const start = Date.now();
    const res = SMDedupe.findDuplicates(bms);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 5000, 'took ' + elapsed + 'ms');
    assert.equal(res.stats.scanned, 3000);
  });
});

describe('link-checker checkBookmark', () => {
  let orig;
  beforeEach(() => { orig = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = orig; });

  it('maps 200->ok, 404->broken, 403->blocked, abort->timeout', async () => {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/ok')) return { status: 200, url: u, redirected: false };
      if (u.includes('/nf')) return { status: 404, url: u, redirected: false };
      if (u.includes('/deny')) return { status: 403, url: u, redirected: false };
      const e = new Error('The operation was aborted.');
      e.name = 'AbortError';
      throw e;
    };
    const base = { perHostIntervalMs: 0, retries: 0, timeoutMs: 2000, cache: false };
    const r1 = await SMLinkChecker.checkBookmark({ id: '1', url: 'https://x.test/ok', title: 't' }, base);
    assert.equal(r1.status, 'ok');
    assert.equal(r1.httpStatus, 200);
    const r2 = await SMLinkChecker.checkBookmark({ id: '2', url: 'https://x.test/nf', title: 't' }, base);
    assert.equal(r2.status, 'broken');
    assert.equal(r2.httpStatus, 404);
    const r3 = await SMLinkChecker.checkBookmark({ id: '3', url: 'https://x.test/deny', title: 't' }, base);
    assert.equal(r3.status, 'blocked');
    assert.equal(r3.httpStatus, 403);
    const r4 = await SMLinkChecker.checkBookmark({ id: '4', url: 'https://x.test/hang', title: 't' }, base);
    assert.equal(r4.status, 'timeout');
  });
});

describe('link-checker scan', () => {
  let orig;
  beforeEach(() => { orig = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = orig; });

  it('deduplicates identical URLs and fans results to all ids', async () => {
    let calls = 0;
    globalThis.fetch = async (url) => {
      calls += 1;
      return { status: 200, url: String(url), redirected: false };
    };
    const list = [
      { id: 'k1', url: 'https://dup.test/same', title: 'T1' },
      { id: 'k2', url: 'https://dup.test/same', title: 'T2' },
      { id: 'k3', url: 'https://dup.test/same', title: 'T3' },
    ];
    const out = await SMLinkChecker.scan(list, { perHostIntervalMs: 0, retries: 0, timeoutMs: 2000, cache: false, concurrency: 4 });
    assert.equal(out.results.length, 3);
    assert.equal(calls, 1);
    for (const r of out.results) assert.equal(r.status, 'ok');
    assert.deepEqual(out.results.map((r) => r.id).sort(), ['k1', 'k2', 'k3']);
  });
});

describe('portable-io netscape round-trip', () => {
  it('round-trips nested folders and entities', () => {
    const records = [
      { title: 'Fish & Chips <tasty> "quoted" ©', url: 'https://example.com/a?x=1&y=2', path: ['Food', 'British'], addDate: 1700000000000 },
      { title: 'Nested item', url: 'https://example.com/b', path: ['Food', 'British', 'Deep'], addDate: 1700000001000 },
      { title: 'Root item', url: 'https://example.com/c', path: [], addDate: null },
    ];
    const html = SMPortableIO.buildNetscapeHtml(records);
    const back = SMPortableIO.parseNetscapeHtml(html);
    assert.equal(back.length, 3);
    const byUrl = new Map(back.map((r) => [r.url, r]));
    assert.equal(byUrl.get('https://example.com/a?x=1&y=2').title, 'Fish & Chips <tasty> "quoted" ©');
    assert.deepEqual(byUrl.get('https://example.com/a?x=1&y=2').path, ['Food', 'British']);
    assert.deepEqual(byUrl.get('https://example.com/b').path, ['Food', 'British', 'Deep']);
    assert.deepEqual(byUrl.get('https://example.com/c').path, []);
  });
});

describe('backup-manager snapshot round-trip', () => {
  it('flattenTree + snapshotToHtml + restoreSnapshot preserves bookmark count', async () => {
    const tree = [{
      id: '0', title: '', children: [{
        id: '1', parentId: '0', title: 'Bar', children: [
          { id: '10', parentId: '1', title: 'Alpha & Beta', url: 'https://example.com/alpha', dateAdded: 1700000000000 },
          { id: '11', parentId: '1', title: 'Gamma', url: 'https://example.com/gamma', dateAdded: 1700000001000 },
          {
            id: '12', parentId: '1', title: 'Sub', children: [
              { id: '13', parentId: '12', title: 'Delta', url: 'https://example.com/delta', dateAdded: 1700000002000 },
            ],
          },
        ],
      }],
    }];
    const rows = SMBackup.flattenTree(tree);
    const bmCount = rows.filter((r) => r.url).length;
    assert.equal(bmCount, 3);
    const snapshot = { nodes: rows };
    const html = SMBackup.snapshotToHtml(snapshot);
    assert.ok(html.includes('https://example.com/alpha'));
    assert.ok(html.includes('https://example.com/gamma'));
    assert.ok(html.includes('https://example.com/delta'));
    // Fake adapter: track creates/removals.
    const created = [];
    const removed = [];
    const adapter = {
      removeTree: async (id) => { removed.push(String(id)); return true; },
      create: async (data) => { const n = { id: 'new-' + created.length }; created.push(data); return n; },
    };
    const res = await SMBackup.restoreSnapshot(snapshot, adapter);
    assert.equal(res.total, rows.length);
    assert.ok(res.created !== undefined && res.total !== undefined);
  });
});
