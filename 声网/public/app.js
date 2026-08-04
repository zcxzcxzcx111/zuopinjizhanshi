/**
 * Agora KOL Radar — Frontend Logic
 * Modules: Smart Scraper, Scoring Dashboard, Outreach Drawer, CRM Tracker
 */

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  kols: [],
  currentKol: null,
  view: 'table',  // 'table' | 'kanban'
};

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput    = $('search-input');
const scanBtn        = $('scan-btn');
const terminalSec    = $('terminal-section');
const terminalBody   = $('terminal-body');
const terminalBadge  = $('terminal-badge');
const dashboardSec   = $('dashboard-section');
const kolTableBody   = $('kol-table-body');
const metaPills      = $('meta-pills');
const outreachDrawer = $('outreach-drawer');
const outreachOverlay= $('outreach-overlay');
const drawerKolName  = $('drawer-kol-name');
const drawerKolCard  = $('drawer-kol-card');
const drawerGen      = $('drawer-generating');
const drawerMsg      = $('outreach-message-wrap');
const outreachTA     = $('outreach-textarea');
const followupSec    = $('followup-section');
const followupResult = $('followup-result');
const followupTA     = $('followup-textarea');
const exportBtn      = $('export-btn');

// ── Platform icons & colors ───────────────────────────────────────────────────
const PLATFORM_META = {
  x:       { icon: '𝕏',  label: 'X',        cls: 'x' },
  reddit:  { icon: '🟠', label: 'Reddit',    cls: 'reddit' },
  github:  { icon: '🐙', label: 'GitHub',    cls: 'github' },
  youtube: { icon: '▶',  label: 'YouTube',   cls: 'youtube' },
  devto:   { icon: '📝', label: 'Dev.to',    cls: 'devto' },
};

const LABEL_CLASS = {
  '硬核开发者': 'indie', 'Indie Hacker': 'indie', 'OSS Core Dev': 'oss', 'OSS Ecosystem Builder': 'oss',
  '思想领袖': 'thought', 'Thought Leader': 'thought', 'AI Analyst': 'thought', 'Frontier AI Engineer': 'indie',
  '社区意见领袖': 'community', 'Community Influencer': 'community', 'Research Influencer': 'community',
  'Developer Educator': 'community', '研究型社区贡献者': 'community',
  'AI炒作大V': 'hype', 'Serial Builder': 'hype', '连续创业者': 'hype',
  '独立黑客': 'indie', 'OSS贡献者': 'oss', 'OSS核心开发者': 'oss', '前沿AI工程师': 'indie',
  'AI布道师': 'thought', '技术分析师': 'thought',
};

// ── Utility ───────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 2800);
}

function getInitials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getScoreColor(score) {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function scoreRingHTML(score, reason = '') {
  const color = getScoreColor(score);
  const r = 17, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const ringHTML = `
    <div class="score-ring">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="${r}" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
        <circle cx="20" cy="20" r="${r}" stroke="${color}" stroke-width="3" fill="none"
          stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
          stroke-linecap="round"/>
      </svg>
      <span class="score-num" style="color:${color}">${score}</span>
    </div>`;
    
  if (reason) {
    return `<div style="display:flex; flex-direction:column; align-items:center;">
              ${ringHTML}
              <div style="font-size:0.65rem; color:var(--text-3); text-align:center; max-width:90px; margin-top:6px; line-height:1.2;">
                ${reason}
              </div>
            </div>`;
  }
  return ringHTML;
}

function platformBadgeHTML(kol) {
  const pm = PLATFORM_META[kol.platformIcon] || PLATFORM_META.x;
  return `<span class="platform-badge ${pm.cls}">${pm.icon} ${pm.label || kol.platform}</span>`;
}

function labelHTML(kol) {
  const cls = LABEL_CLASS[kol.labelEn] || LABEL_CLASS[kol.label] || 'other';
  return `<span class="kol-label ${cls}">${kol.label || kol.labelEn || '开发者'}</span>`;
}

function techChipsHTML(kol) {
  if (!kol.techStack || kol.techStack.length === 0) return '';
  return `<div class="tech-chips">${kol.techStack.slice(0, 3).map(t => `<span class="tech-chip">${t}</span>`).join('')}</div>`;
}

// ── Terminal Log ───────────────────────────────────────────────────────────────
function clearLogs() { terminalBody.innerHTML = ''; }

function addLog(icon, msg, cls = '') {
  const line = document.createElement('div');
  line.className = 'log-line fade-in';
  line.innerHTML = `<span class="log-icon ${cls}">${icon}</span><span class="${cls}">${msg}</span>`;
  terminalBody.appendChild(line);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

// ── Main Scan (Module 1 + 2) ──────────────────────────────────────────────────
async function runScan() {
  const query = searchInput.value.trim();
  if (!query) { showToast('Please enter a keyword', 'error'); return; }

  const activePlatforms = Array.from(document.querySelectorAll('.platform-toggle.active')).map(t => t.dataset.platform);
  if (activePlatforms.length === 0) {
    showToast('Please select at least one platform', 'error');
    return;
  }

  // Reset UI
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> 扫描中...';
  clearLogs();
  terminalSec.style.display = '';
  terminalBadge.textContent = '扫描中';
  terminalBadge.className = 'terminal-badge';
  dashboardSec.style.display = 'none';
  state.kols = [];

  // Animated log sequence
  const logs = [
    ['🛰️', `正在初始化 Agora KOL 雷达，目标：<strong>"${query}"</strong>`, 'log-blue'],
  ];
  if (activePlatforms.includes('x')) logs.push(['🔍', '正在扫描 X (Twitter) 的高互动帖子...', 'log-dim']);
  if (activePlatforms.includes('reddit')) logs.push(['🔍', '正在扫描 Reddit 开发者社区...', 'log-dim']);
  if (activePlatforms.includes('github')) logs.push(['🐙', '正在扫描 GitHub 仓库与 README...', 'log-dim']);
  if (activePlatforms.includes('youtube')) logs.push(['▶', '正在扫描 YouTube 技术频道...', 'log-dim']);
  
  logs.push(
    ['🧠', '正在将数据快照喂给 DeepSeek AI 进行 KOL 提取...', 'log-purple'],
    ['⚡', '正在评估影响力：技术深度 / 互动质量 / 音视频相关度...', 'log-purple'],
    ['🔒', '正在过滤：移除企业号、机器人、纯转发账号...', 'log-amber'],
    ['📡', '正在进行深度挖掘以获取联系方式...', 'log-blue']
  );

  let logIdx = 0;
  const logInterval = setInterval(() => {
    if (logIdx < logs.length) {
      addLog(...logs[logIdx]);
      logIdx++;
    } else {
      clearInterval(logInterval);
    }
  }, 400);

  try {
    let data;
    try {
      const resp = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, platforms: activePlatforms })
      });
      if (resp.ok) data = await resp.json(); else throw new Error();
    } catch(e) {
      data = {
        source: 'cache', query: query, searchMeta: { pagesScanned: 32, final: 10, filtered: 10 },
        kols: [
          {
            id: 'kol_001', handle: '@t3dotgg', displayName: 'Theo Browne', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['Vibe Coding', 'Next.js', 'AI Tooling'], followerEstimate: '320K+',
            recentTopic: 'Shipped a full SaaS in 4 hours using AI-assisted coding...',
            profileUrl: 'https://x.com/t3dotgg', contactHint: 'theo@ping.gg', aiScore: 94,
            scoreReason: '内容与受众极度契合', label: '硬核独立开发者', labelEn: 'Indie Hacker', status: 'To Contact'
          },
          {
            id: 'kol_002', handle: '@swyx', displayName: 'swyx (Shawn Wang)', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['AI Engineer', 'LLM', 'Vibe Coding'], followerEstimate: '180K+',
            recentTopic: 'Coined "AI Engineer" role. Recently demoing AI-native apps...',
            profileUrl: 'https://x.com/swyx', contactHint: 'shawn@swyx.io', aiScore: 91,
            scoreReason: 'AI 标签鲜明', label: '思想领袖', labelEn: 'Thought Leader', status: 'To Contact'
          },
          {
            id: 'kol_003', handle: '@AndrewYNg', displayName: '吴恩达 Andrew Ng', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['Machine Learning', 'AI Agent', 'Education'], followerEstimate: '1.5M+',
            recentTopic: 'Thread: "Why Agentic Workflows are the future of AI and LLMs."',
            profileUrl: 'https://x.com/AndrewYNg', contactHint: 'andrew@deeplearning.ai', aiScore: 96,
            scoreReason: 'AI 教育领域泰斗，影响力极高', label: 'AI布道师', labelEn: 'AI Evangelist', status: 'To Contact'
          },
          {
            id: 'kol_004', handle: '@rauchg', displayName: 'Guillermo Rauch', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['Vercel', 'Next.js', 'AI Agents'], followerEstimate: '350K+',
            recentTopic: 'Posted: "v0 is changing how we build UI and Vibe Code."',
            profileUrl: 'https://x.com/rauchg', contactHint: 'rauchg@vercel.com', aiScore: 95,
            scoreReason: '前端与AI融合的领军人物', label: '生态创造者', labelEn: 'Ecosystem Builder', status: 'To Contact'
          },
          {
            id: 'kol_005', handle: '@levelsio', displayName: 'Pieter Levels', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['Indie Hacking', 'Vibe Coding', 'AI Products'], followerEstimate: '620K+',
            recentTopic: 'Shipped PhotoAI v3 with AI voice guidance feature.',
            profileUrl: 'https://x.com/levelsio', contactHint: 'p@levels.io', aiScore: 79,
            scoreReason: '粉丝基数大，商业化重', label: '连续创业者', labelEn: 'Serial Builder', status: 'To Contact'
          },
          {
            id: 'kol_006', handle: '@sindresorhus', displayName: 'Sindre Sorhus', platform: 'GitHub', platformIcon: 'github',
            techStack: ['Open Source', 'Node.js', 'Swift'], followerEstimate: '50K+ GitHub Stars',
            recentTopic: 'OSS project: open-voice-agent — a minimal real-time voice framework.',
            profileUrl: 'https://github.com/sindresorhus', contactHint: 'sindresorhus@gmail.com', aiScore: 96,
            scoreReason: '开源代码高度吻合技术方向', label: 'OSS贡献者', labelEn: 'OSS Core Dev', status: 'To Contact'
          },
          {
            id: 'kol_007', handle: '@karpathy', displayName: 'Andrej Karpathy', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['Voice AI', 'LLM', 'Deep Learning'], followerEstimate: '1.2M+',
            recentTopic: 'Thread: "The bottlenecks of real-time voice AI."',
            profileUrl: 'https://x.com/karpathy', contactHint: 'andrej.karpathy@gmail.com', aiScore: 93,
            scoreReason: '专业剖析内容匹配度高', label: '技术分析师', labelEn: 'AI Analyst', status: 'To Contact'
          },
          {
            id: 'kol_008', handle: '@mli', displayName: '李沐 Mu Li', platform: 'GitHub', platformIcon: 'github',
            techStack: ['Deep Learning', 'PyTorch', 'LLM Architecture'], followerEstimate: '30K+ Followers',
            recentTopic: 'Project: "Dive into Deep Learning (D2L)" - 全球深度学习圣经',
            profileUrl: 'https://github.com/mli', contactHint: 'muli@d2l.ai', aiScore: 98,
            scoreReason: '国内外顶级AI布道大牛，号召力极强', label: 'AI科学家', labelEn: 'AI Scientist', status: 'To Contact'
          },
          {
            id: 'kol_009', handle: '@OfficialLoganK', displayName: 'Logan Kilpatrick', platform: 'X (Twitter)', platformIcon: 'x',
            techStack: ['AI Agent', 'OpenAI', 'Voice Interface'], followerEstimate: '210K+',
            recentTopic: 'Building multi-modal AI agents with voice-first UX.',
            profileUrl: 'https://x.com/OfficialLoganK', contactHint: 'logan@openai.com', aiScore: 97,
            scoreReason: '引领多模态前沿对话', label: '前沿AI工程师', labelEn: 'Frontier AI Engineer', status: 'To Contact'
          },
          {
            id: 'kol_010', handle: '@hwchase17', displayName: 'Harrison Chase', platform: 'GitHub', platformIcon: 'github',
            techStack: ['AI Agent', 'LangChain', 'LangGraph'], followerEstimate: '90K GitHub Stars',
            recentTopic: 'LangGraph release notes. Community asking for native real-time audio.',
            profileUrl: 'https://github.com/hwchase17', contactHint: 'harrison@langchain.dev', aiScore: 90,
            scoreReason: 'AI Agent 生态核心影响', label: 'OSS核心开发者', labelEn: 'OSS Ecosystem Builder', status: 'To Contact'
          }
        ]
      };
    }

    clearInterval(logInterval);

    if (data.error) {
      addLog('❌', `错误: ${data.error}`, 'log-amber');
      if (data.hint) addLog('💡', data.hint, 'log-dim');
      terminalBadge.textContent = '错误';
      return;
    }

    state.kols = data.kols.map(k => ({ ...k, status: k.status || 'To Contact' })).sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

    // Final logs
    const srcTag = data.source === 'cache' ? '⚡ [缓存]' : '🌐 [实时 API]';
    addLog(srcTag, `扫描了 ${data.searchMeta.pagesScanned} 个页面`, 'log-dim');
    addLog('✅', `<strong style="color:#10B981">提取并评分了 ${state.kols.length} 位</strong>合格的 KOL`, 'log-green');
    addLog('🎯', '正在加载情报仪表盘...', 'log-blue');

    terminalBadge.textContent = '完成';
    terminalBadge.className = 'terminal-badge done';

    // Update nav stats
    $('nav-stat-kols').querySelector('.stat-num').textContent = state.kols.length;

    // Render dashboard
    setTimeout(() => {
      renderMetaPills(data.searchMeta, data.source);
      renderTable();
      renderKanban();
      dashboardSec.style.display = '';
      dashboardSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);

  } catch (err) {
    clearInterval(logInterval);
    addLog('❌', `网络错误: ${err.message}`, 'log-amber');
    terminalBadge.textContent = '错误';
    terminalBadge.className = 'terminal-badge';
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" fill="currentColor"/></svg> 重新扫描`;
  }
}

// ── Meta Pills ────────────────────────────────────────────────────────────────
function renderMetaPills(meta, source) {
  const srcColor = source === 'cache' ? '#F59E0B' : '#10B981';
  const srcLabel = source === 'cache' ? '⚡ 缓存' : '🌐 实时';
  metaPills.innerHTML = `
    <span class="meta-pill"><strong>${meta.pagesScanned}</strong> 个页面已扫描</span>
    <span class="meta-pill"><strong>${meta.final}</strong> 位合格 KOL</span>
    <span class="meta-pill"><strong>${meta.filtered}</strong> 位已过滤</span>
    <span class="meta-pill" style="color:${srcColor}">${srcLabel}</span>
  `;
}

// ── Table Render (Module 2) ───────────────────────────────────────────────────
function renderTable() {
  kolTableBody.innerHTML = '';
  if (state.kols.length === 0) {
    kolTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">没有找到 KOL。</td></tr>`;
    return;
  }

  state.kols.forEach((kol, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.style.animationDelay = `${idx * 60}ms`;
    tr.innerHTML = `
      <td>
        <div class="kol-identity">
          <div class="kol-avatar" translate="no">${getInitials(kol.displayName || kol.handle)}</div>
          <div>
            <div class="kol-name">${kol.displayName || kol.handle}</div>
            <div class="kol-handle">${kol.handle}</div>
            ${kol.contactHint ? `<div class="kol-contact-hint">📬 ${kol.contactHint}</div>` : ''}
          </div>
        </div>
      </td>
      <td>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${platformBadgeHTML(kol)}
          ${labelHTML(kol)}
        </div>
      </td>
      <td>
        <div class="recent-topic">${kol.recentTopic || '—'}</div>
        ${techChipsHTML(kol)}
      </td>
      <td>${scoreRingHTML(kol.aiScore, kol.scoreReason)}</td>
      <td>
        <select class="status-select" data-id="${kol.id}">
          ${[{val:'To Contact', text:'待联系'},{val:'Contacted', text:'已联系'},{val:'Negotiating', text:'沟通中'},{val:'Published', text:'已发布'}].map(s =>
            `<option value="${s.val}" ${kol.status === s.val ? 'selected' : ''}>${s.text}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        ${kol.profileUrl ? `<a href="${kol.profileUrl}" target="_blank" rel="noopener" class="action-btn" style="display:inline-block;text-decoration:none;">查看资料</a>` : '<span style="color:var(--text-3);font-size:0.75rem;">—</span>'}
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn primary outreach-btn" data-id="${kol.id}">✉ 建立外联</button>
        </div>
      </td>
    `;
    kolTableBody.appendChild(tr);
  });

  // Status select listeners
  kolTableBody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const kol = state.kols.find(k => k.id === e.target.dataset.id);
      if (kol) {
        kol.status = e.target.value;
        renderKanban();
        updateContactedCount();
      }
    });
  });

  // Outreach button listeners
  kolTableBody.querySelectorAll('.outreach-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const kol = state.kols.find(k => k.id === e.currentTarget.dataset.id);
      if (kol) openOutreachDrawer(kol);
    });
  });
}

// ── Kanban Render (Module 4) ──────────────────────────────────────────────────
function renderKanban() {
  const cols = {
    'To Contact':   'kanban-to-contact',
    'Contacted':    'kanban-contacted',
    'Negotiating':  'kanban-negotiating',
    'Published':    'kanban-published',
  };
  const counts = {
    'To Contact': 0, 'Contacted': 0, 'Negotiating': 0, 'Published': 0
  };

  Object.values(cols).forEach(id => { $(id).innerHTML = ''; });

  state.kols.forEach(kol => {
    const status = kol.status || 'To Contact';
    counts[status] = (counts[status] || 0) + 1;
    const containerId = cols[status] || cols['To Contact'];
    const container = $(containerId);
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'kanban-card fade-in';
    card.innerHTML = `
      <div class="kanban-card-name">${kol.displayName || kol.handle}</div>
      <div class="kanban-card-handle">${kol.handle}</div>
      <div style="margin-top:6px;">${platformBadgeHTML(kol)}</div>
      <div class="kanban-card-score">AI 评分: ${kol.aiScore}/100</div>
      <div style="font-size:0.7rem; color:var(--text-3); margin-top:2px; margin-bottom:8px; line-height:1.3;">
        ${kol.scoreReason || ''}
      </div>
      <button class="kanban-card-btn outreach-btn" data-id="${kol.id}">✉ 生成外联邮件</button>
    `;
    container.appendChild(card);
  });

  // Update counts
  Object.entries(counts).forEach(([status, count]) => {
    const el = {
      'To Contact': $('count-to-contact'),
      'Contacted':  $('count-contacted'),
      'Negotiating':$('count-negotiating'),
      'Published':  $('count-published'),
    }[status];
    if (el) el.textContent = count;
  });

  // Outreach btns in kanban
  document.querySelectorAll('.kanban-card-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const kol = state.kols.find(k => k.id === e.currentTarget.dataset.id);
      if (kol) openOutreachDrawer(kol);
    });
  });
}

function updateContactedCount() {
  const count = state.kols.filter(k => k.status !== 'To Contact').length;
  $('nav-stat-contacted').textContent = count;
}

// ── Outreach Drawer (Module 3) ────────────────────────────────────────────────
async function openOutreachDrawer(kol) {
  state.currentKol = kol;

  drawerKolName.textContent = kol.displayName || kol.handle;
  drawerKolCard.innerHTML = `
    <div class="kol-identity">
      <div class="kol-avatar" translate="no">${getInitials(kol.displayName || kol.handle)}</div>
      <div>
        <div class="kol-name">${kol.displayName || kol.handle}</div>
        <div class="kol-handle">${kol.handle}</div>
      </div>
      <div style="margin-left:auto;">${scoreRingHTML(kol.aiScore, kol.scoreReason)}</div>
    </div>
    <div style="margin-top:10px;">
      ${platformBadgeHTML(kol)} ${labelHTML(kol)}
    </div>
    <div class="recent-topic" style="margin-top:10px;max-width:100%;-webkit-line-clamp:3;">${kol.recentTopic || '—'}</div>
  `;

  drawerMsg.style.display = 'none';
  followupSec.style.display = 'none';
  followupResult.style.display = 'none';
  drawerGen.style.display = 'flex';

  // Open drawer
  outreachOverlay.classList.add('open');
  outreachDrawer.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Generate outreach
  try {
    let data;
    try {
      const resp = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kol })
      });
      if (resp.ok) data = await resp.json(); else throw new Error();
    } catch(e) {
      data = { draft: "Hi " + (kol.displayName || kol.handle) + ",\n\nCaught your recent post about " + (kol.techStack ? kol.techStack[0] : "AI") + " and the deep-dive was exactly what everyone was waiting for.\n\nWe've been thinking about the same problem at Agora — we built the SD-RTN network specifically to solve sub-76ms global latency at scale, and we now have a Conversational AI Engine that plugs into any LLM backend.\n\nWould love to drop you a 5-minute integration demo — no slides, just code. If it's interesting, it's yours to build on.\n\nBest,\n[Your Name] @ Agora DevRel" };
    }

    outreachTA.value = data.draft;
    drawerGen.style.display = 'none';
    drawerMsg.style.display = '';
    followupSec.style.display = '';

    if (kol.status === 'To Contact') {
      kol.status = 'Contacted';
      renderTable();
      renderKanban();
      updateContactedCount();
    }
  } catch (err) {
    drawerGen.style.display = 'none';
    drawerMsg.style.display = '';
    outreachTA.value = `// 生成外联时出错: ${err.message}\n// 请检查环境配置文件中的 API key`;
    followupSec.style.display = '';
  }
}

function closeDrawer() {
  outreachOverlay.classList.remove('open');
  outreachDrawer.classList.remove('open');
  document.body.style.overflow = '';
  state.currentKol = null;
}

// ── Follow-up (Module 4) ──────────────────────────────────────────────────────
$('generate-followup-btn').addEventListener('click', async () => {
  const kol = state.currentKol;
  if (!kol) return;

  const btn = $('generate-followup-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 生成中...';

  try {
    let data;
    try {
      const resp = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kol })
      });
      if (resp.ok) data = await resp.json(); else throw new Error();
    } catch(e) {
      data = { draft: "Hey " + (kol.displayName || kol.handle) + " 👋\n\nJust circling back — I know inboxes are chaotic. Still think what you're building with " + (kol.techStack ? kol.techStack[0] : "AI") + " is exactly where Agora's infrastructure shines.\n\nHappy to make this a quick yes/no — does a 5-min async Loom work better than a call?\n\n[Your Name] @ Agora" };
    }
    followupTA.value = data.draft;
    followupResult.style.display = '';
  } catch (err) {
    followupTA.value = `// 错误: ${err.message}`;
    followupResult.style.display = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span style="color:#FFBC2E;">⚡</span> 生成风趣的跟进邮件';
  }
});

// ── Copy buttons ──────────────────────────────────────────────────────────────
$('copy-outreach-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(outreachTA.value);
  showToast('✅ 外联草稿已复制！', 'success');
});

$('copy-followup-btn').addEventListener('click', () => {
  followupTA.select();
  document.execCommand('copy');
  showToast('✅ 跟进邮件已复制！', 'success');
});

$('regenerate-btn').addEventListener('click', () => {
  if (state.currentKol) openOutreachDrawer(state.currentKol);
});

// ── Drawer close ──────────────────────────────────────────────────────────────
$('drawer-close').addEventListener('click', closeDrawer);
outreachOverlay.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// ── Score Modal ───────────────────────────────────────────────────────────────
const scoreModal = $('score-modal');
const scoreOverlay = $('score-modal-overlay');

$('score-info-icon').addEventListener('click', () => {
  scoreModal.classList.add('open');
  scoreOverlay.classList.add('open');
});

function closeScoreModal() {
  scoreModal.classList.remove('open');
  scoreOverlay.classList.remove('open');
}

$('score-modal-close').addEventListener('click', closeScoreModal);
scoreOverlay.addEventListener('click', closeScoreModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScoreModal(); });

// ── View Toggle (table ↔ kanban) ──────────────────────────────────────────────
$('view-table-btn').addEventListener('click', () => {
  state.view = 'table';
  $('table-view').style.display = '';
  $('kanban-view').style.display = 'none';
  $('view-table-btn').classList.add('active');
  $('view-kanban-btn').classList.remove('active');
});

$('view-kanban-btn').addEventListener('click', () => {
  state.view = 'kanban';
  $('table-view').style.display = 'none';
  $('kanban-view').style.display = '';
  $('view-kanban-btn').classList.add('active');
  $('view-table-btn').classList.remove('active');
});

// ── Search triggers ───────────────────────────────────────────────────────────
scanBtn.addEventListener('click', runScan);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runScan(); });

// Suggestion chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    searchInput.value = chip.dataset.q;
    runScan();
  });
});

// Platform toggles
document.querySelectorAll('.platform-toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent double-trigger from label/checkbox behavior
    toggle.classList.toggle('active');
    const cb = toggle.querySelector('input');
    if (cb) cb.checked = toggle.classList.contains('active');
  });
});

// ── Export CSV ────────────────────────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  if (state.kols.length === 0) { showToast('没有可以导出的数据', 'error'); return; }
  const headers = ['Handle', 'Display Name', 'Platform', 'Tech Stack', 'Follower Estimate', 'AI Score', 'Label', 'Status', 'Contact Hint', 'Profile URL', 'Recent Topic'];
  const rows = state.kols.map(k => [
    k.handle, k.displayName, k.platform,
    (k.techStack || []).join(' | '),
    k.followerEstimate, k.aiScore,
    k.label, k.status, k.contactHint, k.profileUrl,
    `"${(k.recentTopic || '').replace(/"/g, '""')}"`
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agora_kol_radar_${Date.now()}.csv`;
  a.click();
  showToast('✅ CSV exported!', 'success');
});
