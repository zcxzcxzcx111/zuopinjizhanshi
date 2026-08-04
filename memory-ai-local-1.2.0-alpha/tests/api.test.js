const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-api-"));
process.env.MEMORY_AI_DATA_DIR = testData;
process.env.MEMORY_AI_NO_BROWSER = "1";

const { createServer } = require("../backend/server");
const { closeDb } = require("../backend/db");

let server;
let base;

async function request(route, options = {}) {
  const response = await fetch(`${base}${route}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json();
  return { response, body };
}

test.before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  fs.rmSync(testData, { recursive: true, force: true });
});

test("health and bootstrap expose seeded local state", async () => {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  const bootstrap = await request("/api/bootstrap");
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.body.projects.length, 1);
  assert.equal(bootstrap.body.active_project.counts.memories, 6);
  assert.equal(bootstrap.body.active_project.counts.tasks, 8);
});

test("project, memory, task, context, changes and handoff work end to end", async () => {
  const created = await request("/api/projects", {
    method: "POST", body: JSON.stringify({ name: "测试项目", goal: "验证本地 API" })
  });
  assert.equal(created.response.status, 201);
  const projectId = created.body.id;

  const memory = await request(`/api/projects/${projectId}/memories`, {
    method: "POST", body: JSON.stringify({ type: "decision", title: "本地优先", content: "数据只保存在本机。", importance: 5 })
  });
  assert.equal(memory.response.status, 201);
  const memoryId = memory.body.id;

  const editedMemory = await request(`/api/memories/${memoryId}`, {
    method: "PATCH", body: JSON.stringify({ title: "本地优先（已确认）", importance: 5 })
  });
  assert.equal(editedMemory.response.status, 200);
  assert.equal(editedMemory.body.title, "本地优先（已确认）");

  const search = await request(`/api/projects/${projectId}/memories?q=${encodeURIComponent("本地")}&budget=200`);
  assert.equal(search.response.status, 200);
  assert.equal(search.body.results.length, 1);
  assert.ok(search.body.token_estimate <= 200);

  const task = await request(`/api/projects/${projectId}/tasks`, {
    method: "POST", body: JSON.stringify({ title: "完成 API 测试" })
  });
  assert.equal(task.response.status, 201);
  const updated = await request(`/api/tasks/${task.body.id}`, {
    method: "PATCH", body: JSON.stringify({ status: "done" })
  });
  assert.equal(updated.body.status, "done");

  const context = await request(`/api/projects/${projectId}/context?budget=300`);
  assert.equal(context.response.status, 200);
  assert.equal(context.body.project.name, "测试项目");
  assert.equal(Object.prototype.hasOwnProperty.call(context.body, "raw_conversation"), false);

  const handoff = await request("/api/handoffs", {
    method: "POST", body: JSON.stringify({ project_id: projectId, from_agent: "Codex", to_agent: "Claude Code", budget: 500 })
  });
  assert.equal(handoff.response.status, 201);
  assert.equal(handoff.body.packet.handoff.to_agent, "Claude Code");

  const changes = await request(`/api/projects/${projectId}/changes?since=0`);
  assert.equal(changes.response.status, 200);
  assert.ok(changes.body.memories.length >= 1);
  assert.ok(changes.body.tasks.length >= 1);

  const mcp = await request("/api/mcp/status?client=codex");
  assert.equal(mcp.response.status, 200);
  assert.equal(mcp.body.tool_count, 8);
  assert.match(mcp.body.config, /mcp_servers\.memory-ai-local/);
  assert.match(mcp.body.config, /MEMORY_AI_CLIENT_TOKEN/);
  const mcpTest = await request("/api/mcp/self-test", { method: "POST", body: "{}" });
  assert.equal(mcpTest.body.ok, true);
  assert.equal(mcpTest.body.tools.length, 8);
  assert.equal(mcpTest.body.write_guard_verified, true);

  const exported = await request("/api/export");
  assert.equal(exported.body.format, "memory-ai-local-backup");
  assert.ok(exported.body.projects.some((project) => project.id === projectId));

  const deletedMemory = await request(`/api/memories/${memoryId}`, { method: "DELETE" });
  const deletedTask = await request(`/api/tasks/${task.body.id}`, { method: "DELETE" });
  assert.equal(deletedMemory.body.deleted, true);
  assert.equal(deletedTask.body.deleted, true);
  const afterDelete = await request(`/api/projects/${projectId}/changes?since=${changes.body.revision}`);
  assert.equal(afterDelete.body.deletions.length, 2);
});

test("invalid input returns a useful client error", async () => {
  const result = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "" }) });
  assert.equal(result.response.status, 400);
  assert.match(result.body.error, /不能为空/);
});

test("Life Memory keeps people, media, Live Photo pairs and stories in a separate local vault", async () => {
  const empty = await request("/api/life/bootstrap");
  assert.equal(empty.response.status, 200);
  assert.equal(empty.body.counts.media, 0);
  assert.equal(empty.body.privacy.mcp_exposed, false);

  const person = await request("/api/life/people", {
    method: "POST",
    body: JSON.stringify({ display_name: "妈妈", relationship: "家人", notes: "只用于测试" })
  });
  assert.equal(person.response.status, 201);

  const photo = await request("/api/life/media/import", {
    method: "POST",
    body: JSON.stringify({
      name: "IMG_0001.jpg",
      mime_type: "image/jpeg",
      data_base64: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64"),
      last_modified: "2025-02-03T04:05:06.000Z",
      person_ids: [person.body.id],
      caption: "一起散步"
    })
  });
  assert.equal(photo.response.status, 201);
  assert.equal(photo.body.people[0].display_name, "妈妈");
  assert.equal(photo.body.media_kind, "photo");

  const video = await request("/api/life/media/import", {
    method: "POST",
    body: JSON.stringify({
      name: "IMG_0001.MOV",
      mime_type: "video/quicktime",
      data_base64: Buffer.from("local-live-photo-video").toString("base64"),
      last_modified: "2025-02-03T04:05:06.000Z",
      person_ids: [person.body.id]
    })
  });
  assert.equal(video.response.status, 201);
  assert.equal(video.body.media_kind, "live_photo_video");

  const paired = await request(`/api/life/media/${photo.body.id}`);
  assert.equal(paired.body.media_kind, "live_photo_image");
  assert.equal(paired.body.is_live_photo, true);

  const fileResponse = await fetch(`${base}/api/life/media/${photo.body.id}/file`);
  assert.equal(fileResponse.status, 200);
  assert.equal((await fileResponse.arrayBuffer()).byteLength, 4);

  const draft = await request("/api/life/stories/draft", {
    method: "POST",
    body: JSON.stringify({ media_ids: [photo.body.id], tone: "温暖" })
  });
  assert.equal(draft.response.status, 200);
  assert.match(draft.body.content, /本地草稿/);

  const story = await request("/api/life/stories", {
    method: "POST",
    body: JSON.stringify(draft.body)
  });
  assert.equal(story.response.status, 201);
  assert.equal(story.body.people[0].display_name, "妈妈");
  assert.equal(story.body.media.length, 1);

  const duplicate = await request("/api/life/media/import", {
    method: "POST",
    body: JSON.stringify({ name: "copy.jpg", mime_type: "image/jpeg", data_base64: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64") })
  });
  assert.equal(duplicate.body.duplicate, true);

  const populated = await request("/api/life/bootstrap");
  assert.deepEqual(populated.body.counts, { people: 1, media: 2, stories: 1, live_photos: 1 });

  const exported = await request("/api/life/export");
  assert.equal(exported.body.format, "memory-ai-life-backup");
  assert.equal(exported.body.metadata.includes_media_bytes, false);
  assert.equal(Object.prototype.hasOwnProperty.call(exported.body.media[0], "data_base64"), false);

  const mcp = await request("/api/mcp/self-test", { method: "POST", body: "{}" });
  assert.equal(mcp.body.tools.some((tool) => tool.includes("life")), false);

  assert.equal((await request(`/api/life/stories/${story.body.id}`, { method: "DELETE" })).body.deleted, true);
  assert.equal((await request(`/api/life/media/${photo.body.id}`, { method: "DELETE" })).body.deleted, true);
  assert.equal((await request(`/api/life/media/${video.body.id}`, { method: "DELETE" })).body.deleted, true);
  assert.equal((await request(`/api/life/people/${person.body.id}`, { method: "DELETE" })).body.deleted, true);
});
