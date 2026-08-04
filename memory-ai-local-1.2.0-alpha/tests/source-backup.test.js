const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-source-backup-"));
const workspace = path.join(testData, "sample-workspace");
fs.mkdirSync(path.join(workspace, "node_modules", "ignored"), { recursive: true });
fs.writeFileSync(path.join(workspace, "README.md"), "# Sample\nLocal-first project documentation.", "utf8");
fs.writeFileSync(path.join(workspace, "AGENTS.md"), "Never publish secrets. Ask before code changes.", "utf8");
fs.writeFileSync(path.join(workspace, ".env"), "SECRET_KEY=must-never-be-indexed", "utf8");
fs.writeFileSync(path.join(workspace, "settings.md"), "api_key=not-a-real-credential-test-fixture", "utf8");
fs.writeFileSync(path.join(workspace, "node_modules", "ignored", "README.md"), "ignore me", "utf8");
fs.writeFileSync(path.join(workspace, "binary.txt"), Buffer.from([0, 1, 2, 3]));

process.env.MEMORY_AI_DATA_DIR = testData;
const service = require("../backend/service");
const source = require("../backend/source-service");
const backup = require("../backend/backup-service");
const life = require("../backend/life-service");
const { db, closeDb, LIFE_MEDIA_DIR } = require("../backend/db");

test.after(() => {
  closeDb();
  fs.rmSync(testData, { recursive: true, force: true });
});

test("folder and AGENTS scans skip secrets and create reviewable, idempotent proposals", () => {
  const project = service.createProject({ name: "扫描测试", local_path: workspace });
  const folder = source.scanProjectSource(project.id, "folder");
  assert.ok(folder.item_count >= 2);
  assert.ok(folder.proposal_id);
  const indexed = db.prepare("SELECT relative_path, content_text FROM source_items WHERE project_id=?").all(project.id);
  assert.equal(indexed.some((item) => item.relative_path === ".env"), false);
  assert.equal(JSON.stringify(indexed).includes("must-never-be-indexed"), false);
  assert.equal(JSON.stringify(indexed).includes("abcdefghijklmnopqrstuvwxyz123456"), false);
  assert.equal(indexed.some((item) => item.relative_path.includes("node_modules")), false);
  assert.equal(indexed.some((item) => item.relative_path === "binary.txt"), false);
  assert.equal(service.getProposal(folder.proposal_id).status, "pending");

  const repeated = source.scanProjectSource(project.id, "folder");
  assert.equal(repeated.proposal_id, folder.proposal_id);
  const before = service.listMemories(project.id, { limit: 100 }).length;
  service.resolveProposal(folder.proposal_id, "approve");
  assert.equal(service.listMemories(project.id, { limit: 100 }).length, before + 1);

  const agents = source.scanProjectSource(project.id, "agents");
  assert.equal(agents.item_count, 1);
  assert.equal(db.prepare("SELECT relative_path FROM source_items WHERE source_id=?").get(agents.source_id).relative_path, "AGENTS.md");
});

test("Git scan uses the repository root and captures bounded history", { skip: spawnSync("git", ["--version"]).status !== 0 }, () => {
  execFileSync("git", ["init"], { cwd: workspace, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "memory-ai@example.invalid"], { cwd: workspace });
  execFileSync("git", ["config", "user.name", "Memory AI Test"], { cwd: workspace });
  execFileSync("git", ["add", "README.md", "AGENTS.md"], { cwd: workspace });
  execFileSync("git", ["commit", "-m", "Initial local context"], { cwd: workspace, stdio: "ignore" });
  const project = service.createProject({ name: "Git 测试", local_path: workspace });
  const result = source.scanProjectSource(project.id, "git");
  assert.equal(result.item_count, 1);
  const item = db.prepare("SELECT content_text, metadata_json FROM source_items WHERE source_id=?").get(result.source_id);
  assert.match(item.content_text, /Initial local context/);
  assert.ok(JSON.parse(item.metadata_json).commits.length <= 30);

  const nested = path.join(workspace, "nested-project-directory");
  fs.mkdirSync(nested);
  const nestedProject = service.createProject({ name: "Git 子目录测试", local_path: nested });
  assert.throws(
    () => source.scanProjectSource(nestedProject.id, "git"),
    /项目路径需要指向 Git 仓库根目录/
  );
});

test("complete backup validates and restores Developer, Life and media bytes", () => {
  const project = service.createProject({ name: "恢复测试", local_path: workspace });
  const memory = service.createMemory(project.id, { title: "必须恢复", content: "round-trip-marker", sensitive: true });
  const person = life.createPerson({ display_name: "家人", relationship: "测试" });
  const media = life.importMedia({
    name: "roundtrip.jpg",
    mime_type: "image/jpeg",
    data_base64: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64"),
    person_ids: [person.id]
  });
  const created = backup.createBackup();
  assert.ok(fs.existsSync(path.join(created.path, "manifest.json")));
  assert.equal(backup.validateBackup(created.id).ok, true);
  assert.ok(backup.listBackups().some((item) => item.id === created.id));

  service.deleteMemory(memory.id);
  life.deleteMedia(media.id);
  life.deletePerson(person.id);
  assert.throws(() => service.getMemory(memory.id), /不存在/);
  const restored = backup.restoreBackup(created.id);
  assert.equal(restored.restored, true);
  assert.equal(service.getMemory(memory.id).content, "round-trip-marker");
  const restoredMedia = life.getMedia(media.id);
  assert.equal(fs.readFileSync(path.join(LIFE_MEDIA_DIR, restoredMedia.stored_name)).toString("hex"), "ffd8ffd9");

  const tampered = backup.createBackup();
  fs.appendFileSync(path.join(tampered.path, "developer.json"), "tamper", "utf8");
  assert.throws(() => backup.validateBackup(tampered.id), /校验失败/);
});
