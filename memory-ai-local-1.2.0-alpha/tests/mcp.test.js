const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const readline = require("node:readline");

test("MCP authenticates, hides sensitive memory and turns writes into proposals", async () => {
  const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-mcp-"));
  process.env.MEMORY_AI_DATA_DIR = testData;
  const auth = require("../backend/mcp-auth");
  const service = require("../backend/service");
  const { closeDb } = require("../backend/db");
  const credentials = auth.getCredentials("codex");
  const project = service.listProjects()[0];
  service.createMemory(project.id, {
    type: "note", title: "私密口令", content: "只有本地用户能看到的 sensitive-marker", sensitive: true
  });
  const beforeCount = service.listMemories(project.id, { limit: 100 }).length;
  const child = spawn(process.execPath, ["--no-warnings=ExperimentalWarning", path.resolve(__dirname, "../backend/mcp-server.js")], {
    env: {
      ...process.env,
      MEMORY_AI_DATA_DIR: testData,
      MEMORY_AI_CLIENT_ID: credentials.client_id,
      MEMORY_AI_CLIENT_TOKEN: credentials.token
    },
    stdio: ["pipe", "pipe", "pipe"]
  });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  const pending = new Map();
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const resolver = pending.get(message.id);
    if (resolver) { pending.delete(message.id); resolver(message); }
  });
  function rpc(id, method, params = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`MCP timeout: ${method}`)), 3000);
      pending.set(id, (value) => { clearTimeout(timer); resolve(value); });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }
  try {
    const initialized = await rpc(1, "initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    assert.equal(initialized.result.serverInfo.name, "memory-ai-local");
    assert.equal(initialized.result.protocolVersion, "2025-11-25");
    const listed = await rpc(2, "tools/list");
    assert.deepEqual(listed.result.tools.map((item) => item.name), [
      "list_projects", "get_project_brief", "search_memories", "get_memory", "get_changes",
      "propose_memory", "propose_task_update", "create_handoff"
    ]);
    const projects = await rpc(3, "tools/call", { name: "list_projects", arguments: {} });
    const projectId = projects.result.structuredContent.projects[0].id;
    assert.equal(Object.prototype.hasOwnProperty.call(projects.result.structuredContent.projects[0], "local_path"), false);
    const brief = await rpc(4, "tools/call", { name: "get_project_brief", arguments: { project_id: projectId, budget: 600 } });
    assert.equal(brief.result.structuredContent.project.id, projectId);
    assert.equal(JSON.stringify(brief.result.structuredContent).includes("sensitive-marker"), false);
    const sensitiveSearch = await rpc(5, "tools/call", { name: "search_memories", arguments: { project_id: projectId, query: "sensitive-marker" } });
    assert.equal(sensitiveSearch.result.structuredContent.results.length, 0);
    const proposal = await rpc(6, "tools/call", {
      name: "propose_memory",
      arguments: { project_id: projectId, title: "MCP 候选", content: "等待用户批准", request_id: "mcp-test-proposal" }
    });
    assert.equal(proposal.result.structuredContent.status, "pending");
    assert.equal(proposal.result.structuredContent.applied, false);
    assert.equal(service.listMemories(project.id, { limit: 100 }).length, beforeCount);
    const approved = service.resolveProposal(proposal.result.structuredContent.id, "approve");
    assert.equal(approved.status, "approved");
    assert.equal(service.listMemories(project.id, { limit: 100 }).length, beforeCount + 1);
  } finally {
    lines.close();
    child.stdin.end();
    if (!child.killed) child.kill();
    if (child.exitCode === null) await new Promise((resolve) => child.once("exit", resolve));
    closeDb();
    fs.rmSync(testData, { recursive: true, force: true });
  }
});
