import re

html_path = r"C:\Users\90823\Desktop\所有文件\AI项目\作品展示页 2\index.html"
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Define the template for a phone frame
def phone_frame(img_num):
    return f'''                    <div style="width: 255px; height: 536px; flex-shrink: 0;">
                        <div class="iphone-frame" style="height: 715px; transform: scale(0.75); transform-origin: top left;">
                            <div class="iphone-screen" style="background: #fff;">
                                <div class="ios-status-bar" style="background: #fff;">
                                    <span class="ios-time">9:41</span>
                                    <div class="dynamic-island"><div class="island-camera"></div></div>
                                    <div class="ios-icons">
                                        <i class="fa-solid fa-signal" style="font-size: 11px;"></i>
                                        <i class="fa-solid fa-wifi" style="font-size: 12px; margin: 0 4px;"></i>
                                        <i class="fa-solid fa-battery-full" style="font-size: 14px;"></i>
                                    </div>
                                </div>
                                <div style="width: 100%; height: calc(100% - 48px); overflow: hidden; position: relative;">
                                    <img src="assets/memory-map-demo-{img_num}.jpg" style="width: 100%; position: absolute; top: -48px; left: 0;" alt="展示图{img_num}">
                                </div>
                            </div>
                        </div>
                    </div>'''

new_gallery_html = f'''                <!-- Static Showcase Gallery - Bento Grid -->
                <div class="bento-showcase-container">
                    
                    <!-- Bento Box 1: Global Exploration -->
                    <div class="bento-feature-card">
                        <div class="bento-content">
                            <div class="bento-tag">01 / GLOBAL EXPLORATION</div>
                            <h3 class="bento-title">全局探索</h3>
                            <p class="bento-desc">打破传统列表式回忆，在真实的地理坐标系中鸟瞰你的足迹。地图缩放之间，每一个地标、每一次旅行，都是一段独特的故事。沉浸式的大图视野，让回忆变得立体而鲜活。</p>
                        </div>
                        <div class="bento-images">
{phone_frame(5)}
{phone_frame(1)}
                        </div>
                    </div>

                    <!-- Bento Box 2: Sticker Generation -->
                    <div class="bento-feature-card">
                        <div class="bento-content">
                            <div class="bento-tag">02 / SMART STICKERS</div>
                            <h3 class="bento-title">智能打卡互动</h3>
                            <p class="bento-desc">自动将你的照片生成精美的手绘感头像与贴纸。无论是风景打卡还是人物合影，只需一键即可转化为地图上独一无二的专属标记，让足迹变得萌趣横生。</p>
                        </div>
                        <div class="bento-images">
{phone_frame(2)}
{phone_frame(4)}
                        </div>
                    </div>

                    <!-- Bento Box 3: Time Memories -->
                    <div class="bento-feature-card">
                        <div class="bento-content">
                            <div class="bento-tag">03 / TIME JOURNEY</div>
                            <h3 class="bento-title">时光回忆轴</h3>
                            <p class="bento-desc">通过日历面板与时光瀑布流，轻松回顾你在这世间留下的所有印记。按人物筛选、按时间追溯，每一张照片、每一个足迹，都安静地安放在岁月的长河中。</p>
                        </div>
                        <div class="bento-images">
{phone_frame(6)}
{phone_frame(3)}
                        </div>
                    </div>

                </div>'''

# Replace everything from "<!-- Static Showcase Gallery -->" down to the closing tag of demo-gallery-wrapper
# We will use regex to find the block
pattern = re.compile(r'<!-- Static Showcase Gallery -->\s*<div class="demo-gallery-wrapper".*?<!-- Image 6 -->.*?</div>\s*</div>\s*</div>\s*</div>', re.DOTALL)
html_content_new = pattern.sub(new_gallery_html, html_content)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content_new)

# Now update styles.css
css_path = r"C:\Users\90823\Desktop\所有文件\AI项目\作品展示页 2\styles.css"
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

if "bento-showcase-container" not in css_content:
    bento_css = '''

/* ================= BENTO SHOWCASE GRID ================= */
.bento-showcase-container {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    margin-top: 4rem;
    padding-bottom: 4rem;
    width: 100%;
}

.bento-feature-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 32px;
    padding: 4rem 3rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    gap: 4rem;
    overflow: hidden;
    position: relative;
    transition: transform 0.4s var(--ease-smooth), border-color 0.4s ease;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.bento-feature-card:hover {
    border-color: rgba(0, 240, 255, 0.25);
    transform: translateY(-4px);
}

.bento-feature-card:nth-child(even) {
    flex-direction: row-reverse;
}

.bento-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 2;
}

.bento-tag {
    font-family: var(--font-mono);
    color: var(--accent-cyan);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    margin-bottom: 1.25rem;
    text-transform: uppercase;
}

.bento-title {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
    line-height: 1.2;
}

.bento-desc {
    color: var(--text-secondary);
    font-size: 1.1rem;
    line-height: 1.7;
    max-width: 480px;
}

.bento-images {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    flex: 1.2;
    position: relative;
}

/* Offset the second image slightly for dynamic feel */
.bento-images > div:nth-child(2) {
    transform: translateY(3rem);
}

@media (max-width: 1024px) {
    .bento-feature-card, .bento-feature-card:nth-child(even) {
        flex-direction: column;
        padding: 3rem 2rem;
        gap: 3rem;
    }
    
    .bento-content {
        text-align: center;
        align-items: center;
    }
    
    .bento-desc {
        text-align: center;
    }
    
    .bento-images > div:nth-child(2) {
        transform: translateY(2rem); /* Keep slight offset on mobile */
    }
}
'''
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write(bento_css)

print("HTML and CSS updated successfully!")
