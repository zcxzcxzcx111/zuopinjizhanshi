const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const files = {
  html: path.join(root, "product-guide.html"),
  css: path.join(root, "product-guide.css"),
  js: path.join(root, "product-guide.js")
};

test("product guide assets exist and JavaScript is valid", () => {
  for (const file of Object.values(files)) assert.equal(fs.existsSync(file), true, `${file} should exist`);
  assert.equal(fs.existsSync(path.join(root, "assets", "memory-logo.png")), true);
  const checked = spawnSync(process.execPath, ["--check", files.js], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
});

test("product guide contains every required manual section and valid anchors", () => {
  const html = fs.readFileSync(files.html, "utf8");
  const required = [
    "overview", "audience", "workflow", "quick-start", "project-memory", "sources", "mcp",
    "permissions", "backup", "life-memory", "troubleshooting", "faq", "data-location", "release-notes"
  ];
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], "HTML ids must be unique");
  for (const id of required) {
    assert.ok(ids.includes(id), `missing section #${id}`);
    assert.match(html, new RegExp(`href="#${id}"`), `missing navigation link for #${id}`);
  }
  const fragmentLinks = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
  for (const fragment of fragmentLinks) assert.ok(ids.includes(fragment), `anchor #${fragment} must resolve`);
});

test("product guide is local-only, responsive, printable and accessible", () => {
  const html = fs.readFileSync(files.html, "utf8");
  const css = fs.readFileSync(files.css, "utf8");
  const js = fs.readFileSync(files.js, "utf8");
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main id="main-content"/);
  assert.match(html, /aria-label="本页目录"/);
  assert.match(html, /assets\/memory-logo\.png/);
  assert.doesNotMatch(html, /(?:href|src)="https?:\/\//i, "guide must not load or link network resources");
  assert.doesNotMatch(html, /<svg\b/i, "guide must not contain authored SVG");
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media print/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /back-to-top/);
  assert.match(js, /Escape/);
});

test("product guide distinguishes shipped capabilities from plans and documents boundaries", () => {
  const html = fs.readFileSync(files.html, "utf8");
  for (const truth of [
    "本次版本", "规划中", "SQLite 关键词匹配", "8 个带本地凭证的 MCP 工具", "不会自动读取",
    "独立凭证与项目级权限", "敏感过滤与候选写入", "Life JSON 不包含照片与视频二进制",
    "最近 30 次提交", "单文件上限 32 KB", "单次总量上限 512 KB", "批准前不进长期记忆",
    "data\\backups\\backup-...", "SHA-256", "恢复前安全备份", "MCP 本地凭证和 token hash 不会进入完整备份",
    "当前没有静态加密", "单个导入文件当前上限为 30 MB", "现有 MCP 工具完全不提供人物"
  ]) assert.ok(html.includes(truth), `missing product boundary: ${truth}`);
  assert.match(html, /data\\memory-ai\.db/);
  assert.match(html, /data\\life-media/);
  assert.match(html, /127\.0\.0\.1:3765/);
  assert.match(html, /Start Memory AI\.cmd/);
});

test("the local Node server serves the product guide and its assets", async () => {
  const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-guide-"));
  process.env.MEMORY_AI_DATA_DIR = testData;
  process.env.MEMORY_AI_NO_BROWSER = "1";
  const { createServer } = require("../backend/server");
  const { closeDb } = require("../backend/db");
  const server = createServer();
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(`${base}/product-guide.html`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type") || "", /^text\/html/);
    assert.match(await page.text(), /Memory AI · 产品说明书/);
    const stylesheet = await fetch(`${base}/product-guide.css`);
    assert.equal(stylesheet.status, 200);
    assert.match(stylesheet.headers.get("content-type") || "", /^text\/css/);
    const script = await fetch(`${base}/product-guide.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get("content-type") || "", /^text\/javascript/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
    fs.rmSync(testData, { recursive: true, force: true });
  }
});
