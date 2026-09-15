/**
 * Regression tests for the archive + AI engines.
 *
 * The AI tests use a stubbed global fetch so they stay offline and
 * deterministic. One of them specifically pins the chatJSON call signature
 * (config, messages, options): an earlier revision passed the arguments in the
 * opposite order and every AI batch silently fell back to local classification.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const SMArchive = require("../scripts/archive-classifier.js");
const SMArchivePlanner = require("../scripts/archive-planner.js");
const SMAI = require("../scripts/ai-client.js");
const SMAIAnalyzer = require("../scripts/ai-analyzer.js");

const realFetch = global.fetch;

function stubFetch(handler) {
  global.fetch = handler;
}

test.afterEach(() => {
  global.fetch = realFetch;
});

test("classifier maps well-known hosts to stable category ids", () => {
  const cases = [
    [{ title: "OpenAI docs", url: "https://platform.openai.com/docs" }, "ai"],
    [{ title: "tutorial", url: "https://github.com/x/y" }, "dev"],
    [{ title: "podcast", url: "https://www.xiaoyuzhoufm.com/episode/1" }, "audio"],
    [{ title: "Unknown", url: "https://totally-unknown-xyz.example/" }, "other"]
  ];
  for (const [bookmark, expected] of cases) {
    assert.equal(SMArchive.classify(bookmark).category, expected, JSON.stringify(bookmark));
  }
});

test("classifier handles malformed and non-http urls without throwing", () => {
  for (const url of ["", "not a url", "chrome://bookmarks", "file:///C:/x.html", null]) {
    const result = SMArchive.classify({ id: "x", title: "", url });
    assert.ok(result && typeof result.category === "string");
  }
});

test("classifyAll reports stats and groups", () => {
  const bookmarks = [
    { id: "1", title: "OpenAI", url: "https://platform.openai.com/docs" },
    { id: "2", title: "GitHub", url: "https://github.com/a/b" },
    { id: "3", title: "GitHub 2", url: "https://github.com/c/d" }
  ];
  const result = SMArchive.classifyAll(bookmarks);
  assert.equal(result.stats.total, 3);
  const dev = result.groups.find((g) => g.category === "dev");
  assert.ok(dev && dev.items.length === 2);
});

test("planner is idempotent for bookmarks already inside the archive root", () => {
  const bookmarks = [
    { id: "1", title: "A", url: "https://github.com/a", path: [] },
    { id: "2", title: "B", url: "https://github.com/b", path: [] },
    { id: "3", title: "C", url: "https://github.com/c", path: ["📦 SmartMarkr 归档", "开发"] }
  ];
  const plan = SMArchivePlanner.planArchive(bookmarks, { strategy: "domain" });
  assert.equal(plan.stats.movable, 2);
  assert.ok(!plan.operations.some((op) => op.bookmarkId === "3"));
});

test("planner never mutates its input", () => {
  const bookmarks = [{ id: "1", title: "A", url: "https://github.com/a", path: [] }];
  const snapshot = JSON.stringify(bookmarks);
  SMArchivePlanner.planArchive(bookmarks, { strategy: "domain", minGroupSize: 1 });
  assert.equal(JSON.stringify(bookmarks), snapshot);
});

test("ai client normalizes base urls with or without /v1", () => {
  assert.equal(SMAI.normalizeBaseUrl("http://h:8787"), "http://h:8787/v1");
  assert.equal(SMAI.normalizeBaseUrl("http://h:8787/v1/"), "http://h:8787/v1");
  assert.equal(SMAI.normalizeBaseUrl("https://api.example.com/openai/v1"), "https://api.example.com/openai/v1");
});

test("ai client lists models from either response shape", async () => {
  stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ data: [{ id: "m1" }, { id: "m2" }] }) }));
  const models = await SMAI.listModels({ baseUrl: "http://h:8787" });
  assert.deepEqual(models, ["m1", "m2"]);
});

test("ai client retries on 429 and eventually succeeds", async () => {
  let calls = 0;
  stubFetch(async () => {
    calls += 1;
    if (calls < 3) return { ok: false, status: 429, text: async () => "rate limited" };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "OK" } }] }) };
  });
  const result = await SMAI.chat({ baseUrl: "http://h:8787", model: "m" }, [{ role: "user", content: "x" }], { retries: 3 });
  assert.equal(result.text, "OK");
  assert.equal(calls, 3);
});

test("ai client fails fast on 401 without leaking the api key", async () => {
  stubFetch(async () => ({ ok: false, status: 401, text: async () => "unauthorized" }));
  const secret = "sk-super-secret-value";
  await assert.rejects(
    () => SMAI.chat({ baseUrl: "http://h:8787", apiKey: secret, model: "m" }, [{ role: "user", content: "x" }], { retries: 2 }),
    (error) => {
      assert.ok(/401/.test(error.message), "message should mention the status");
      assert.ok(!error.message.includes(secret), "message must not leak the api key");
      return true;
    }
  );
});

test("ai client repairs fenced JSON with trailing commas", async () => {
  stubFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: "Here:\n```json\n{\"assignments\":[{\"id\":\"1\",}],}\n```\ndone" } }] })
  }));
  const result = await SMAI.chatJSON({ baseUrl: "http://h:8787", model: "m" }, [{ role: "user", content: "x" }]);
  assert.ok(result.data && Array.isArray(result.data.assignments));
  assert.equal(result.data.assignments[0].id, "1");
});

test("analyzer parser drops unknown categories instead of throwing", () => {
  const text = '{"assignments":[{"id":"1","category":"ai","confidence":0.9,"tags":["x"],"reason":"r"},{"id":"2","category":"NOPE","confidence":0.5}]}';
  const parsed = SMAIAnalyzer.parseAssignments(text, new Set(["ai", "dev", "other"]));
  assert.equal(parsed.assignments.length, 1);
  assert.equal(parsed.assignments[0].category, "ai");
  assert.ok(parsed.invalid.length >= 1);
});

test("analyzer prompt lists the taxonomy and demands strict JSON", () => {
  const messages = SMAIAnalyzer.buildMessages([{ id: "1", title: "T", url: "https://e.example" }], SMAIAnalyzer.DEFAULT_TAXONOMY);
  assert.ok(Array.isArray(messages) && messages.length >= 2);
  const joined = messages.map((m) => m.content).join(" ");
  assert.ok(joined.includes("assignments"), "prompt must describe the output schema");
  for (const id of ["ai", "dev", "docs", "video", "other"]) {
    assert.ok(joined.includes(id), "prompt must list category " + id);
  }
});

test("analyzer calls the AI client with (config, messages) argument order", async () => {
  // This pins the signature: swapping the two arguments makes every batch fail
  // and silently degrade to the local classifier.
  const seen = [];
  stubFetch(async (url, init) => {
    seen.push({ url: String(url), body: JSON.parse(init.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"assignments":[{"id":"1","category":"ai","confidence":0.9,"tags":[],"reason":"model"}]}' } }]
      })
    };
  });

  const config = { baseUrl: "http://h:8787", apiKey: "k", model: "m" };
  const result = await SMAIAnalyzer.analyzeBookmarks(
    [{ id: "1", title: "OpenAI", url: "https://platform.openai.com/docs" }],
    config,
    { batchSize: 5, concurrency: 1 }
  );

  assert.equal(seen.length, 1, "one batch should issue exactly one request");
  assert.match(seen[0].url, /\/v1\/chat\/completions$/);
  assert.ok(Array.isArray(seen[0].body.messages) && seen[0].body.messages.length >= 2, "request body must carry the messages");
  assert.equal(seen[0].body.model, "m");
  assert.equal(result.stats.fallback, 0, "AI results must not fall back when the call succeeds");
  assert.equal(result.results[0].source, "ai");
  assert.equal(result.results[0].category, "ai");
});

test("analyzer falls back to the local classifier when no AI is configured", async () => {
  const result = await SMAIAnalyzer.analyzeBookmarks(
    [
      { id: "1", title: "OpenAI", url: "https://platform.openai.com/docs" },
      { id: "2", title: "GitHub", url: "https://github.com/a/b" }
    ],
    {},
    { batchSize: 10 }
  );
  assert.equal(result.stats.fallback, 2);
  assert.ok(result.results.every((r) => r.source === "local"));
  assert.deepEqual(result.stats.byCategory, { ai: 1, dev: 1 });
});

test("analyzer never rejects when the model fails", async () => {
  stubFetch(async () => ({ ok: false, status: 500, text: async () => "boom" }));
  const result = await SMAIAnalyzer.analyzeBookmarks(
    [{ id: "1", title: "OpenAI", url: "https://platform.openai.com/docs" }],
    { baseUrl: "http://h:8787", apiKey: "k", model: "m" },
    { batchSize: 5, concurrency: 1 }
  );
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].source, "local");
  assert.ok(result.stats.fallback >= 1);
});

test("analyzer only sends trimmed bookmark fields to the model", async () => {
  let sent = null;
  stubFetch(async (url, init) => {
    sent = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"assignments":[{"id":"1","category":"other","confidence":0.5,"tags":[],"reason":"x"}]}' } }] })
    };
  });
  const longTitle = "T".repeat(500);
  const longUrl = "https://e.example/" + "u".repeat(600);
  await SMAIAnalyzer.analyzeBookmarks(
    [{ id: "1", title: longTitle, url: longUrl, path: ["a", "b", "c"], dateAdded: 1, parentId: "42" }],
    { baseUrl: "http://h:8787", apiKey: "k", model: "m" },
    { batchSize: 5, concurrency: 1 }
  );
  const payload = JSON.stringify(sent);
  assert.ok(!payload.includes("parentId"), "internal fields must not be sent");
  assert.ok(!payload.includes("dateAdded"), "internal fields must not be sent");
  assert.ok(payload.length < 3000, "payload should stay small, got " + payload.length);
});
