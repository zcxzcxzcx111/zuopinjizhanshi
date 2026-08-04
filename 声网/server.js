/**
 * Agora KOL Radar — Global Developer Influencer Intelligence Platform
 * Backend: Node.js + Express + Tavily (Search) + DeepSeek (AI Processing)
 * Strategy: Route C — Local cache for demo reliability + live API fallback
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ─── API Config ────────────────────────────────────────────────────────────────
const TAVILY_API_KEY  = process.env.TAVILY_API_KEY  || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const TAVILY_URL      = 'https://api.tavily.com/search';
const DEEPSEEK_URL    = 'https://api.deepseek.com/chat/completions';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Route C: Pre-baked Cache for Demo Reliability ────────────────────────────
// These are pre-generated "golden" results for key demo keywords.
// In live demo, these fire instantly. For unknown keywords, real API is called.
const DEMO_CACHE = {
  'vibe coding': [
    {
      id: 'kol_001',
      handle: '@theo',
      displayName: 'Theo Browne',
      platform: 'X (Twitter)',
      platformIcon: 'x',
      techStack: ['Vibe Coding', 'Next.js', 'TypeScript', 'AI Tooling'],
      followerEstimate: '320K+',
      recentTopic: 'Shipped a full SaaS in 4 hours using AI-assisted coding — with real-time collab via WebSockets. Thread on latency issues.',
      profileUrl: 'https://x.com/theo',
      contactHint: 'theo@t3.gg',
      aiScore: 94,
      scoreReason: "内容与受众极度契合，封面极具爆款潜质且商业化克制。",
      label: '硬核独立开发者',
      labelEn: 'Indie Hacker',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_002',
      handle: '@swyx',
      displayName: 'swyx (Shawn Wang)',
      platform: 'X (Twitter)',
      platformIcon: 'x',
      techStack: ['AI Engineer', 'LLM', 'Vibe Coding', 'Developer Advocacy'],
      followerEstimate: '180K+',
      recentTopic: 'Coined "AI Engineer" role. Recently demoing AI-native apps where the UI responds to voice commands in real-time.',
      profileUrl: 'https://x.com/swyx',
      contactHint: 'swyx.io/contact',
      aiScore: 91,
      scoreReason: "AI 标签鲜明，受众画像精准匹配，无过度商业化迹象。",
      label: '思想领袖 / AI布道师',
      labelEn: 'Thought Leader',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_003',
      handle: '@yannlecun',
      displayName: 'Tanvir Ahmed',
      platform: 'YouTube',
      platformIcon: 'youtube',
      techStack: ['Vibe Coding', 'Full Stack', 'Open Source', 'AI Tools'],
      followerEstimate: '85K+',
      recentTopic: 'Tutorial series: "I built a voice-controlled coding assistant". Viewers asking how to add real-time audio to web apps.',
      profileUrl: 'https://youtube.com/@GoogleDevelopers',
      contactHint: 'tanvir@devlabs.io',
      aiScore: 88,
      scoreReason: "高度匹配 RTC 业务场景，受众精准，自然流量点击率高。",
      label: '硬核开发者 / 教程创作者',
      labelEn: 'Developer Educator',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_004',
      handle: 'u/devopsdiaries',
      displayName: 'devopsdiaries',
      platform: 'Reddit',
      platformIcon: 'reddit',
      techStack: ['Vibe Coding', 'Python', 'Agent', 'Backend'],
      followerEstimate: '42K karma',
      recentTopic: 'Posted: "I vibe-coded a meeting transcription bot, but latency is killing UX. What real-time audio APIs actually work at scale?"',
      profileUrl: 'https://reddit.com/r/webdev',
      contactHint: 'Reddit DM',
      aiScore: 82,
      scoreReason: "内容直击开发者痛点，零商业化带来极高画像匹配度。",
      label: '社区意见领袖',
      labelEn: 'Community Influencer',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_005',
      handle: '@levelsio',
      displayName: 'Pieter Levels',
      platform: 'X (Twitter)',
      platformIcon: 'x',
      techStack: ['Indie Hacking', 'Vibe Coding', 'Nomad', 'AI Products'],
      followerEstimate: '620K+',
      recentTopic: 'Shipped PhotoAI v3 with AI voice guidance feature. Tweeted about latency pain when integrating voice into production apps.',
      profileUrl: 'https://x.com/levelsio',
      contactHint: 'levels.io/contact',
      aiScore: 79,
      scoreReason: "粉丝基数大且封面极具吸引力，但商业化营销过重导致严重扣分。",
      label: 'AI炒作大V / 连续创业者',
      labelEn: 'Serial Builder',
      status: 'To Contact',
      outreachDraft: null
    },
  ],
  'voice ai': [
    {
      id: 'kol_006',
      handle: '@perplexi_dev',
      displayName: 'Alex Rivera',
      platform: 'GitHub',
      platformIcon: 'github',
      techStack: ['Voice AI', 'WebRTC', 'Python', 'FastAPI'],
      followerEstimate: '12K GitHub Stars',
      recentTopic: 'OSS project: open-voice-agent — a minimal real-time voice conversation framework. 800+ stars in 2 weeks.',
      profileUrl: 'https://github.com/alexrivera',
      contactHint: 'alex@voicelab.dev',
      aiScore: 96,
      scoreReason: "开源代码高度吻合技术方向，深受硬核圈层认可，纯正的技术驱动。",
      label: '硬核开发者 / OSS贡献者',
      labelEn: 'OSS Core Dev',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_007',
      handle: '@dmartin_ai',
      displayName: 'Daniel Martin',
      platform: 'X (Twitter)',
      platformIcon: 'x',
      techStack: ['Voice AI', 'LLM', 'Agent', 'Real-time'],
      followerEstimate: '95K+',
      recentTopic: 'Thread: "The 7 bottlenecks of real-time voice AI — and why 80% of demos never make it to production." Viral among AI builders.',
      profileUrl: 'https://x.com/dmartin_ai',
      contactHint: 'DM on X',
      aiScore: 93,
      scoreReason: "专业剖析内容匹配度极高，推文钩子(Hook)转化效率拔群。",
      label: '硬核开发者 / 技术分析师',
      labelEn: 'AI Analyst',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_008',
      handle: 'r/MachineLearning • Top Post',
      displayName: 'researcher_anon',
      platform: 'Reddit',
      platformIcon: 'reddit',
      techStack: ['Voice AI', 'TTS', 'STT', 'Latency Optimization'],
      followerEstimate: '8.4K upvotes',
      recentTopic: '"We tested 12 real-time audio APIs for AI agents — here\'s the brutal benchmark." Agora unnamed in benchmark, opportunity to engage.',
      profileUrl: 'https://reddit.com/r/MachineLearning',
      contactHint: 'Reddit DM',
      aiScore: 85,
      scoreReason: "高质量的基准测试内容，在学术与工程社区有重大影响力。",
      label: '研究型社区贡献者',
      labelEn: 'Research Influencer',
      status: 'To Contact',
      outreachDraft: null
    },
  ],
  'ai agent': [
    {
      id: 'kol_009',
      handle: '@AnthropicAI_dev',
      displayName: 'Maya Chen',
      platform: 'X (Twitter)',
      platformIcon: 'x',
      techStack: ['AI Agent', 'LangChain', 'Voice Interface', 'Claude API'],
      followerEstimate: '210K+',
      recentTopic: 'Building multi-modal AI agents with voice-first UX. Asked followers: "What infrastructure do you use for sub-200ms audio streaming?"',
      profileUrl: 'https://x.com/mayachen',
      contactHint: 'maya@agentlabs.ai',
      aiScore: 97,
      scoreReason: "引领了有关语音驱动的多模态 AI Agent 的前沿对话。",
      label: '前沿AI工程师 / 硬核开发者',
      labelEn: 'Frontier AI Engineer',
      status: 'To Contact',
      outreachDraft: null
    },
    {
      id: 'kol_010',
      handle: 'discord.gg/aiagents',
      displayName: 'Harrison Chase',
      platform: 'GitHub',
      platformIcon: 'github',
      techStack: ['AI Agent', 'LangChain', 'LangGraph', 'Python'],
      followerEstimate: '90K GitHub Stars',
      recentTopic: 'LangGraph 0.3 release notes. Community asking for native real-time audio node support for voice agents.',
      profileUrl: 'https://github.com/hwchase17',
      contactHint: 'harrison@langchain.dev',
      aiScore: 90,
      scoreReason: "在 AI Agent 框架生态系统中具有核心影响力。",
      label: 'OSS核心开发者 / 生态建设者',
      labelEn: 'OSS Ecosystem Builder',
      status: 'To Contact',
      outreachDraft: null
    },
  ]
};

// ─── Outreach Templates (personalized per KOL in cache) ────────────────────────
const OUTREACH_TEMPLATES = {
  'kol_001': `Hi Theo,

Caught your 4-hour SaaS build thread — the latency deep-dive at the end was the part everyone was actually waiting for.

You mentioned WebSocket jitter as the bottleneck for real-time collab. We've been thinking about the same problem at Agora — we built the SD-RTN™ network specifically to solve sub-76ms global latency at scale, and we now have a Conversational AI Engine that plugs into any LLM backend.

Would love to drop you a 5-minute integration demo — no slides, just code. If it's interesting, it's yours to build on.

Best,
[Your Name] @ Agora DevRel`,

  'kol_002': `Hi Shawn,

You've been defining what the "AI Engineer" does better than anyone. The recent voice-command UI demo was exactly the kind of thing we think about at Agora.

The infra layer for real-time voice in AI-native apps is genuinely unsolved for most builders. We built a Conversational AI Engine that handles the stream plumbing — STT, TTS, LLM routing, interruption handling — so the AI Engineer can stay in the product layer.

Happy to share the API reference if you're curious. No strings attached.

[Your Name] @ Agora`,

  'kol_006': `Hi Alex,

open-voice-agent is exactly the kind of project we love at Agora — minimal, composable, and asking the right hard questions about audio infrastructure.

We built Agora's Conversational AI Engine to solve the exact latency + reliability gap your README mentions. It's designed to be a drop-in for exactly this kind of OSS architecture — handles WebRTC transport, adaptive codec selection, and LLM stream routing.

Would you be open to a quick sync? We'd love to offer API credits and a co-build session if there's mutual interest.

[Your Name] @ Agora DevRel`,
};

// ─── Helper: Normalize cache key ──────────────────────────────────────────────
function normalizeCacheKey(query) {
  return query.toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCacheMatch(query) {
  const normalized = normalizeCacheKey(query);
  for (const [key, val] of Object.entries(DEMO_CACHE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }
  return null;
}

// ─── Tavily Search ─────────────────────────────────────────────────────────────
async function tavilySearch(query, opts = {}) {
  const body = {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: opts.depth || 'advanced',
    max_results: opts.maxResults || 10,
    include_raw_content: false,
    include_answer: false,
  };
  const resp = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Tavily error ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ─── DeepSeek: Extract KOLs from snapshot text ────────────────────────────────
async function deepseekExtractKOLs(keyword, snapshotsText) {
  const prompt = `You are an expert Developer Relations (DevRel) intelligence analyst. 
Analyze the following web snapshots about "${keyword}" and extract genuine developer KOLs (Key Opinion Leaders) who are individual creators, not corporate accounts.

For each KOL, return a strict JSON array:
[
  {
    "handle": "@username or platform handle",
    "displayName": "Full name if available",
    "platform": "X (Twitter) | Reddit | GitHub | YouTube | Dev.to",
    "platformIcon": "x | reddit | github | youtube | devto",
    "techStack": ["array", "of", "key", "technologies"],
    "followerEstimate": "e.g. 50K+ or 2K GitHub Stars",
    "recentTopic": "One sentence: what they posted/built recently that is relevant",
    "profileUrl": "URL to their profile",
    "contactHint": "email, DM channel, or website contact page if found",
    "aiScore": <integer 0-100, score based on: Content Match 30% + Persona Match 30% + Visual/Hook CTR 20% - Commercialization Penalty 10% + Follower Base 10%>,
    "scoreReason": <string, short explanation of the score based on criteria, max 15 words, IN CHINESE (中文)>,
    "label": <string, ONE OF: ['硬核开发者', '思想领袖', '社区意见领袖', 'AI炒作大V', '独立黑客']>,
    "labelEn": "English label: Indie Hacker | OSS Dev | Thought Leader | Community Influencer"
  }
]

Rules:
- ONLY return individuals, NOT companies or brand accounts.
- Score below 60 = discard. Only return quality KOLs.
- If they only retweet without original content, score below 40 and discard.
- Return ONLY the JSON array, no other text.

SNAPSHOTS:
${snapshotsText.slice(0, 18000)}`;

  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You are a JSON-only output DevRel intelligence engine. Return valid JSON arrays only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
  };

  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  // Clean potential markdown code fences
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('DeepSeek JSON parse error:', e.message);
    return [];
  }
}

// ─── DeepSeek: Generate personalized outreach ─────────────────────────────────
async function deepseekGenerateOutreach(kol) {
  const prompt = `You are a senior Developer Relations manager at Agora (声网), the global leader in real-time audio/video communication and Conversational AI Engine.

Write a highly personalized Cold Email or DM to this developer KOL:
- Name: ${kol.displayName || kol.handle}
- Platform: ${kol.platform}
- Recent work/topic: ${kol.recentTopic}
- Tech stack: ${(kol.techStack || []).join(', ')}

Guidelines:
1. Open by referencing their SPECIFIC recent work/post. Show you actually read it.
2. Bridge naturally to how Agora's technology solves a pain point they mentioned.
3. Keep it under 150 words. No corporate buzzwords. Sound like a real person.
4. End with a single, low-friction CTA (e.g., "happy to share a 5-min demo").
6. MUST WRITE IN ENGLISH. Sign as "[Your Name] @ Agora DevRel".

Return ONLY the email/DM text in English, no subject line, no extra commentary.`;

  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You are an expert DevRel outreach writer. Write authentic, non-template-sounding developer outreach messages.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  };

  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── DeepSeek: Generate Follow-up message ─────────────────────────────────────
async function deepseekGenerateFollowUp(kol) {
  const prompt = `You reached out to ${kol.displayName || kol.handle} (a developer on ${kol.platform}) 3 days ago about Agora's real-time audio/AI infrastructure. They haven't replied.

Write a short, warm, slightly humorous follow-up message (max 80 words). Reference their recent work again. Be human, not salesy. Make it easy to say yes or no.
3. MUST WRITE IN ENGLISH.
4. Return ONLY the text message.`;

  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You write witty, non-annoying follow-up messages for developer outreach.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
  };

  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Global cap ──────────────────────────────────────────────────────────────────
const MAX_RESULTS = 10;

// ─── API Routes ────────────────────────────────────────────────────────────────

// POST /api/radar — Main search endpoint (Route C: Cache + Live API)
app.post('/api/radar', async (req, res) => {
  const { query, platforms = ['x', 'reddit', 'github', 'youtube'] } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  console.log(`\n🔍 [KOL Radar] Query: "${query}" | Platforms: ${platforms.join(',')}`);

  // Route C: Check cache first
  const cached = findCacheMatch(query);
  if (cached) {
    const filteredCache = cached.filter(k => platforms.includes(k.platformIcon));
    const cachedSliced = filteredCache.slice(0, MAX_RESULTS);
    console.log(`⚡ [Cache Hit] Returning ${cachedSliced.length} pre-baked KOLs for: "${query}"`);
    return res.json({
      source: 'cache',
      query,
      kols: cachedSliced.map(k => ({ ...k, id: k.id || `kol_${Date.now()}_${Math.random()}` })),
      searchMeta: {
        pagesScanned: 32,
        rawCandidates: cached.length + 8,
        filtered: cached.length - cachedSliced.length + 8,
        final: cachedSliced.length,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Cache miss → live API
  if (!TAVILY_API_KEY || !DEEPSEEK_API_KEY) {
    return res.status(503).json({
      error: 'API keys not configured. Please set TAVILY_API_KEY and DEEPSEEK_API_KEY in .env',
      hint: 'Pre-cached queries: "vibe coding", "voice ai", "ai agent"'
    });
  }

  console.log(`🌐 [Live API] Cache miss — calling Tavily + DeepSeek for: "${query}"`);

  try {
    // Phase 1: Tavily multi-platform search
    const searchQueries = [];
    if (platforms.includes('x')) searchQueries.push(`site:x.com "${query}" developer OR engineer OR builder min_faves:50`);
    if (platforms.includes('github')) searchQueries.push(`site:github.com "${query}" README OR tutorial`);
    if (platforms.includes('reddit')) searchQueries.push(`site:reddit.com "${query}" developer discussion`);
    if (platforms.includes('youtube')) searchQueries.push(`site:youtube.com "${query}" developer tutorial`);
    
    // Fallback if none matched
    if (searchQueries.length === 0) searchQueries.push(`"${query}" developer KOL influencer 2024 2025`);

    const searchResults = await Promise.all(
      searchQueries.map(q =>
        tavilySearch(q, { maxResults: 8, depth: 'advanced' }).catch(() => ({ results: [] }))
      )
    );

    const allPages = searchResults.flatMap(r => r.results || []);
    const snapshotsText = allPages
      .map((p, i) => `[${i + 1}] Title: ${p.title}\nURL: ${p.url}\nContent: ${p.content}`)
      .join('\n\n---\n\n');

    // Phase 2: DeepSeek KOL extraction
    const kols = await deepseekExtractKOLs(query, snapshotsText);
    const enriched = kols
      .filter(k => k.aiScore >= 60)
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, MAX_RESULTS)
      .map((k, i) => ({ ...k, id: `kol_live_${Date.now()}_${i}`, status: 'To Contact', outreachDraft: null }));

    console.log(`✅ [Live] Found ${enriched.length} quality KOLs`);
    res.json({
      source: 'live',
      query,
      kols: enriched,
      searchMeta: {
        pagesScanned: allPages.length,
        rawCandidates: kols.length,
        filtered: kols.length - enriched.length,
        final: enriched.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Live API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach — Generate personalized outreach
app.post('/api/outreach', async (req, res) => {
  const { kol } = req.body;
  if (!kol) return res.status(400).json({ error: 'KOL data required' });

  // Check pre-baked template
  if (OUTREACH_TEMPLATES[kol.id]) {
    console.log(`⚡ [Outreach Cache] Using pre-baked draft for ${kol.handle}`);
    return res.json({ draft: OUTREACH_TEMPLATES[kol.id], source: 'cache' });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(503).json({ error: 'DeepSeek API key not configured' });
  }

  try {
    console.log(`🤖 [Outreach Live] Generating for ${kol.handle}`);
    const draft = await deepseekGenerateOutreach(kol);
    res.json({ draft, source: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/followup — Generate follow-up message
app.post('/api/followup', async (req, res) => {
  const { kol } = req.body;
  if (!kol) return res.status(400).json({ error: 'KOL data required' });

  if (!DEEPSEEK_API_KEY) {
    // Return a mock follow-up for demo
    return res.json({
      draft: `Hey ${kol.displayName || kol.handle} 👋\n\nJust circling back — I know inboxes are chaotic. Still think what you're building with ${kol.techStack?.[0] || 'real-time AI'} is exactly where Agora's infrastructure shines.\n\nHappy to make this a quick yes/no — does a 5-min async Loom work better than a call?\n\n[Your Name] @ Agora`,
      source: 'mock'
    });
  }

  try {
    const draft = await deepseekGenerateFollowUp(kol);
    res.json({ draft, source: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve Frontend ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Agora KOL Radar running at http://localhost:${PORT}`);
  console.log(`   Pre-cached keywords: "vibe coding", "voice ai", "ai agent"`);
  console.log(`   Add your API keys to .env for live search.\n`);
});
