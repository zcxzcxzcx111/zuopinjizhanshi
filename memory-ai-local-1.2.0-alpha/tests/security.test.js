const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-security-"));
process.env.MEMORY_AI_DATA_DIR = testData;

const auth = require("../backend/mcp-auth");
const service = require("../backend/service");
const { closeDb } = require("../backend/db");

test.after(() => {
  closeDb();
  fs.rmSync(testData, { recursive: true, force: true });
});

test("agent permissions hide sensitive records until the local user grants access", () => {
  const project = service.createProject({ name: "权限测试" });
  service.createMemory(project.id, { title: "公开结论", content: "public", type: "decision" });
  service.createMemory(project.id, { title: "私密结论", content: "private-marker", type: "note", sensitive: true });

  const hidden = service.searchMemoriesForClient("codex", project.id, { query: "private-marker" });
  assert.equal(hidden.results.length, 0);
  const hiddenBrief = service.getProjectBriefForClient("codex", project.id, 1000);
  assert.equal(JSON.stringify(hiddenBrief).includes("私密结论"), false);

  auth.updatePermission("codex", project.id, { can_read_sensitive: true });
  const visible = service.searchMemoriesForClient("codex", project.id, { query: "private-marker" });
  assert.equal(visible.results.length, 1);
});

test("proposal approval is idempotent and stale task changes are rejected", () => {
  const project = service.createProject({ name: "审批测试" });
  const before = service.listMemories(project.id, { limit: 100 }).length;
  const first = service.createProposal("claude", "create_memory", {
    project_id: project.id, title: "候选决策", content: "用户批准后才写入", request_id: "stable-request"
  });
  const duplicate = service.createProposal("claude", "create_memory", {
    project_id: project.id, title: "不同文本也不能重复执行", content: "duplicate", request_id: "stable-request"
  });
  assert.equal(first.id, duplicate.id);
  assert.equal(service.listMemories(project.id, { limit: 100 }).length, before);
  service.resolveProposal(first.id, "approve");
  service.resolveProposal(first.id, "approve");
  assert.equal(service.listMemories(project.id, { limit: 100 }).length, before + 1);

  const task = service.createTask(project.id, { title: "原任务" });
  const taskProposal = service.createProposal("claude", "update_task", {
    project_id: project.id, task_id: task.id, status: "done", request_id: "stale-task"
  });
  service.updateTask(task.id, { title: "用户已经改过" });
  assert.throws(() => service.resolveProposal(taskProposal.id, "approve"), /已发生变化/);
  assert.equal(service.getProposal(taskProposal.id).status, "pending");
});

test("disabling a client invalidates its credential immediately", () => {
  const credentials = auth.getCredentials("antigravity");
  assert.equal(auth.authenticateClient(credentials.client_id, credentials.token).id, "antigravity");
  auth.setClientEnabled("antigravity", false);
  assert.throws(() => auth.authenticateClient(credentials.client_id, credentials.token), /已断开/);
});
