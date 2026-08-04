const pageTitles = {
  home: "总览", projects: "项目记忆", handoff: "Agent 交接", sources: "数据源",
  agents: "Agent 连接", permissions: "权限与审计", life: "Life Memory", settings: "本地设置"
};
const memoryLabels = { decision: "决策", preference: "偏好", constraint: "约束", lesson: "踩坑", note: "记录" };
const taskLabels = { todo: "待处理", in_progress: "进行中", done: "已完成" };
const projectStatusLabels = { active: "开发中", paused: "已暂停", archived: "已归档" };
const state = {
  bootstrap: null, active: null, lastHandoff: null, online: false,
  editingProjectId: null, editingMemoryId: null, currentMcp: null, currentMcpClient: null,
  agentClients: [], proposals: [], backups: []
};

const views = [...document.querySelectorAll(".view")];
const navItems = [...document.querySelectorAll(".nav-item")];
const pageTitle = document.getElementById("page-title");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const projectModal = document.getElementById("project-modal");
const memoryModal = document.getElementById("memory-modal");
const taskModal = document.getElementById("task-modal");
const agentModal = document.getElementById("agent-modal");
const allModals = [projectModal, memoryModal, taskModal, agentModal];
let toastTimer;
let searchTimer;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  toastText.textContent = message;
  toast.querySelector("span").textContent = error ? "!" : "✓";
  toast.classList.toggle("error", error);
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, error ? 4600 : 3000);
}

function showView(name) {
  views.forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.viewTarget === name));
  pageTitle.textContent = pageTitles[name] || "Memory AI";
  closeSearch();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  } catch {
    throw new Error("本地服务已断开，请保持 Start Memory AI 窗口开启");
  }
  let body;
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.error || `本地接口错误 ${response.status}`);
  return body;
}

function shortPath(value) {
  const parts = String(value || "未设置").split(/[\\/]/).filter(Boolean);
  return parts.length ? parts.at(-1) : "未设置";
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function openModal(modal) {
  if (!state.online) return offlineMessage();
  allModals.forEach((item) => { if (item !== modal) item.hidden = true; });
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  const firstInput = modal.querySelector("input:not([readonly]), textarea, select");
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal(modal) {
  modal.hidden = true;
  if (allModals.every((item) => item.hidden)) document.body.style.overflow = "";
}

function armDestructiveButton(button, label, action) {
  if (button.dataset.armed === "true") {
    button.dataset.armed = "false";
    button.textContent = label;
    return action();
  }
  button.dataset.armed = "true";
  button.textContent = "再次点击确认";
  showToast("这是不可撤销操作，请再次点击确认", true);
  setTimeout(() => {
    button.dataset.armed = "false";
    button.textContent = label;
  }, 4200);
}

function renderMetrics() {
  const projects = state.bootstrap?.projects || [];
  const totals = projects.reduce((sum, item) => {
    Object.keys(sum).forEach((key) => { sum[key] += Number(item.counts?.[key] || 0); });
    return sum;
  }, { decisions: 0, preferences: 0, active_tasks: 0 });
  document.getElementById("metric-projects").textContent = projects.length;
  document.getElementById("metric-decisions").textContent = totals.decisions;
  document.getElementById("metric-preferences").textContent = totals.preferences;
  document.getElementById("metric-tasks").textContent = totals.active_tasks;
}

function renderActiveProject() {
  const overview = state.active;
  if (!overview) return;
  const { project, counts, tasks, latest_session: session, context_settings: settings } = overview;
  document.getElementById("active-project-name").textContent = project.name;
  document.getElementById("active-project-summary").textContent = project.description || "这个项目尚未添加说明。";
  document.getElementById("active-project-goal").textContent = project.goal || "尚未设置目标";
  document.getElementById("active-project-agent").textContent = session ? `${session.agent_name} · ${formatTime(session.ended_at || session.started_at)}` : "尚无 Agent 会话";
  document.getElementById("active-project-path").textContent = shortPath(project.local_path);
  const progress = counts.tasks ? Math.round(counts.done_tasks / counts.tasks * 100) : 0;
  document.getElementById("active-progress-bar").style.width = `${progress}%`;
  document.getElementById("active-progress-label").textContent = `任务完成度 ${progress}% · ${counts.done_tasks}/${counts.tasks}`;
  document.getElementById("brief-budget-setting").value = String(settings.brief_budget);
  document.getElementById("max-results-setting").value = String(settings.max_results);
  renderMemories(overview.recent_memories || []);
  renderDecisions((overview.recent_memories || []).filter((item) => ["decision", "constraint"].includes(item.type)));
  renderTasks(tasks || []);
  renderLastHandoff(overview.latest_handoff);
}

function renderLastHandoff(handoff) {
  const title = document.getElementById("last-handoff-title");
  const list = document.getElementById("last-handoff-list");
  if (!handoff) {
    title.textContent = "尚未生成";
    list.innerHTML = '<li><span>→</span><p><strong>准备就绪</strong>在交接中心生成第一份真实交接包</p></li>';
    return;
  }
  title.textContent = `${handoff.from_agent} → ${handoff.to_agent}`;
  let packet = {};
  try { packet = JSON.parse(handoff.packet_json); } catch { packet = {}; }
  const done = (packet.tasks || []).filter((item) => item.status === "done").length;
  const next = (packet.tasks || []).find((item) => item.status !== "done");
  list.innerHTML = `<li><span>✓</span><p><strong>已完成</strong>${done} 个项目任务</p></li>
    <li><span>✓</span><p><strong>关键上下文</strong>${(packet.memories || []).length} 条精简记忆</p></li>
    <li><span>→</span><p><strong>下一步</strong>${escapeHTML(next?.title || "等待新任务")}</p></li>`;
}

function memoryRow(item) {
  return `<div class="memory-row searchable interactive-row" data-memory-id="${escapeHTML(item.id)}" role="button" tabindex="0" aria-label="查看记忆：${escapeHTML(item.title)}">
    <span class="memory-type ${escapeHTML(item.type)}">${escapeHTML(memoryLabels[item.type] || "记录")}</span>
    <div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.summary || item.content)}</p><small>${escapeHTML(item.source)} · ${escapeHTML(item.agent)} · Revision ${item.revision}</small></div>
    <time>${escapeHTML(formatTime(item.updated_at))}</time></div>`;
}

function renderMemories(memories) {
  document.getElementById("memory-stream-rows").innerHTML = memories.length
    ? memories.slice(0, 6).map(memoryRow).join("")
    : '<div class="empty-state"><strong>还没有记忆</strong><p>手动添加第一条重要结论。</p><button class="secondary-button" data-add-memory>添加记忆</button></div>';
}

function renderProjects() {
  const grid = document.getElementById("project-grid");
  const projects = state.bootstrap?.projects || [];
  grid.innerHTML = projects.map((item) => `
    <article class="project-card ${item.id === state.active?.project.id ? "selected" : ""} ${item.status === "archived" ? "archived" : ""}" data-project-id="${escapeHTML(item.id)}">
      <div><span class="project-icon lime">${escapeHTML(item.name.slice(0, 1).toUpperCase())}</span><span class="status-pill ${item.status === "active" ? "working" : ""}">${escapeHTML(projectStatusLabels[item.status] || item.status)}</span></div>
      <h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description || item.goal || "尚未添加项目说明")}</p>
      <dl><div><dt>记忆</dt><dd>${item.counts.memories}</dd></div><div><dt>决策</dt><dd>${item.counts.decisions}</dd></div><div><dt>任务</dt><dd>${item.counts.tasks}</dd></div></dl>
      <button class="secondary-button project-select">${item.id === state.active?.project.id ? "正在查看" : "打开项目"}</button>
    </article>`).join("") + `<article class="project-card empty-project"><span>＋</span><h3>添加另一个项目</h3><p>填写本地项目信息，建立独立记忆空间。</p><button class="text-button" data-open-project>创建项目 →</button></article>`;
}

function renderDecisions(items) {
  document.getElementById("decision-rows").innerHTML = items.length ? items.map((item) => `
    <article class="searchable interactive-row" data-memory-id="${escapeHTML(item.id)}" role="button" tabindex="0"><time>${escapeHTML(formatTime(item.updated_at))}</time><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.summary || item.content)}</p><small>来源：${escapeHTML(item.source)} · ${escapeHTML(item.agent)}</small></div><span class="priority ${item.importance >= 5 ? "high" : "medium"}">${item.importance >= 5 ? "高" : "中"}</span></article>`).join("")
    : '<div class="empty-state"><strong>还没有关键决策</strong><p>记录一条已经确认的架构或产品结论。</p><button class="secondary-button" data-add-memory>添加记忆</button></div>';
}

function renderTasks(tasks) {
  document.getElementById("task-rows").innerHTML = tasks.length ? tasks.map((task) => `
    <div class="task-row"><label><input type="checkbox" data-task-id="${escapeHTML(task.id)}" ${task.status === "done" ? "checked" : ""}><span></span><p><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(taskLabels[task.status] || task.status)}</small></p></label><button class="task-delete" data-delete-task="${escapeHTML(task.id)}" aria-label="删除任务 ${escapeHTML(task.title)}">×</button></div>`).join("")
    : '<div class="empty-state"><strong>还没有任务</strong><p>创建下一步，交接包会自动带上它。</p><button class="secondary-button" data-add-task>新建任务</button></div>';
}

function renderHandoffProjects() {
  document.getElementById("handoff-project").innerHTML = (state.bootstrap?.projects || []).map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === state.active?.project.id ? "selected" : ""}>${escapeHTML(item.name)}</option>`).join("");
}

function renderAudit() {
  const records = state.bootstrap?.recent_access || [];
  const container = document.getElementById("audit-log-rows");
  if (!records.length) {
    container.innerHTML = '<span>⌁</span><div><strong>暂无访问记录</strong><p>通过网页或 MCP 读取和写入后会显示在这里。</p></div>';
    return;
  }
  container.innerHTML = `<span>⌁</span><div><strong>最近 ${records.length} 次本地操作</strong><p>${records.slice(0, 7).map((item) => `${escapeHTML(item.agent)} · ${escapeHTML(item.action)} ${escapeHTML(item.resource_type)} · ${formatTime(item.created_at)}${item.token_estimate ? ` · ~${item.token_estimate} tokens` : ""}`).join("<br>")}</p></div>`;
}

function renderPermissions() {
  const container = document.getElementById("permission-matrix-body");
  if (!container) return;
  const projectId = state.active?.project?.id;
  const icons = { codex: "X", claude: "C", antigravity: "A" };
  container.innerHTML = state.agentClients.length ? state.agentClients.map((client) => {
    const permission = (client.permissions || []).find((item) => item.project_id === projectId);
    const enabled = Boolean(client.enabled);
    return `<div class="matrix-row">
      <strong><i class="mini-agent ${escapeHTML(client.id)}">${escapeHTML(icons[client.id] || "A")}</i><span>${escapeHTML(client.display_name)}<small>${enabled ? (client.last_seen_at ? `最近使用 ${escapeHTML(formatTime(client.last_seen_at))}` : "尚未连接") : "已在本地断开"}</small></span></strong>
      <button class="scope-chip ${enabled && permission?.can_read ? "allowed" : "denied"} permission-toggle" data-client-id="${escapeHTML(client.id)}" data-permission="can_read" data-value="${permission?.can_read ? "1" : "0"}">${enabled && permission?.can_read ? "允许" : "禁止"}</button>
      <button class="scope-chip ${permission?.can_read_sensitive ? "confirm" : "denied"} permission-toggle" data-client-id="${escapeHTML(client.id)}" data-permission="can_read_sensitive" data-value="${permission?.can_read_sensitive ? "1" : "0"}">${permission?.can_read_sensitive ? "允许" : "禁止"}</button>
      <span class="scope-chip denied">禁止</span>
      <button class="scope-chip ${enabled ? "confirm" : "denied"} client-toggle" data-client-id="${escapeHTML(client.id)}" data-enabled="${enabled ? "1" : "0"}">${enabled ? "候选制" : "已断开"}</button>
    </div>`;
  }).join("") : '<div class="matrix-row"><strong>暂无 Agent 配置</strong><span></span><span></span><span class="scope-chip denied">禁止</span><span></span></div>';
}

function renderProposals() {
  const container = document.getElementById("approval-rows");
  const count = document.getElementById("approval-count");
  if (!container || !count) return;
  count.textContent = `${state.proposals.length} PENDING`;
  container.innerHTML = state.proposals.length ? state.proposals.map((proposal) => {
    const title = proposal.operation === "create_memory" ? proposal.payload?.title : `修改任务 ${proposal.resource_id?.slice(0, 8) || ""}`;
    const detail = proposal.operation === "create_memory"
      ? proposal.payload?.content
      : Object.entries(proposal.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ");
    return `<article class="approval-row"><div><span class="eyebrow">${escapeHTML(proposal.client_name)} · ${escapeHTML(proposal.project_name)}</span><h4>${escapeHTML(title)}</h4><p>${escapeHTML(detail || "等待确认")}</p><small>${escapeHTML(formatTime(proposal.proposed_at))} · 批准前不会写入</small></div><div class="approval-actions"><button class="secondary-button proposal-action" data-proposal-id="${escapeHTML(proposal.id)}" data-decision="reject">拒绝</button><button class="primary-button proposal-action" data-proposal-id="${escapeHTML(proposal.id)}" data-decision="approve">批准</button></div></article>`;
  }).join("") : '<div class="empty-state"><strong>审批箱为空</strong><p>Agent 读取不需要反复确认；只有写回候选会出现在这里。</p></div>';
}

function renderSources() {
  const projectId = state.active?.project?.id;
  document.querySelectorAll(".source-action").forEach((button) => {
    const source = (state.bootstrap?.sources || []).find((item) => item.project_id === projectId && item.kind === button.dataset.source);
    if (source?.last_scan_at) {
      button.title = `上次扫描：${new Date(source.last_scan_at).toLocaleString("zh-CN")} · ${source.item_count} 项`;
      if (!button.disabled) button.textContent = `重新扫描 · ${source.item_count} 项`;
    }
  });
}

function renderBackups() {
  const container = document.getElementById("backup-list");
  if (!container) return;
  container.innerHTML = state.backups.length ? state.backups.slice(0, 4).map((backup) => `<div class="backup-row"><span><strong>${escapeHTML(backup.id)}</strong><small>${escapeHTML(formatTime(backup.created_at))} · ${Number(backup.media_count || 0)} 个媒体</small></span><button class="text-button restore-backup" data-backup-id="${escapeHTML(backup.id)}">验证并恢复</button></div>`).join("") : "<small>还没有完整备份。</small>";
}

function renderAll() {
  renderMetrics(); renderActiveProject(); renderProjects(); renderHandoffProjects(); renderAudit();
  renderPermissions(); renderProposals(); renderSources(); renderBackups();
  document.getElementById("app-version").textContent = state.bootstrap?.app?.version || "1.0.0";
}

async function loadAuxiliary() {
  const [clientsResult, proposalsResult, backupsResult] = await Promise.all([
    api("/api/mcp/clients").catch(() => ({ clients: state.bootstrap?.agent_clients || [] })),
    api("/api/proposals?status=pending&limit=50").catch(() => ({ proposals: [] })),
    api("/api/backups").catch(() => ({ backups: [] }))
  ]);
  state.agentClients = clientsResult.clients || [];
  state.proposals = proposalsResult.proposals || [];
  state.backups = backupsResult.backups || [];
}

async function refresh(preferredProjectId) {
  state.bootstrap = await api("/api/bootstrap");
  const available = state.bootstrap.projects || [];
  const requested = preferredProjectId || state.active?.project?.id || state.bootstrap.active_project?.project?.id;
  const projectId = available.some((project) => project.id === requested) ? requested : available[0]?.id;
  state.active = projectId ? await api(`/api/projects/${encodeURIComponent(projectId)}/overview`) : null;
  await loadAuxiliary();
  state.online = true;
  document.getElementById("local-status-text").textContent = "SQLite 已连接 · 数据仅保存在本机";
  document.getElementById("database-status").textContent = "已连接 · memory-ai.db";
  renderAll();
}

function offlineMessage() {
  state.online = false;
  document.getElementById("local-status-text").textContent = "服务未启动 · 请双击 Start Memory AI.cmd";
  document.getElementById("database-status").textContent = "未连接";
  showToast("请双击 Start Memory AI.cmd，并保持命令窗口开启", true);
}

function resetProjectForm() {
  state.editingProjectId = null;
  document.getElementById("project-modal-title").textContent = "创建项目记忆";
  document.getElementById("project-modal-description").textContent = "项目会真实保存到本地 SQLite，不会上传到云端。";
  document.getElementById("project-name").value = "";
  document.getElementById("project-path").value = "";
  document.getElementById("project-goal").value = "";
  document.getElementById("project-description").value = "";
  document.getElementById("project-submit").textContent = "创建本地项目";
  document.getElementById("archive-project").hidden = true;
}

function openProjectCreate() { resetProjectForm(); openModal(projectModal); }

function openProjectEdit() {
  if (!state.active) return;
  const project = state.active.project;
  state.editingProjectId = project.id;
  document.getElementById("project-modal-title").textContent = "编辑项目";
  document.getElementById("project-modal-description").textContent = "修改项目目标和说明，所有变化只保存在本机。";
  document.getElementById("project-name").value = project.name;
  document.getElementById("project-path").value = project.local_path || "";
  document.getElementById("project-goal").value = project.goal || "";
  document.getElementById("project-description").value = project.description || "";
  document.getElementById("project-submit").textContent = "保存修改";
  document.getElementById("archive-project").hidden = project.status === "archived";
  openModal(projectModal);
}

function resetMemoryForm(type = "decision") {
  state.editingMemoryId = null;
  document.getElementById("memory-modal-title").textContent = "添加一条开发记忆";
  document.getElementById("memory-type").value = type;
  document.getElementById("memory-title").value = "";
  document.getElementById("memory-content").value = "";
  document.getElementById("memory-importance").value = "4";
  document.getElementById("memory-sensitive").checked = false;
  document.getElementById("memory-submit").textContent = "保存到本地";
  document.getElementById("delete-memory").hidden = true;
}

function openMemoryCreate(type = "decision") { resetMemoryForm(type); openModal(memoryModal); }

async function openMemoryEdit(memoryId) {
  try {
    const memory = await api(`/api/memories/${encodeURIComponent(memoryId)}`);
    state.editingMemoryId = memory.id;
    document.getElementById("memory-modal-title").textContent = "编辑开发记忆";
    document.getElementById("memory-type").value = memory.type;
    document.getElementById("memory-title").value = memory.title;
    document.getElementById("memory-content").value = memory.content;
    document.getElementById("memory-importance").value = String(memory.importance);
    document.getElementById("memory-sensitive").checked = Boolean(memory.sensitive);
    document.getElementById("memory-submit").textContent = "保存修改";
    document.getElementById("delete-memory").hidden = false;
    openModal(memoryModal);
  } catch (error) { showToast(error.message, true); }
}

async function copyText(value, successMessage = "已复制") {
  try { await navigator.clipboard.writeText(value); showToast(successMessage); }
  catch { showToast("浏览器没有剪贴板权限，请手动选中复制", true); }
}

function closeSearch() { document.getElementById("search-popover").hidden = true; }
function clearSearch() {
  document.getElementById("global-search").value = "";
  closeSearch();
}

function renderSearchResults(result, projectMatches) {
  const container = document.getElementById("search-results");
  const memoryItems = result.results || [];
  document.getElementById("search-summary").textContent = `${projectMatches.length + memoryItems.length} 个结果 · 约 ${result.token_estimate || 0} tokens`;
  container.innerHTML = [
    ...projectMatches.map((project) => `<button class="search-result" data-search-project="${escapeHTML(project.id)}"><span class="search-result-icon">项</span><span><strong>${escapeHTML(project.name)}</strong><small>${escapeHTML(project.goal || project.description || "项目空间")}</small></span></button>`),
    ...memoryItems.map((item) => `<button class="search-result" data-memory-id="${escapeHTML(item.id)}"><span class="memory-type ${escapeHTML(item.type)}">${escapeHTML(memoryLabels[item.type] || "记")}</span><span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.summary)}</small></span></button>`)
  ].join("") || '<div class="empty-search"><strong>没有找到结果</strong><p>换一个更短的关键词试试。</p></div>';
  document.getElementById("search-popover").hidden = false;
}

async function runMcpSelfTest(button) {
  const original = button.textContent;
  button.disabled = true; button.textContent = "正在检查…";
  try {
    const result = await api("/api/mcp/self-test", { method: "POST", body: "{}" });
    if (!result.ok) throw new Error(result.error || "MCP 子进程自检失败");
    document.getElementById("mcp-status-title").textContent = "真实 STDIO 自检通过";
    document.getElementById("mcp-status-copy").textContent = `${result.tools.length} 个工具 · ${result.protocol_version} · 写入保护${result.write_guard_verified ? "已验证" : "待验证"}`;
    showToast(`MCP 自检通过 · ${result.tools.length} 个工具 · ${result.duration_ms} ms`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; button.textContent = original; }
}

async function openAgentConfig(client, agentName) {
  try {
    const info = await api(`/api/mcp/status?client=${encodeURIComponent(client)}`);
    state.currentMcp = info;
    state.currentMcpClient = client;
    document.getElementById("agent-modal-title").textContent = `连接 ${agentName}`;
    document.getElementById("agent-modal-intro").textContent = info.connection_state === "seen" ? "这个 Agent 已经使用过本地 MCP；你可以重新复制配置或立即断开。" : "复制包含独立本地凭证的配置，在对应 Agent 中粘贴并重启。";
    document.getElementById("agent-settings-hint").textContent = client === "codex" ? "Codex：Settings → MCP servers → Add server" : `${agentName}：打开本地 MCP 配置文件`;
    document.getElementById("config-format").textContent = info.config_format.toUpperCase();
    document.getElementById("agent-config").textContent = info.config;
    document.getElementById("disconnect-guide").textContent = info.disconnect;
    const toggle = document.getElementById("toggle-agent-connection");
    if (toggle) {
      toggle.dataset.enabled = info.connection_state === "disabled" ? "0" : "1";
      toggle.textContent = info.connection_state === "disabled" ? "在本地重新启用" : "立即断开本地权限";
    }
    openModal(agentModal);
  } catch (error) { showToast(error.message, true); }
}

document.addEventListener("click", async (event) => {
  const viewTarget = event.target.closest("[data-view-target]");
  if (viewTarget) showView(viewTarget.dataset.viewTarget);
  const demoAction = event.target.closest("[data-demo-action]");
  if (demoAction) showToast(demoAction.dataset.demoAction);
  if (event.target.closest("[data-open-project]")) openProjectCreate();
  if (event.target.closest("#edit-active-project")) openProjectEdit();
  if (event.target.closest("#add-memory, [data-add-memory]")) openMemoryCreate();
  if (event.target.closest("#add-task, [data-add-task]")) openModal(taskModal);
  const memoryTarget = event.target.closest("[data-memory-id]");
  if (memoryTarget) { closeSearch(); await openMemoryEdit(memoryTarget.dataset.memoryId); }
  const projectCard = event.target.closest("[data-project-id]");
  if (projectCard && event.target.closest(".project-select")) {
    try { await refresh(projectCard.dataset.projectId); showView("projects"); }
    catch (error) { showToast(error.message, true); }
  }
  const searchProject = event.target.closest("[data-search-project]");
  if (searchProject) { await refresh(searchProject.dataset.searchProject); closeSearch(); showView("projects"); }
  const deleteTaskButton = event.target.closest("[data-delete-task]");
  if (deleteTaskButton) {
    armDestructiveButton(deleteTaskButton, "×", async () => {
      try { await api(`/api/tasks/${encodeURIComponent(deleteTaskButton.dataset.deleteTask)}`, { method: "DELETE" }); await refresh(state.active.project.id); showToast("任务已删除"); }
      catch (error) { showToast(error.message, true); }
    });
  }
  const agentButton = event.target.closest(".agent-action");
  if (agentButton) await openAgentConfig(agentButton.dataset.client, agentButton.dataset.agent);
  const proposalButton = event.target.closest(".proposal-action");
  if (proposalButton) {
    proposalButton.disabled = true;
    try {
      await api(`/api/proposals/${encodeURIComponent(proposalButton.dataset.proposalId)}/${proposalButton.dataset.decision}`, { method: "POST", body: "{}" });
      await refresh(state.active?.project?.id);
      showToast(proposalButton.dataset.decision === "approve" ? "候选已批准并写入" : "候选已拒绝");
    } catch (error) { showToast(error.message, true); }
    finally { proposalButton.disabled = false; }
  }
  const permissionButton = event.target.closest(".permission-toggle");
  if (permissionButton && state.active) {
    permissionButton.disabled = true;
    const field = permissionButton.dataset.permission;
    try {
      await api(`/api/mcp/clients/${encodeURIComponent(permissionButton.dataset.clientId)}/projects/${encodeURIComponent(state.active.project.id)}`, {
        method: "PATCH", body: JSON.stringify({ [field]: permissionButton.dataset.value !== "1" })
      });
      await refresh(state.active.project.id); showToast("Agent 项目权限已更新");
    } catch (error) { showToast(error.message, true); }
  }
  const clientToggle = event.target.closest(".client-toggle");
  if (clientToggle) {
    clientToggle.disabled = true;
    try {
      await api(`/api/mcp/clients/${encodeURIComponent(clientToggle.dataset.clientId)}`, { method: "PATCH", body: JSON.stringify({ enabled: clientToggle.dataset.enabled !== "1" }) });
      await refresh(state.active?.project?.id); showToast(clientToggle.dataset.enabled === "1" ? "Agent 已立即断开" : "Agent 已重新启用");
    } catch (error) { showToast(error.message, true); }
  }
  const restoreButton = event.target.closest(".restore-backup");
  if (restoreButton) {
    armDestructiveButton(restoreButton, "验证并恢复", async () => {
      restoreButton.disabled = true;
      try {
        const result = await api(`/api/backups/${encodeURIComponent(restoreButton.dataset.backupId)}/restore`, { method: "POST", body: JSON.stringify({ mode: "replace" }) });
        await refresh();
        showToast(result.recovered_copy ? "恢复完成；恢复前数据已保留副本" : "备份恢复完成");
      } catch (error) { showToast(error.message, true); }
      finally { restoreButton.disabled = false; }
    });
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-memory-id][role='button']")) { event.preventDefault(); openMemoryEdit(event.target.dataset.memoryId); }
  if (event.key === "Escape") { allModals.forEach(closeModal); closeSearch(); }
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) closeModal(projectModal);
  if (event.target.closest("[data-close-memory]")) closeModal(memoryModal);
  if (event.target.closest("[data-close-task]")) closeModal(taskModal);
  if (event.target.closest("[data-close-agent]")) closeModal(agentModal);
});
allModals.forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal); }));

document.getElementById("project-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter || document.getElementById("project-submit"); button.disabled = true;
  const payload = {
    name: document.getElementById("project-name").value.trim(),
    local_path: document.getElementById("project-path").value.trim(),
    goal: document.getElementById("project-goal").value.trim(),
    description: document.getElementById("project-description").value.trim()
  };
  try {
    const project = state.editingProjectId
      ? await api(`/api/projects/${encodeURIComponent(state.editingProjectId)}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    closeModal(projectModal); await refresh(project.id); showView("projects");
    showToast(state.editingProjectId ? "项目修改已保存" : `“${project.name}”已保存到本地`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("archive-project").addEventListener("click", (event) => {
  armDestructiveButton(event.currentTarget, "归档项目", async () => {
    try {
      await api(`/api/projects/${encodeURIComponent(state.editingProjectId)}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
      closeModal(projectModal); await refresh(state.editingProjectId); showToast("项目已归档，数据仍保留在本机");
    } catch (error) { showToast(error.message, true); }
  });
});

document.getElementById("quick-memory").addEventListener("click", () => openMemoryCreate("note"));
document.getElementById("memory-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.active) return;
  const button = event.submitter || document.getElementById("memory-submit"); button.disabled = true;
  const payload = {
    type: document.getElementById("memory-type").value,
    title: document.getElementById("memory-title").value.trim(),
    content: document.getElementById("memory-content").value.trim(),
    importance: Number(document.getElementById("memory-importance").value),
    sensitive: document.getElementById("memory-sensitive").checked,
    source: "local-ui", agent: "User"
  };
  try {
    if (state.editingMemoryId) await api(`/api/memories/${encodeURIComponent(state.editingMemoryId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api(`/api/projects/${encodeURIComponent(state.active.project.id)}/memories`, { method: "POST", body: JSON.stringify(payload) });
    closeModal(memoryModal); await refresh(state.active.project.id); showView("projects");
    showToast(state.editingMemoryId ? "记忆修改已保存" : "记忆已写入本地 SQLite");
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("delete-memory").addEventListener("click", (event) => {
  armDestructiveButton(event.currentTarget, "删除记忆", async () => {
    try {
      await api(`/api/memories/${encodeURIComponent(state.editingMemoryId)}`, { method: "DELETE" });
      closeModal(memoryModal); await refresh(state.active.project.id); showToast("记忆已删除");
    } catch (error) { showToast(error.message, true); }
  });
});

document.getElementById("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.active) return;
  const button = event.submitter || event.currentTarget.querySelector("button[type='submit']"); button.disabled = true;
  try {
    await api(`/api/projects/${encodeURIComponent(state.active.project.id)}/tasks`, { method: "POST", body: JSON.stringify({ title: document.getElementById("task-title").value.trim(), status: document.getElementById("task-status").value }) });
    event.currentTarget.reset(); closeModal(taskModal); await refresh(state.active.project.id); showView("projects"); showToast("新任务已创建");
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("task-rows").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-task-id]");
  if (!input) return;
  input.disabled = true;
  try { await api(`/api/tasks/${encodeURIComponent(input.dataset.taskId)}`, { method: "PATCH", body: JSON.stringify({ status: input.checked ? "done" : "todo" }) }); await refresh(state.active.project.id); showToast("任务状态已保存"); }
  catch (error) { input.checked = !input.checked; showToast(error.message, true); }
});

const handoffFrom = document.getElementById("handoff-from");
const handoffTo = document.getElementById("handoff-to");
function updateHandoffLabels() {
  if (handoffFrom.value === handoffTo.value) {
    const fallback = [...handoffTo.options].find((option) => option.value !== handoffFrom.value);
    if (fallback) handoffTo.value = fallback.value;
  }
  document.getElementById("packet-from").textContent = handoffFrom.value;
  document.getElementById("packet-to").textContent = handoffTo.value;
  document.getElementById("send-target").textContent = handoffTo.value;
}
handoffFrom.addEventListener("change", updateHandoffLabels);
handoffTo.addEventListener("change", updateHandoffLabels);

function renderHandoffPacket(result) {
  const packet = result.packet;
  const completed = packet.tasks.filter((item) => item.status === "done");
  const open = packet.tasks.filter((item) => item.status !== "done");
  const constraints = packet.memories.filter((item) => ["constraint", "decision"].includes(item.type)).slice(0, 6);
  document.getElementById("handoff-packet-body").innerHTML = `
    <div class="packet-section"><span>01</span><div><small>CURRENT GOAL</small><h4>${escapeHTML(packet.project.goal || "尚未设置目标")}</h4><p>${escapeHTML(packet.project.description || packet.instruction)}</p></div></div>
    <div class="packet-section"><span>02</span><div><small>COMPLETED</small><ul>${completed.length ? completed.map((item) => `<li>${escapeHTML(item.title)}</li>`).join("") : "<li>暂无已完成任务</li>"}</ul></div></div>
    <div class="packet-section"><span>03</span><div><small>KEY CONTEXT</small><ul>${constraints.length ? constraints.map((item) => `<li>${escapeHTML(item.title)}</li>`).join("") : "<li>暂无关键约束</li>"}</ul></div></div>
    <div class="packet-section"><span>04</span><div><small>NEXT STEP</small><h4>${escapeHTML(open[0]?.title || "等待新任务")}</h4><p>Revision ${packet.revision} · 估算 ${result.token_estimate} tokens · ${packet.truncated ? "已按预算裁剪" : "上下文完整"}</p></div></div>`;
}

document.getElementById("generate-handoff").addEventListener("click", async (event) => {
  const button = event.currentTarget; button.disabled = true; button.textContent = "正在按预算整理上下文…";
  document.getElementById("handoff-document").style.opacity = ".58";
  try {
    updateHandoffLabels();
    const result = await api("/api/handoffs", { method: "POST", body: JSON.stringify({ project_id: document.getElementById("handoff-project").value, from_agent: handoffFrom.value, to_agent: handoffTo.value, budget: Number(document.getElementById("handoff-budget").value) }) });
    state.lastHandoff = result; renderHandoffPacket(result); await refresh(result.project_id);
    showToast(`交接包已生成 · 约 ${result.token_estimate} tokens`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; button.textContent = "重新生成交接包"; document.getElementById("handoff-document").style.opacity = "1"; }
});

document.querySelector(".document-actions .secondary-button").addEventListener("click", async (event) => {
  event.stopImmediatePropagation();
  if (!state.lastHandoff) return showToast("请先生成一份交接包", true);
  await copyText(JSON.stringify(state.lastHandoff.packet, null, 2), "交接包已复制");
});

document.getElementById("open-target-agent").addEventListener("click", () => {
  const target = handoffTo.value;
  const client = target === "Codex" ? "codex" : target === "Claude Code" ? "claude" : "antigravity";
  openAgentConfig(client, target);
});

document.querySelectorAll(".source-action").forEach((button) => button.addEventListener("click", async () => {
  if (!state.active) return;
  if (!state.active.project.local_path) return showToast("请先在“编辑项目信息”里填写本地项目目录", true);
  const original = button.textContent;
  button.disabled = true; button.textContent = "正在安全扫描…";
  try {
    const result = await api(`/api/projects/${encodeURIComponent(state.active.project.id)}/sources/scan`, {
      method: "POST", body: JSON.stringify({ kind: button.dataset.source })
    });
    await refresh(state.active.project.id);
    showToast(`扫描完成 · ${result.item_count || 0} 项 · ${result.proposal_id ? "已生成审批候选" : "没有新候选"}`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; if (!button.title) button.textContent = original; }
}));

document.getElementById("global-search").addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  const query = event.target.value.trim();
  if (!query) return closeSearch();
  searchTimer = setTimeout(async () => {
    if (!state.active) return;
    try {
      const settings = state.active.context_settings;
      const result = await api(`/api/projects/${encodeURIComponent(state.active.project.id)}/memories?q=${encodeURIComponent(query)}&budget=${settings.search_budget}&limit=${settings.max_results}`);
      const projectMatches = (state.bootstrap.projects || []).filter((project) => `${project.name} ${project.goal} ${project.description}`.toLowerCase().includes(query.toLowerCase()));
      renderSearchResults(result, projectMatches);
    } catch (error) { showToast(error.message, true); }
  }, 260);
});
document.getElementById("global-search").addEventListener("focus", (event) => { if (event.currentTarget.value.trim()) document.getElementById("search-popover").hidden = false; });
document.getElementById("close-search").addEventListener("click", clearSearch);

document.getElementById("test-mcp").addEventListener("click", (event) => runMcpSelfTest(event.currentTarget));
document.getElementById("open-codex-config").addEventListener("click", () => openAgentConfig("codex", "Codex"));
document.getElementById("agent-self-test").addEventListener("click", (event) => { event.preventDefault(); runMcpSelfTest(event.currentTarget); });
document.getElementById("copy-config").addEventListener("click", (event) => { event.preventDefault(); if (state.currentMcp) copyText(state.currentMcp.config, "MCP 配置已复制"); });
document.getElementById("copy-and-mark").addEventListener("click", (event) => { event.preventDefault(); if (state.currentMcp) copyText(state.currentMcp.config, "配置已复制；粘贴后请重启 Agent"); });
document.getElementById("toggle-agent-connection").addEventListener("click", async (event) => {
  event.preventDefault();
  if (!state.currentMcpClient) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const enable = button.dataset.enabled !== "1";
    await api(`/api/mcp/clients/${encodeURIComponent(state.currentMcpClient)}`, { method: "PATCH", body: JSON.stringify({ enabled: enable }) });
    await refresh(state.active?.project?.id);
    closeModal(agentModal);
    showToast(enable ? "Agent 已重新启用，请复制最新配置" : "Agent 已立即断开；旧凭证下一次调用即失效");
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("save-context-settings").addEventListener("click", async (event) => {
  if (!state.active) return;
  const button = event.currentTarget; button.disabled = true;
  try {
    await api(`/api/projects/${encodeURIComponent(state.active.project.id)}/context-settings`, { method: "PATCH", body: JSON.stringify({ brief_budget: Number(document.getElementById("brief-budget-setting").value), max_results: Number(document.getElementById("max-results-setting").value) }) });
    await refresh(state.active.project.id); showToast("上下文设置已保存");
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("export-backup").addEventListener("click", async (event) => {
  const button = event.currentTarget; button.disabled = true;
  try {
    const backup = await api("/api/export");
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `memory-ai-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(url); showToast("本地备份已导出");
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});

document.getElementById("create-backup").addEventListener("click", async (event) => {
  const button = event.currentTarget; button.disabled = true; button.textContent = "正在复制与校验…";
  try {
    const result = await api("/api/backups", { method: "POST", body: "{}" });
    await loadAuxiliary(); renderBackups();
    showToast(`完整备份已创建 · ${result.media_count || 0} 个媒体文件`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; button.textContent = "创建完整备份"; }
});

document.getElementById("more-button").addEventListener("click", () => showView("settings"));

(async function start() {
  if (location.protocol === "file:") return offlineMessage();
  try { await refresh(); }
  catch (error) { offlineMessage(); console.error(error); }
})();
