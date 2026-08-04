/* ==========================================================================
   高顿教育 (Gaodun Education) - 微信智能营销工作台核心逻辑 script.js
   Four-Step SOP Engine & Interactive WeChat iPhone Simulator
   ========================================================================== */

let currentMatrix = 'tool';
let currentSelectedTitle = '';

// In the portfolio this app lives in an iframe. Report the true content edge
// whenever the editor or preview changes so the surrounding project card does
// not retain a viewport-sized empty tail.
function initPortfolioEmbedHeight() {
    if (window.parent === window) return;

    document.body.classList.add('embedded-portfolio');
    const main = document.querySelector('.main-container');
    if (!main) return;

    const reportHeight = () => {
        const height = Math.ceil(main.offsetTop + main.offsetHeight);
        window.parent.postMessage(
            { type: 'embedded:content-height', iframeId: 'iframe-wechat', height },
            window.location.origin
        );
    };

    requestAnimationFrame(reportHeight);
    new ResizeObserver(() => requestAnimationFrame(reportHeight)).observe(main);
    new MutationObserver(() => requestAnimationFrame(reportHeight)).observe(main, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

document.addEventListener('DOMContentLoaded', initPortfolioEmbedHeight, { once: true });

// Sample Preset Materials
const PRESETS = {
    acca: `【ACCA最新教育部与官方认证免考细则更新 - 2026年秋季考季通知】
随着全球财会数字化与高校课程改革，ACCA官方与中国多所“双一流”及重点高校达成更深度的学分互认与免考协议。
核心变动政策：
1. 会计学/财务管理专业全日制本科生：在完成大二下学期或大三核心专业课（如基础会计、中级财务会计、财务管理学、税法等）并通过学校期末考试后，最高可直接申请免考 ACCA 前 5 门（F1-F5）甚至达到 9 门（F1-F9，部分MPAcc和中外合作办学ACCA方向班）。
2. 金融学/国际经济与贸易专业：经过课程大纲对齐认证，可申请免考 F1-F3 及基础商业科目。
3. 跨专业（如计算机、英语、法学等）：如通过高顿前置先导课程或通过CPA科目，也享有专项提速通路。
痛点洞察：多数大二大三学生根本不知道自己的学校和专业能直接免几门，白白浪费了多考好几门的几百个小时和高额考试报名费！`,

    cpa: `【2026全国注册会计师 (CPA) 报名资格自测与薪资分层调查】
很多跨专业应届毕业生或职场1-3年财会新人经常在后台询问：“我不是会计专业，能不能直接报考今年CPA？”“大四在读可以直接报名吗？”
依据中协最新报名要求：
1. 具有高等专科及以上学校毕业学历，或者具有会计或者相关专业中级以上技术职称的，可以直接报考专业阶段6科。
2. 大学本科应届毕业生（大四下学期）可以通过学信网学籍认证直接报考当年8月份的CPA全国统考！大一至大三暂不具备直接报考全国统考资格，但强烈建议在大二大三完成【CPA先修与基础夯实】，确保毕业第一年直接一次性过3科或全科！
薪资调研对比：
在普华永道/德勤及国内上市券商投行，持有CPA证书或过专业阶段3科以上的求职者，面试通过率是普通简历的3.8倍。入职第一年起薪差距平均达 4,500元/月，3年晋升经理岗位后年薪稳超 35万-50万。`,

    kaoyan: `【2026年会计专硕(MPAcc)/金融专硕(MF) 考研报录比深度分析与逆袭地图】
据教育部考研报名数据预测，2026年全国研究生报名规模虽有分流，但财经、管理类专硕（尤其是MPAcc与金融专硕）名校的竞争依然呈现极高热度。复旦大学、上海财经大学、中国人民大学、中央财经大学等头部高校全日制推免及名额进一步向拔尖人才倾斜。
普通二本/双非财经院校学员的痛点：
1. 初试管综（199）太容易拉不开分差，英语二要想突破80分难度急剧增加；
2. 复试阶段极度重视专业课基础与财会实操证书（如果手握CPA通过科目或ACCA全科/前九门，复试逆袭概率大幅提升高达65%）。
解决方案：必须从大二大三开始执行“考研+高含金量证书双线并进”策略！`
};

// ================= Matrix Selection Engine =================
function selectMatrix(matrixType, btnElement) {
    currentMatrix = matrixType;
    document.querySelectorAll('.matrix-btn').forEach(b => b.classList.remove('active', 'matrix-tool', 'matrix-whitepaper', 'matrix-hot'));
    
    btnElement.classList.add('active');
    if (matrixType === 'tool') btnElement.classList.add('matrix-tool');
    if (matrixType === 'wp') btnElement.classList.add('matrix-whitepaper');
    if (matrixType === 'hot') btnElement.classList.add('matrix-hot');
    
    // Auto sync conversion dropdown
    const ctaSelect = document.getElementById('cta-type-select');
    if (matrixType === 'tool') ctaSelect.value = 'acca_tool';
    if (matrixType === 'wp') ctaSelect.value = 'whitepaper';
    if (matrixType === 'hot') ctaSelect.value = 'cpa_tool';
    if (matrixType === 'ip') ctaSelect.value = 'community';
}

function loadSampleText() {
    loadPreset('acca');
}

function loadPreset(key) {
    const textarea = document.getElementById('raw-material-input');
    textarea.value = PRESETS[key];
    
    if (key === 'acca') selectMatrix('tool', document.getElementById('btn-matrix-tool'));
    if (key === 'cpa') selectMatrix('tool', document.getElementById('btn-matrix-tool'));
    if (key === 'kaoyan') selectMatrix('wp', document.getElementById('btn-matrix-wp'));
    
    showToast(`✔ 已加载【${key.toUpperCase()}】典型场景文本，点击底部启动排版与生成！`);
}

// ================= Step 1 & 2 & 3: AI Co-Creation Generation Engine =================
function runAISteps() {
    const rawText = document.getElementById('raw-material-input').value.trim();
    if (!rawText) {
        showToast('⚠️ 请先在左侧输入框填入或点击选择一份参考材料文本！');
        return;
    }

    showToast('⚡ AI正在诊断文本并策划 5 组爆款 A/B 标题...');

    // Generate 5 A/B Titles based on current matrix
    let titles = [];
    if (currentMatrix === 'tool' || rawText.includes('ACCA') || rawText.includes('免考')) {
        titles = [
            { tag: '极简干货型', text: '别白考了！2026年ACCA免考条件大盘点，这些专业最多免考9门！', score: '98.5分', type: 'utility' },
            { tag: '痛点焦虑型', text: '为什么劝你大二一定要查清你的ACCA免考资格？算完这笔账我惊了', score: '97.2分', type: 'anxiety' },
            { tag: '权威信息差', text: '重磅！教育部学分互认升级，你所在的大学到底能直接免几门？', score: '95.8分', type: 'authority' },
            { tag: '对号入座型', text: '看懂这3条免考细则，省下几百小时复习时间与上万元报名费！', score: '96.0分', type: 'test' },
            { tag: '趋势借势型', text: '非科班、无证书、不考研…2026年的财经人还有退路吗？', score: '94.5分', type: 'trend' }
        ];
    } else if (currentMatrix === 'wp' || rawText.includes('考研') || rawText.includes('白皮书')) {
        titles = [
            { tag: '权威报告型', text: '重磅首发！2026《财经名企与四大招聘红利白皮书》：他们在抢哪类人？', score: '99.1分', type: 'authority' },
            { tag: '痛点焦虑型', text: '考研还是直接就业？这份80页四大起薪与录取地图把残酷真相写透了', score: '97.8分', type: 'anxiety' },
            { tag: '极简干货型', text: '数据曝光！过了CPA/ACCA的前3年，薪资差距到底拉开多远？（附报告）', score: '96.5分', type: 'utility' },
            { tag: '对号入座型', text: '千万别盲目考研！除非你的大学专业符合这4条核心就业竞争逻辑', score: '95.0分', type: 'test' },
            { tag: '趋势热点型', text: '复旦/上财专硕报录比出炉：为什么高分落榜生都在死磕这张证书？', score: '94.2分', type: 'trend' }
        ];
    } else {
        titles = [
            { tag: '痛点共情型', text: 'CPA报名倒计时！大学四年到底要考哪些含金量极高的硬核证书？', score: '98.0分', type: 'anxiety' },
            { tag: '干货自测型', text: '3秒一键自测：你今天的学历和专业，能不能直接报考全国CPA？', score: '97.4分', type: 'test' },
            { tag: '名流背书型', text: '从二本财经到入职四大+CPA过三科，这位22岁女孩的笔记刷屏了！', score: '96.2分', type: 'authority' },
            { tag: '趋势警示型', text: '当AI开始自动对账与出报表，第一批被淘汰的会计已经出现！', score: '95.5分', type: 'trend' },
            { tag: '极简指南型', text: '2026年财会人最值得考的三张金字塔证书，少走两年的求职弯路', score: '94.8分', type: 'utility' }
        ];
    }

    renderTitleOptions(titles);
    
    // Select the first title by default and generate article
    selectTitleOption(titles[0].text, 0);

    // Generate Article Content
    const ctaChoice = document.getElementById('cta-type-select').value;
    const generatedArticle = generateGoldenArticle(titles[0].text, rawText, ctaChoice);
    
    const editor = document.getElementById('wechat-editor');
    editor.value = generatedArticle;
    editor.classList.add('ai-streaming-glow');
    setTimeout(() => {
        editor.classList.remove('ai-streaming-glow');
    }, 1800);

    updateWeChatPreview();
}

function renderTitleOptions(titles) {
    const container = document.getElementById('title-list-container');
    container.innerHTML = '';
    
    titles.forEach((item, index) => {
        let tagClass = 'tag-utility';
        if (item.type === 'anxiety') tagClass = 'tag-anxiety';
        if (item.type === 'authority') tagClass = 'tag-authority';
        if (item.type === 'trend') tagClass = 'tag-trend';
        if (item.type === 'test') tagClass = 'tag-test';

        const div = document.createElement('div');
        div.className = `title-card ${index === 0 ? 'selected' : ''}`;
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
                <span class="title-tag ${tagClass}">${item.tag}</span>
                <span class="title-score" onclick="event.stopPropagation(); showTitleAnalysis('${item.text}', '${item.score}', '${item.type}')" style="cursor:help; text-decoration:underline dashed rgba(255,255,255,0.4); text-underline-offset:3px;" title="点击查看 AI 评分多维解析矩阵">打开率预测 ${item.score} <i class="fa-solid fa-chart-radar" style="font-size:10px; opacity:0.8; margin-left:2px;"></i></span>
            </div>
            <div class="title-text" style="width: 100%;">${item.text}</div>
        `;
        div.onclick = () => {
            document.querySelectorAll('.title-card').forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
            selectTitleOption(item.text, index);
            const ed = document.getElementById('wechat-editor');
            if (ed) {
                ed.classList.add('ai-streaming-glow');
                setTimeout(() => ed.classList.remove('ai-streaming-glow'), 1200);
            }
        };
        container.appendChild(div);
    });
}

function selectTitleOption(titleText, index) {
    currentSelectedTitle = titleText;
    document.getElementById('wechat-preview-title').innerText = titleText;
    showToast(`✔ 已替换推文标题：【${titleText}】`);
}

// ================= Article Generator (Golden Structure) =================
function generateGoldenArticle(title, rawMaterial, ctaChoice) {
    let article = `【黄金前缀·读前必看】
在2026年极度内卷的升学与求职形势下，光有一张普通本科学历证早已经无法让四大会计师事务所、上市券商或世界500强企业向你敞开大门！
许多大学生与职场新人在备考和考证上走了多达两年的冤枉路——要么盲目卷死记硬背的初级，要么根本不知道自己就读的学校与专业**最高可直接免考9门 ACCA 或大四直接一次性报考 CPA 3科！**
本文将帮你把繁杂的教育部与行业报考政策彻底精简，看懂这几条，至少省下几百小时无用功！

---

### 一、 为什么传统的“纯学历证书”不再是唯一的就业通关符？

结合高顿教育职业发展研究院最近3年的内部追踪数据，无论是在国际四大会计师事务所（普华永道、德勤、毕马威、安永），还是中金、中信等头部券商，HR 筛选简历的标准正发生深刻变革：

| 求职面试考察维度 | 普通大学应届生（仅毕业证） | 拥有CPA过科 / ACCA免考过科背景 | 优势对比 |
| :--- | :--- | :--- | :--- |
| **名企网申简历通过率** | 约 12% - 18% | **超过 65%** | **提升将近4倍** |
| **首年起薪中位数** | 6,500 - 8,000元/月 | **11,500 - 15,000元/月** | **入职直跨一个阶梯** |
| **核心业务上手速度** | 需3-6个月适应出纳与基础账务 | **直接进入项目组审计与咨询建模** | **深得合伙人青睐** |

> **💡 读者留步金句：**
> 决定一个人真正财务职场上限的，从不是你大一进校时的起点，而是你在大二至大四这3年里，为自己铸造了多少别人拿不走的专业证书护城河。

---

### 二、 核心考情与免考通道深度提炼（2026新规重点）

根据官方最新发布的学历互认细则，针对不同专业的通道逻辑如下：

**1. 财会与审计核心专业本科生：最大红利受益者**
如果你就读的是会计学、财务管理或审计学，只要在校期间完成了基础会计、中级财务会计、税法及财务管理核心课程，通过学校考核即可**直接在线认证申请免考 ACCA 前 5 门（F1-F5）甚至多达 9 门！**

**2. 金融与经济学类专业：提速达半程**
经过课程大纲对齐，商科与金融相关专业也享有 F1-F3 基础核心商业课程的无条件或学分兑换免考政策。

**3. 跨专业（文科/理工科/计算机等）：如何反超？**
不必担心没学过借贷记账法！通过高顿先导训练营打通商业语言认知，甚至在备考 CPA 期间实现双证协同通过，是真正实现专业跨越与入职名企的关键桥梁。

---

### 三、 别让信息差耽误你的黄金转折期

看完以上政策，你肯定最关心一个问题：
👉 **“我当前所在的高校层级和具体专业，到底能准确免考哪几门科目？能不能大四或今年直接报考 CPA 全国统考？”**

为了不让大家花几天时间去官方英文网站翻看晦涩难懂的英文条例，高顿教研团队研发了智能免考与资格自测系统。`;

    if (ctaChoice === 'acca_tool') {
        article += `\n\n[[CTA_WIDGET_ACCA]]`;
    } else if (ctaChoice === 'cpa_tool') {
        article += `\n\n[[CTA_WIDGET_CPA]]`;
    } else if (ctaChoice === 'whitepaper') {
        article += `\n\n[[CTA_WIDGET_WHITEPAPER]]`;
    } else {
        article += `\n\n[[CTA_WIDGET_COMMUNITY]]`;
    }

    return article;
}

// ================= Interactive WeChat Article Simulator =================
function updateWeChatPreview() {
    const rawText = document.getElementById('wechat-editor').value;
    const previewBody = document.getElementById('wechat-preview-body');
    if (!previewBody) return;

    let html = rawText;

    // Convert Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:18px; font-weight:800; margin:20px 0 10px;">$1</h2>');
    
    // Convert Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#0f172a; font-weight:700; background:rgba(245,158,11,0.15); padding:0 4px; border-radius:3px;">$1</strong>');

    // Convert Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Convert Horizontal rules
    html = html.replace(/^---$/gim, '<hr style="border:none; border-top:1px dashed #ccc; margin:24px 0;">');

    // Convert Markdown Tables to clean WeChat HTML table
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim() !== '');
        if (cells[0].includes('---')) return '';
        const isHeader = cells[0].includes('求职面试') || cells[0].includes('面试考察');
        const cellTag = isHeader ? 'th' : 'td';
        const cellStyle = isHeader 
            ? 'background:#f1f5f9; font-weight:700; color:#0f172a; padding:8px 6px; border:1px solid #cbd5e1; font-size:12.5px; text-align:center;' 
            : 'padding:8px 6px; border:1px solid #e2e8f0; font-size:12px; text-align:center; color:#334155;';
        
        let rowHtml = '<tr style="border-bottom:1px solid #e2e8f0;">';
        cells.forEach(c => rowHtml += `<${cellTag} style="${cellStyle}">${c.trim()}</${cellTag}>`);
        rowHtml += '</tr>';
        return rowHtml;
    });

    // Wrap tables inside table container if tr exists
    if (html.includes('<tr')) {
        html = html.replace(/(<tr.*?<\/tr>)+/gs, '<div style="overflow-x:auto; margin:18px 0;"><table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">$&</table></div>');
    }

    // Convert Line breaks into Paragraphs
    html = html.split('\n\n').map(para => {
        if (para.trim().startsWith('<h') || para.trim().startsWith('<block') || para.trim().startsWith('<hr') || para.trim().startsWith('<div') || para.trim().startsWith('[[CTA')) {
            return para;
        }
        return `<p style="margin-bottom:16px; color:#333; line-height:1.75;">${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    // Inject CTA Widgets with clean toast actions for simulation
    html = html.replace(/\[\[CTA_WIDGET_ACCA\]\]/g, `
        <div class="wechat-cta-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; margin:24px 0; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <div class="wechat-cta-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-square-check" style="color:#07c160; font-size:15px;"></i>
                    <span style="font-size:13px; font-weight:700; color:#0f172a;">高顿 ACCA 小程序评估工具</span>
                </div>
                <span style="background:rgba(7,193,96,0.12); color:#07c160; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">官方认证卡</span>
            </div>
            <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:6px;">⚡ 免考9门科目在线实时测算资格</div>
            <p style="font-size:12px; color:#64748b; line-height:1.5; margin-bottom:14px;">选择你的毕业院校和就读专业，系统3秒自动测算你最高可直接免考 F1-F9 几门科目，省去近万元官方报考费！</p>
            <a onclick="showToast('📱 [真机生态] 读者点击卡片后，微信底层自动拉起高顿【免考资格一键自测工具】官方小程序')" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#07c160; color:#fff; font-size:13px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; text-decoration:none; box-shadow:0 4px 12px rgba(7,193,96,0.25);">
                👉 点击立即自测免考科目 <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>
    `);

    html = html.replace(/\[\[CTA_WIDGET_CPA\]\]/g, `
        <div class="wechat-cta-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; margin:24px 0; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <div class="wechat-cta-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-square-check" style="color:#2563eb; font-size:15px;"></i>
                    <span style="font-size:13px; font-weight:700; color:#0f172a;">全国 CPA 报考验资系统</span>
                </div>
                <span style="background:rgba(37,99,235,0.12); color:#2563eb; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">报名组合诊断</span>
            </div>
            <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:6px;">🎯 2026 注册会计师资格自测通道</div>
            <p style="font-size:12px; color:#64748b; line-height:1.5; margin-bottom:14px;">应届大四/跨专业/在职人能否直接报考今年 CPA？快速匹配黄金报考科目组合及四大/上市券商薪资阶梯。</p>
            <a onclick="showToast('📱 [真机生态] 读者点击卡片后，系统自动调起高顿【CPA报考验资与职业规划指南】')" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#2563eb; color:#fff; font-size:13px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; text-decoration:none; box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                👉 极速3秒验资与建议查询 <i class="fa-solid fa-check"></i>
            </a>
        </div>
    `);

    html = html.replace(/\[\[CTA_WIDGET_WHITEPAPER\]\]/g, `
        <div class="wechat-cta-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; margin:24px 0; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <div class="wechat-cta-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-file-pdf" style="color:#d97706; font-size:15px;"></i>
                    <span style="font-size:13px; font-weight:700; color:#0f172a;">高顿研究院重磅资料</span>
                </div>
                <span style="background:rgba(245,158,11,0.15); color:#d97706; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">超清完整版PDF</span>
            </div>
            <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:6px;">🎁 《2026 名企招聘红利与证书地图》</div>
            <p style="font-size:12px; color:#64748b; line-height:1.5; margin-bottom:14px;">长达84页超清大报告，独家收录普华永道、德勤、中金薪酬分层及各大顶尖高校专硕考研内部真题汇编。</p>
            <a onclick="showToast('📱 [真机生态] 读者点击或扫码后，系统自动分配专属企微顾问学姐秒发84页PDF与考纲资料')" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#d97706; color:#fff; font-size:13px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; text-decoration:none; box-shadow:0 4px 12px rgba(217,119,6,0.25);">
                📥 长按扫码一键限时免费领取 <i class="fa-solid fa-download"></i>
            </a>
        </div>
    `);

    html = html.replace(/\[\[CTA_WIDGET_COMMUNITY\]\]/g, `
        <div class="wechat-cta-card" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; margin:24px 0; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <div class="wechat-cta-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-user-group" style="color:#7c3aed; font-size:15px;"></i>
                    <span style="font-size:13px; font-weight:700; color:#0f172a;">全国财会备考社群</span>
                </div>
                <span style="background:rgba(139,92,246,0.15); color:#7c3aed; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">名师在线答疑</span>
            </div>
            <div style="font-size:13.5px; font-weight:700; color:#0f172a; margin-bottom:6px;">💬 加入 2026 核心押题与真题交流群</div>
            <p style="font-size:12px; color:#64748b; line-height:1.5; margin-bottom:14px;">与上千名全国考研学子及四大 CPA 考友同步自习打卡，每周三限时领取名师高频密卷汇总大礼包！</p>
            <a onclick="showToast('📱 [真机生态] 读者点击后调起进群名片，长按识别二维码即可加入千人学习群')" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#7c3aed; color:#fff; font-size:13px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; text-decoration:none; box-shadow:0 4px 12px rgba(124,58,237,0.25);">
                🤝 点击长按扫码立刻进群 <i class="fa-solid fa-users"></i>
            </a>
        </div>
    `);

    previewBody.innerHTML = html;
}

// Toolbar actions
function formatText(type) {
    const textarea = document.getElementById('wechat-editor');
    if (!textarea.value) return;

    if (type === 'bold') {
        textarea.value += '\n**在这里填入要粗体高亮的核心提炼金句**';
    } else if (type === 'prefix') {
        textarea.value = `【黄金前缀·读前必看】\n在这里用300字讲清楚本文的核心利益点，让读者感觉如果不看就会亏损或者错过极其重要的行业红利！\n\n` + textarea.value;
    } else if (type === 'table') {
        textarea.value += `\n\n| 对比项目 | 普通起点背景 | 高顿过科/高价值证书加持 | 显著分差 |\n| :--- | :--- | :--- | :--- |\n| 岗位竞争难度 | 极度内卷 | **拥有核心优先权** | **面试率提3倍** |\n| 薪资增长空间 | 每年常规普调 | **3年实现翻倍跃迁** | **高出35%以上** |\n`;
    }
    updateWeChatPreview();
    showToast('✔ 已添加排版模块至推文编辑器');
}

function insertQuote() {
    const textarea = document.getElementById('wechat-editor');
    textarea.value += `\n\n> **💡 留步金句 / 截图提炼框：**\n> 别再用低水平的勤奋掩盖你在战略方向和核心证书选择上的懒惰。真正的财经精英，早就在大学前三年拿下了通往高薪的钥匙。\n`;
    updateWeChatPreview();
    showToast('✔ 已插入微信朋友圈转发金句框');
}

function injectSelectedCTA() {
    const choice = document.getElementById('cta-type-select').value;
    const textarea = document.getElementById('wechat-editor');
    
    if (choice === 'acca_tool') textarea.value += `\n\n[[CTA_WIDGET_ACCA]]`;
    if (choice === 'cpa_tool') textarea.value += `\n\n[[CTA_WIDGET_CPA]]`;
    if (choice === 'whitepaper') textarea.value += `\n\n[[CTA_WIDGET_WHITEPAPER]]`;
    if (choice === 'community') textarea.value += `\n\n[[CTA_WIDGET_COMMUNITY]]`;
    
    updateWeChatPreview();
    showToast('✔ 已在推文尾部插入选定的转化漏斗卡片');
}

function copyArticle() {
    const textarea = document.getElementById('wechat-editor');
    if (!textarea || !textarea.value.trim()) {
        showToast('⚠️ 推文内容为空，请先生成或输入内容！');
        return;
    }
    navigator.clipboard.writeText(textarea.value);
    showToast('✔ 完整微信推文文本及卡片代码已成功复制到剪贴板！');
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Initialize default sample on start
window.onload = () => {
    loadPreset('acca');
};

// ================= AI Title Scoring Analysis =================
function showTitleAnalysis(title, score, type) {
    document.getElementById('analysis-modal-title').innerText = title;
    document.getElementById('analysis-modal-score').innerText = score;

    let barsHtml = '';
    const numScore = parseFloat(score.replace('分', ''));
    
    // Simulate some logic based on title type
    const metrics = [
        { name: '痛点共鸣度 (Pain Resonance)', base: 85 },
        { name: '信息差制造 (Curiosity Gap)', base: 82 },
        { name: '转化预期钩子 (CTA Intent)', base: 78 },
        { name: '情绪唤醒度 (Arousal)', base: 80 }
    ];

    if (type === 'anxiety') { metrics[0].base += 12; metrics[3].base += 15; }
    if (type === 'authority') { metrics[1].base += 15; metrics[2].base += 10; }
    if (type === 'utility') { metrics[0].base += 8; metrics[2].base += 15; }
    if (type === 'trend') { metrics[1].base += 14; metrics[3].base += 10; }
    if (type === 'test') { metrics[0].base += 10; metrics[2].base += 18; }

    metrics.forEach(m => {
        // add a little randomness so it looks calculated
        const finalScore = Math.min(99, m.base + Math.random() * 5).toFixed(1);
        let color = '#3b82f6';
        if (finalScore >= 95) color = '#10b981';
        else if (finalScore >= 90) color = '#8b5cf6';
        else if (finalScore < 85) color = '#f59e0b';

        barsHtml += `
            <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                    <span style="color:#94a3b8;">${m.name}</span>
                    <span style="color:${color}; font-weight:700;">${finalScore} / 100</span>
                </div>
                <div style="height:6px; background:#334155; border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:0%; background:${color}; border-radius:3px; transition:width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        `;
    });

    const barsContainer = document.getElementById('analysis-modal-bars');
    barsContainer.innerHTML = barsHtml;
    document.getElementById('score-analysis-modal').style.display = 'flex';

    // Animate bars
    setTimeout(() => {
        const fills = barsContainer.querySelectorAll('div > div > div');
        const scores = Array.from(barsContainer.querySelectorAll('span:last-child')).map(s => parseFloat(s.innerText));
        fills.forEach((fill, idx) => {
            fill.style.width = scores[idx] + '%';
        });
    }, 50);
}
