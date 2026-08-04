(function () {
  "use strict";

  const lifeState = {
    loaded: false,
    loading: false,
    data: null,
    activePerson: "all",
    files: [],
    editingPerson: null,
    editingMedia: null,
    editingStory: null
  };

  const lifeView = document.getElementById("life-view");
  if (!lifeView) return;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function notify(message, error = false) {
    if (typeof showToast === "function") showToast(message, error);
    else {
      const toast = document.getElementById("toast");
      document.getElementById("toast-text").textContent = message;
      toast.classList.toggle("error", error);
      toast.hidden = false;
      window.setTimeout(() => { toast.hidden = true; }, 2800);
    }
  }

  async function lifeApi(route, options = {}) {
    let response;
    try {
      response = await fetch(route, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
      });
    } catch {
      throw new Error("本地服务未连接，请重新双击 Start Memory AI.cmd");
    }
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body.error || `操作失败（${response.status}）`);
    return body;
  }

  function openLifeModal(id) {
    const modal = document.getElementById(id);
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const focusable = modal.querySelector("input:not([type='hidden']), textarea, select, button");
    window.setTimeout(() => focusable?.focus(), 30);
  }

  function closeLifeModal(id) {
    document.getElementById(id).hidden = true;
    if (![...document.querySelectorAll(".modal-backdrop")].some((modal) => !modal.hidden)) document.body.classList.remove("modal-open");
  }

  function initials(name) {
    const text = String(name || "?").trim();
    return text.slice(0, 1).toUpperCase();
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "时间待补充";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value).slice(0, 16);
    return date.toLocaleString("zh-CN", includeTime
      ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "short", day: "numeric" });
  }

  function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value).slice(0, 16);
    const local = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function hasExif(media) {
    const exif = media.exif || {};
    return Boolean(exif.date_time_original || exif.make || exif.model || Number.isFinite(exif.latitude) || Number.isFinite(exif.longitude));
  }

  function peopleCheckboxes(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    const people = lifeState.data?.people || [];
    const selected = new Set(selectedIds);
    container.innerHTML = people.length ? people.map((person) => `
      <label class="life-check-option">
        <input type="checkbox" value="${escapeHtml(person.id)}" ${selected.has(person.id) ? "checked" : ""}>
        <span>${escapeHtml(person.display_name)}</span>
      </label>`).join("") : `<p class="life-no-people">尚未添加人物，也可以先导入为未分类记忆。</p>`;
  }

  function selectedCheckboxValues(containerId) {
    return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map((input) => input.value);
  }

  function renderPeople() {
    const people = lifeState.data.people;
    const filters = document.getElementById("life-person-filters");
    const allActive = lifeState.activePerson === "all";
    filters.innerHTML = `<button class="life-filter ${allActive ? "active" : ""}" data-life-person="all">全部记忆 <span class="life-filter-meta">${lifeState.data.counts.media}</span></button>` + people.map((person) => {
      const count = lifeState.data.media.filter((media) => media.people.some((item) => item.id === person.id)).length;
      return `<div class="life-person-filter-wrap"><button class="life-filter ${lifeState.activePerson === person.id ? "active" : ""}" data-life-person="${escapeHtml(person.id)}"><span class="life-filter-avatar" style="background:${escapeHtml(person.color)}">${escapeHtml(initials(person.display_name))}</span>${escapeHtml(person.display_name)} <span class="life-filter-meta">${count}</span></button><button class="life-person-edit" data-edit-life-person="${escapeHtml(person.id)}" aria-label="编辑人物 ${escapeHtml(person.display_name)}">•••</button></div>`;
    }).join("");
  }

  function mediaBadge(media) {
    if (media.is_live_photo) return "LIVE";
    if (media.media_kind === "video") return "VIDEO";
    if ([".heic", ".heif"].includes(media.extension)) return "HEIC";
    return media.extension.replace(".", "").toUpperCase() || "FILE";
  }

  function renderMedia() {
    const allMedia = lifeState.data.media;
    const media = lifeState.activePerson === "all"
      ? allMedia
      : allMedia.filter((item) => item.people.some((person) => person.id === lifeState.activePerson));
    const grid = document.getElementById("life-media-grid");
    const summary = document.getElementById("life-timeline-summary");
    const activePerson = lifeState.data.people.find((person) => person.id === lifeState.activePerson);
    summary.textContent = activePerson ? `${activePerson.display_name} · ${media.length} 条本地记忆` : `${media.length} 个媒体文件，按拍摄时间排列`;
    if (!media.length) {
      grid.innerHTML = `<div class="life-media-empty"><strong>${activePerson ? `还没有与${escapeHtml(activePerson.display_name)}关联的媒体` : "时间线还是空的"}</strong><p>${activePerson ? "你可以导入新照片，或在媒体详情中修改人物关联。" : "选择照片或 Live Photo，它们只会复制到本机。"}</p><button class="primary-button" data-life-empty-import>导入第一批照片</button></div>`;
      return;
    }
    grid.innerHTML = media.map((item) => {
      const thumbnail = item.preview_url
        ? `<img src="${escapeHtml(item.preview_url)}" alt="${escapeHtml(item.caption || item.original_name)}" loading="lazy">`
        : `<span class="life-media-placeholder">${escapeHtml(mediaBadge(item))}</span>`;
      const people = item.people.slice(0, 3).map((person) => `<span class="life-person-chip" style="background:${escapeHtml(person.color)}">${escapeHtml(person.display_name)}</span>`).join("");
      return `<button class="life-media-card" data-life-media="${escapeHtml(item.id)}" aria-label="查看媒体 ${escapeHtml(item.original_name)}"><span class="life-media-thumb">${thumbnail}<span class="life-media-badges"><span class="life-media-badge">${escapeHtml(mediaBadge(item))}</span>${hasExif(item) ? '<span class="life-media-badge exif">EXIF</span>' : ""}</span></span><span class="life-media-copy"><strong>${escapeHtml(item.caption || item.original_name)}</strong><time>${escapeHtml(formatDate(item.capture_time))}</time><p>${escapeHtml(item.location_name || ([item.device_make, item.device_model].filter(Boolean).join(" ")) || "地点与设备待补充")}</p><span class="life-person-chips">${people || '<span class="life-person-chip" style="background:#f0f0f2">未分类</span>'}</span></span></button>`;
    }).join("");
  }

  function renderStories() {
    const stories = lifeState.data.stories;
    const list = document.getElementById("life-story-list");
    if (!stories.length) {
      list.innerHTML = `<div class="life-empty-small"><strong>还没有故事</strong><p>从一张照片开始即可。</p></div>`;
      return;
    }
    list.innerHTML = stories.map((story) => {
      const cover = story.media.find((media) => media.preview_url);
      const visual = cover ? `<img src="${escapeHtml(cover.preview_url)}" alt="">` : "♡";
      return `<button class="life-story-card" data-life-story="${escapeHtml(story.id)}"><span class="life-story-cover">${visual}</span><span><strong>${escapeHtml(story.title)}</strong><p>${escapeHtml(story.content)}</p><small>${escapeHtml(formatDate(story.happened_at))} · ${story.media.length} 个媒体 · <span class="life-story-status">${story.status === "published" ? "已完成" : "草稿"}</span></small></span></button>`;
    }).join("");
  }

  function renderLife() {
    if (!lifeState.data) return;
    document.getElementById("life-count-people").textContent = lifeState.data.counts.people;
    document.getElementById("life-count-media").textContent = lifeState.data.counts.media;
    document.getElementById("life-count-live").textContent = lifeState.data.counts.live_photos;
    document.getElementById("life-count-stories").textContent = lifeState.data.counts.stories;
    document.getElementById("life-onboarding").hidden = lifeState.data.counts.people > 0;
    document.getElementById("life-storage-path").textContent = `媒体副本保存在：${lifeState.data.privacy.storage_path}`;
    renderPeople();
    renderMedia();
    renderStories();
  }

  async function loadLife(showErrors = true) {
    if (lifeState.loading) return;
    lifeState.loading = true;
    try {
      lifeState.data = await lifeApi("/api/life/bootstrap");
      if (lifeState.activePerson !== "all" && !lifeState.data.people.some((person) => person.id === lifeState.activePerson)) lifeState.activePerson = "all";
      lifeState.loaded = true;
      renderLife();
    } catch (error) {
      document.getElementById("life-media-grid").innerHTML = `<div class="life-media-empty"><strong>无法打开本地保险库</strong><p>${escapeHtml(error.message)}</p><button class="primary-button" data-life-retry>重新连接</button></div>`;
      if (showErrors) notify(error.message, true);
    } finally {
      lifeState.loading = false;
    }
  }

  function openPerson(person = null) {
    lifeState.editingPerson = person;
    document.getElementById("life-person-title").textContent = person ? "编辑人物空间" : "添加重要的人";
    document.getElementById("life-person-name").value = person?.display_name || "";
    document.getElementById("life-person-relationship").value = person?.relationship || "";
    document.getElementById("life-person-notes").value = person?.notes || "";
    document.getElementById("life-person-color").value = person?.color || "#DFF59A";
    document.getElementById("life-delete-person").hidden = !person;
    document.getElementById("life-delete-person").textContent = "删除人物";
    document.getElementById("life-person-submit").textContent = person ? "保存修改" : "保存人物";
    openLifeModal("life-person-modal");
  }

  function resetImport() {
    lifeState.files = [];
    document.getElementById("life-file-input").value = "";
    document.getElementById("life-import-caption").value = "";
    document.getElementById("life-selected-files").innerHTML = "<p>尚未选择文件</p>";
    document.getElementById("life-import-progress").hidden = true;
    document.getElementById("life-import-progress-bar").style.width = "0%";
    const button = document.getElementById("life-import-submit");
    button.disabled = false;
    button.textContent = "导入到本地";
  }

  function setImportFiles(fileList) {
    const allowed = /\.(jpe?g|png|webp|gif|heic|heif|mov|mp4|m4v)$/i;
    const files = [...fileList].filter((file) => allowed.test(file.name));
    const oversized = files.filter((file) => file.size > 30 * 1024 * 1024);
    lifeState.files = files.filter((file) => file.size <= 30 * 1024 * 1024);
    document.getElementById("life-selected-files").innerHTML = lifeState.files.length
      ? lifeState.files.map((file) => `<div class="life-file-row"><span>${escapeHtml(file.name.split(".").pop().slice(0, 4).toUpperCase())}</span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(formatBytes(file.size))}</small></div>`).join("")
      : "<p>没有可导入的文件</p>";
    if (oversized.length) notify(`${oversized.length} 个文件超过 30 MB，已跳过`, true);
    if (!files.length && fileList.length) notify("请选择受支持的照片或视频格式", true);
  }

  function openImport() {
    if (!lifeState.data) return loadLife().then(openImport);
    resetImport();
    peopleCheckboxes("life-import-people", lifeState.activePerson === "all" ? [] : [lifeState.activePerson]);
    openLifeModal("life-import-modal");
  }

  async function fileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function openMedia(media) {
    lifeState.editingMedia = media;
    document.getElementById("life-media-title").textContent = media.original_name;
    document.getElementById("life-media-time").value = toDateTimeLocal(media.capture_time);
    document.getElementById("life-media-location").value = media.location_name || "";
    document.getElementById("life-media-caption").value = media.caption || "";
    peopleCheckboxes("life-media-people", media.people.map((person) => person.id));
    const preview = document.getElementById("life-media-preview");
    if (media.preview_url) preview.innerHTML = `<img src="${escapeHtml(media.preview_url)}" alt="${escapeHtml(media.caption || media.original_name)}">`;
    else if ([".mov", ".mp4", ".m4v"].includes(media.extension)) preview.innerHTML = `<video src="${escapeHtml(media.file_url)}" controls preload="metadata"></video>`;
    else preview.innerHTML = `<div><span class="life-media-placeholder">${escapeHtml(mediaBadge(media))}</span><a class="secondary-button life-open-original" href="${escapeHtml(media.file_url)}" target="_blank" rel="noopener">打开原文件</a></div>`;
    const exif = media.exif || {};
    const coordinates = Number.isFinite(media.latitude) && Number.isFinite(media.longitude) ? `${media.latitude.toFixed(5)}, ${media.longitude.toFixed(5)}` : "未包含";
    const device = [media.device_make, media.device_model].filter(Boolean).join(" ") || "未包含";
    const dimensions = exif.width && exif.height ? `${exif.width} × ${exif.height}` : "未读取";
    document.getElementById("life-exif-panel").innerHTML = `
      <div class="life-exif-item"><span>格式</span><strong>${escapeHtml(media.extension.replace(".", "").toUpperCase())} · ${escapeHtml(formatBytes(media.file_size))}</strong></div>
      <div class="life-exif-item"><span>设备</span><strong title="${escapeHtml(device)}">${escapeHtml(device)}</strong></div>
      <div class="life-exif-item"><span>GPS</span><strong title="${escapeHtml(coordinates)}">${escapeHtml(coordinates)}</strong></div>
      <div class="life-exif-item"><span>尺寸</span><strong>${escapeHtml(dimensions)}</strong></div>`;
    document.getElementById("life-delete-media").textContent = "删除本地副本";
    openLifeModal("life-media-modal");
  }

  function renderStoryMediaPicker(selectedIds = []) {
    const selected = new Set(selectedIds);
    const media = lifeState.activePerson === "all" ? lifeState.data.media : lifeState.data.media.filter((item) => item.people.some((person) => person.id === lifeState.activePerson));
    document.getElementById("life-story-media-picker").innerHTML = media.length ? media.map((item) => `
      <label class="life-story-media-option"><input type="checkbox" value="${escapeHtml(item.id)}" ${selected.has(item.id) ? "checked" : ""}><span>${item.preview_url ? `<img src="${escapeHtml(item.preview_url)}" alt="">` : escapeHtml(mediaBadge(item))}</span><small>${escapeHtml(item.caption || item.original_name)}</small></label>`).join("") : `<div class="life-empty-small"><strong>没有可选媒体</strong><p>请先导入照片。</p></div>`;
  }

  function openStory(story = null) {
    lifeState.editingStory = story;
    document.getElementById("life-story-title").textContent = story ? "编辑生活故事" : "新建生活故事";
    document.getElementById("life-story-name").value = story?.title || "";
    document.getElementById("life-story-tone").value = story?.tone || "温暖";
    document.getElementById("life-story-time").value = toDateTimeLocal(story?.happened_at);
    document.getElementById("life-story-content").value = story?.content || "";
    document.getElementById("life-story-published").checked = story?.status === "published";
    document.getElementById("life-delete-story").hidden = !story;
    document.getElementById("life-delete-story").textContent = "删除故事";
    renderStoryMediaPicker(story?.media.map((media) => media.id) || []);
    openLifeModal("life-story-modal");
  }

  async function exportLife() {
    try {
      const data = await lifeApi("/api/life/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `memory-ai-life-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("Life Memory 索引已导出；媒体副本仍保存在本机文件夹");
    } catch (error) { notify(error.message, true); }
  }

  function bindModalClose(selector, id) {
    document.querySelectorAll(selector).forEach((button) => button.addEventListener("click", () => closeLifeModal(id)));
  }

  document.querySelectorAll("[data-view-target]").forEach((button) => button.addEventListener("click", () => {
    const isLife = button.dataset.viewTarget === "life";
    document.body.classList.toggle("life-mode", isLife);
    if (isLife && !lifeState.loaded) loadLife();
  }));
  document.getElementById("more-button").addEventListener("click", () => document.body.classList.remove("life-mode"));

  ["life-add-person", "life-add-person-inline", "life-onboarding-person"].forEach((id) => document.getElementById(id).addEventListener("click", () => openPerson()));
  ["life-import", "life-hero-import", "life-import-inline"].forEach((id) => document.getElementById(id).addEventListener("click", openImport));
  document.getElementById("life-new-story").addEventListener("click", () => {
    if (!lifeState.data?.media.length) return notify("请先导入至少一张照片或一个视频", true);
    openStory();
  });
  document.getElementById("life-export").addEventListener("click", exportLife);
  ["life-open-folder-info", "life-privacy-details"].forEach((id) => document.getElementById(id).addEventListener("click", () => openLifeModal("life-privacy-modal")));

  lifeView.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-life-person]");
    if (filter) {
      lifeState.activePerson = filter.dataset.lifePerson;
      renderPeople();
      renderMedia();
      return;
    }
    const editPerson = event.target.closest("[data-edit-life-person]");
    if (editPerson) {
      const person = lifeState.data.people.find((item) => item.id === editPerson.dataset.editLifePerson);
      if (person) openPerson(person);
      return;
    }
    const mediaButton = event.target.closest("[data-life-media]");
    if (mediaButton) {
      const media = lifeState.data.media.find((item) => item.id === mediaButton.dataset.lifeMedia);
      if (media) openMedia(media);
      return;
    }
    const storyButton = event.target.closest("[data-life-story]");
    if (storyButton) {
      const story = lifeState.data.stories.find((item) => item.id === storyButton.dataset.lifeStory);
      if (story) openStory(story);
      return;
    }
    if (event.target.closest("[data-life-empty-import]")) openImport();
    if (event.target.closest("[data-life-retry]")) loadLife();
  });

  document.getElementById("life-person-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("life-person-submit");
    button.disabled = true;
    try {
      const payload = {
        display_name: document.getElementById("life-person-name").value,
        relationship: document.getElementById("life-person-relationship").value,
        notes: document.getElementById("life-person-notes").value,
        color: document.getElementById("life-person-color").value
      };
      if (lifeState.editingPerson) await lifeApi(`/api/life/people/${encodeURIComponent(lifeState.editingPerson.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await lifeApi("/api/life/people", { method: "POST", body: JSON.stringify(payload) });
      closeLifeModal("life-person-modal");
      await loadLife(false);
      notify(lifeState.editingPerson ? "人物空间已更新" : "人物空间已创建");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById("life-delete-person").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!button.dataset.armed) {
      button.dataset.armed = "1";
      button.textContent = "再次点击删除（媒体保留）";
      window.setTimeout(() => { button.dataset.armed = ""; button.textContent = "删除人物"; }, 4200);
      return;
    }
    try {
      await lifeApi(`/api/life/people/${encodeURIComponent(lifeState.editingPerson.id)}`, { method: "DELETE" });
      closeLifeModal("life-person-modal");
      lifeState.activePerson = "all";
      await loadLife(false);
      notify("人物已删除，媒体副本仍保留");
    } catch (error) { notify(error.message, true); }
  });

  const fileInput = document.getElementById("life-file-input");
  fileInput.addEventListener("change", () => setImportFiles(fileInput.files));
  const dropZone = document.getElementById("life-drop-zone");
  ["dragenter", "dragover"].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); }));
  dropZone.addEventListener("drop", (event) => setImportFiles(event.dataTransfer.files));

  document.getElementById("life-import-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!lifeState.files.length) return notify("请先选择照片或视频", true);
    const button = document.getElementById("life-import-submit");
    const progress = document.getElementById("life-import-progress");
    const bar = document.getElementById("life-import-progress-bar");
    const progressText = document.getElementById("life-import-progress-text");
    const personIds = selectedCheckboxValues("life-import-people");
    const caption = document.getElementById("life-import-caption").value;
    let success = 0;
    let duplicates = 0;
    const failures = [];
    button.disabled = true;
    progress.hidden = false;
    for (let index = 0; index < lifeState.files.length; index += 1) {
      const file = lifeState.files[index];
      progressText.textContent = `正在导入 ${index + 1}/${lifeState.files.length} · ${file.name}`;
      bar.style.width = `${Math.round(index / lifeState.files.length * 100)}%`;
      try {
        const dataBase64 = await fileAsBase64(file);
        const result = await lifeApi("/api/life/media/import", {
          method: "POST",
          body: JSON.stringify({ name: file.name, mime_type: file.type || "application/octet-stream", data_base64: dataBase64, last_modified: new Date(file.lastModified).toISOString(), person_ids: personIds, caption })
        });
        if (result.duplicate) duplicates += 1;
        else success += 1;
      } catch (error) { failures.push(`${file.name}：${error.message}`); }
    }
    bar.style.width = "100%";
    progressText.textContent = `完成 · 新增 ${success}，重复 ${duplicates}，失败 ${failures.length}`;
    button.disabled = false;
    button.textContent = failures.length ? "重试失败文件" : "导入完成";
    await loadLife(false);
    if (!failures.length) {
      window.setTimeout(() => closeLifeModal("life-import-modal"), 450);
      notify(`已导入 ${success} 个文件${duplicates ? `，跳过 ${duplicates} 个重复文件` : ""}`);
    } else notify(`有 ${failures.length} 个文件未导入；已完成的内容不会重复处理`, true);
  });

  document.getElementById("life-media-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!lifeState.editingMedia) return;
    const button = event.submitter || document.querySelector("#life-media-form button[type='submit']");
    button.disabled = true;
    try {
      await lifeApi(`/api/life/media/${encodeURIComponent(lifeState.editingMedia.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          capture_time: document.getElementById("life-media-time").value || null,
          location_name: document.getElementById("life-media-location").value,
          caption: document.getElementById("life-media-caption").value,
          person_ids: selectedCheckboxValues("life-media-people")
        })
      });
      closeLifeModal("life-media-modal");
      await loadLife(false);
      notify("媒体信息已更新");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById("life-delete-media").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!button.dataset.armed) {
      button.dataset.armed = "1";
      button.textContent = "再次点击确认删除";
      window.setTimeout(() => { button.dataset.armed = ""; button.textContent = "删除本地副本"; }, 4200);
      return;
    }
    try {
      await lifeApi(`/api/life/media/${encodeURIComponent(lifeState.editingMedia.id)}`, { method: "DELETE" });
      closeLifeModal("life-media-modal");
      await loadLife(false);
      notify("本地媒体副本已删除；原始来源文件未受影响");
    } catch (error) { notify(error.message, true); }
  });

  document.getElementById("life-generate-draft").addEventListener("click", async (event) => {
    const mediaIds = selectedCheckboxValues("life-story-media-picker");
    if (!mediaIds.length) return notify("请至少选择一个媒体", true);
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "正在整理本地信息…";
    try {
      const draft = await lifeApi("/api/life/stories/draft", {
        method: "POST",
        body: JSON.stringify({ media_ids: mediaIds, tone: document.getElementById("life-story-tone").value, title: document.getElementById("life-story-name").value })
      });
      if (!document.getElementById("life-story-name").value.trim()) document.getElementById("life-story-name").value = draft.title;
      document.getElementById("life-story-content").value = draft.content;
      if (!document.getElementById("life-story-time").value) document.getElementById("life-story-time").value = toDateTimeLocal(draft.happened_at);
      notify("本地故事草稿已生成，请补充真实细节");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; button.textContent = "根据所选影像生成本地草稿"; }
  });

  document.getElementById("life-story-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const mediaIds = selectedCheckboxValues("life-story-media-picker");
    const payload = {
      title: document.getElementById("life-story-name").value,
      content: document.getElementById("life-story-content").value,
      tone: document.getElementById("life-story-tone").value,
      happened_at: document.getElementById("life-story-time").value || null,
      status: document.getElementById("life-story-published").checked ? "published" : "draft",
      media_ids: mediaIds,
      person_ids: [...new Set(mediaIds.flatMap((id) => lifeState.data.media.find((media) => media.id === id)?.people.map((person) => person.id) || []))]
    };
    if (!payload.title.trim()) return notify("请填写故事标题，或先生成本地草稿", true);
    const button = event.submitter || document.querySelector("#life-story-form button[type='submit']");
    button.disabled = true;
    try {
      if (lifeState.editingStory) await lifeApi(`/api/life/stories/${encodeURIComponent(lifeState.editingStory.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await lifeApi("/api/life/stories", { method: "POST", body: JSON.stringify(payload) });
      closeLifeModal("life-story-modal");
      await loadLife(false);
      notify(lifeState.editingStory ? "故事已更新" : "故事已保存到本地");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById("life-delete-story").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!button.dataset.armed) {
      button.dataset.armed = "1";
      button.textContent = "再次点击确认删除";
      window.setTimeout(() => { button.dataset.armed = ""; button.textContent = "删除故事"; }, 4200);
      return;
    }
    try {
      await lifeApi(`/api/life/stories/${encodeURIComponent(lifeState.editingStory.id)}`, { method: "DELETE" });
      closeLifeModal("life-story-modal");
      await loadLife(false);
      notify("故事已删除，关联媒体仍保留");
    } catch (error) { notify(error.message, true); }
  });

  bindModalClose("[data-close-life-person]", "life-person-modal");
  bindModalClose("[data-close-life-import]", "life-import-modal");
  bindModalClose("[data-close-life-media]", "life-media-modal");
  bindModalClose("[data-close-life-story]", "life-story-modal");
  bindModalClose("[data-close-life-privacy]", "life-privacy-modal");
  const lifeModals = [...document.querySelectorAll("#life-person-modal, #life-import-modal, #life-media-modal, #life-story-modal, #life-privacy-modal")];
  lifeModals.forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeLifeModal(modal.id); }));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    lifeModals.filter((modal) => !modal.hidden).forEach((modal) => closeLifeModal(modal.id));
  });
})();
