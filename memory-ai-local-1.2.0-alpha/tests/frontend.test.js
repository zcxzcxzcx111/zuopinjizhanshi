const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

test("frontend JavaScript is valid and uses the local API", () => {
  const checked = spawnSync(process.execPath, ["--check", path.join(root, "script.js")], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /\/api\/bootstrap/);
  assert.match(script, /\/api\/handoffs/);
  assert.match(script, /\/api\/mcp\/self-test/);
  assert.match(script, /\/api\/export/);
  assert.match(script, /method: "DELETE"/);
  assert.match(script, /location\.protocol === "file:"/);

  const lifeChecked = spawnSync(process.execPath, ["--check", path.join(root, "life.js")], { encoding: "utf8" });
  assert.equal(lifeChecked.status, 0, lifeChecked.stderr);
  const lifeScript = fs.readFileSync(path.join(root, "life.js"), "utf8");
  assert.match(lifeScript, /\/api\/life\/bootstrap/);
  assert.match(lifeScript, /\/api\/life\/media\/import/);
  assert.match(lifeScript, /\/api\/life\/stories\/draft/);
  assert.match(lifeScript, /30 \* 1024 \* 1024/);
  assert.match(lifeScript, /删除本地副本/);
});

test("frontend has unique ids and local launcher guidance", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
  for (const id of ["task-modal", "agent-modal", "search-popover", "export-backup", "save-context-settings",
    "life-person-modal", "life-import-modal", "life-media-modal", "life-story-modal", "life-privacy-modal",
    "life-media-grid", "life-person-filters", "life-story-list"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /life\.css/);
  assert.match(html, /life\.js/);
  assert.match(html, /MCP 默认不可见/);
  assert.match(fs.readFileSync(path.join(root, "README.txt"), "utf8"), /Start Memory AI\.cmd/);
});
