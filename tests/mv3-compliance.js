/**
 * Manifest V3 compliance checks that do not require a browser.
 *
 * Chrome silently refuses to load an extension that violates MV3 rules, and
 * the failure surfaces only in chrome://extensions. These checks turn the most
 * common load-time rejections into fast, deterministic test failures:
 *   - manifest parses and declares MV3 with action/service_worker (not MV2 fields)
 *   - no inline scripts and no inline event handlers (MV3 CSP blocks both)
 *   - no remotely hosted script sources
 *   - no eval / new Function (MV3 CSP blocks both)
 *   - every file referenced by the manifest and by manager.html exists
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

test("manifest is valid JSON with no BOM and declares Manifest V3", () => {
  const raw = read("manifest.json");
  assert.notEqual(raw.charCodeAt(0), 0xfeff, "manifest.json must not start with a BOM");
  const manifest = JSON.parse(stripBom(raw));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.action, "MV3 requires the action field");
  assert.equal(manifest.browser_action, undefined, "MV2 browser_action must be removed");
  assert.ok(manifest.background && manifest.background.service_worker, "MV3 requires a service worker");
  assert.equal(manifest.background.scripts, undefined, "background.scripts is MV2-only");
  assert.equal(manifest.background.persistent, undefined, "background.persistent is MV2-only");
  assert.equal(manifest.content_security_policy, undefined, "no custom CSP should be needed");
});

test("manifest permissions are minimal and host access is declared separately", () => {
  const manifest = JSON.parse(stripBom(read("manifest.json")));
  const permissions = manifest.permissions || [];
  assert.deepEqual([...permissions].sort(), ["bookmarks", "storage", "tabs"]);
  assert.ok(!permissions.includes("<all_urls>"), "host patterns must live in host_permissions under MV3");
  assert.deepEqual(manifest.host_permissions, ["<all_urls>"]);
  assert.equal(manifest.content_scripts, undefined, "extension does not inject content scripts");
});

test("every manifest-referenced file exists on disk", () => {
  const manifest = JSON.parse(stripBom(read("manifest.json")));
  const referenced = new Set();
  const collect = (value) => {
    if (typeof value === "string") {
      if (/\.(js|html|css|png|svg|jpg|jpeg)$/i.test(value)) referenced.add(value);
      return;
    }
    if (Array.isArray(value)) return value.forEach(collect);
    if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(manifest);
  assert.ok(referenced.size > 0, "manifest should reference at least one file");
  for (const rel of referenced) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), "missing manifest-referenced file: " + rel);
  }
});

test("manager.html has no inline scripts and no inline event handlers", () => {
  const html = read("manager.html");
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  for (const tag of scriptTags) {
    assert.match(tag, /\bsrc\s*=/i, "inline script violates MV3 CSP: " + tag);
  }
  const handler = html.match(/\son(click|load|change|input|submit|error|focus|blur|keydown|keyup|mouseover|mouseout)\s*=/gi);
  assert.equal(handler, null, "inline event handlers violate MV3 CSP: " + (handler || []).join(", "));
});

test("manager.html loads scripts locally and in dependency order", () => {
  const html = read("manager.html");
  const tags = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/gi)].map((m) => m[1]);
  assert.deepEqual(tags, [
    "scripts/core-utils.js",
    "scripts/backup-manager.js",
    "scripts/dedupe.js",
    "scripts/link-checker.js",
    "scripts/portable-io.js",
    "scripts/archive-classifier.js",
    "scripts/archive-planner.js",
    "scripts/ai-client.js",
    "scripts/ai-analyzer.js",
    "scripts/manager.js"
  ]);
  for (const tag of tags) {
    assert.ok(!/^https?:/i.test(tag), "remote script sources are not permitted: " + tag);
    assert.ok(fs.existsSync(path.join(ROOT, tag)), "missing script file: " + tag);
  }
});

test("no eval or new Function in shipped scripts", () => {
  const dirs = ["scripts", "background"];
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".js")) {
        const text = read(rel);
        if (/\beval\s*\(/.test(text) || /new\s+Function\s*\(/.test(text)) offenders.push(rel);
      }
    }
  };
  dirs.forEach(walk);
  assert.deepEqual(offenders, [], "dynamic code evaluation violates MV3 CSP: " + offenders.join(", "));
});

test("service worker uses chrome.action (not the MV2 browserAction)", () => {
  const sw = read("background/service-worker.js");
  assert.match(sw, /chrome\.action\.onClicked/);
  assert.doesNotMatch(sw, /chrome\.browserAction/);
});

test("manager.js contains no MV2-only API usage", () => {
  const manager = read("scripts/manager.js");
  assert.doesNotMatch(manager, /chrome\.browserAction/);
  assert.doesNotMatch(manager, /chrome\.extension\.getBackgroundPage/);
});

test("every engine module is UMD and exposes a global", () => {
  const modules = {
    "scripts/core-utils.js": "SMCore",
    "scripts/backup-manager.js": "SMBackup",
    "scripts/dedupe.js": "SMDedupe",
    "scripts/link-checker.js": "SMLinkChecker",
    "scripts/portable-io.js": "SMPortableIO"
  };
  for (const [rel, globalName] of Object.entries(modules)) {
    const text = read(rel);
    assert.ok(text.includes(globalName), rel + " must expose " + globalName);
    assert.match(text, /module\.exports/, rel + " must be requireable from Node");
  }
});
