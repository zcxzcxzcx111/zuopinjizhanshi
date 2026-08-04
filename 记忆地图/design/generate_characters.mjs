// Generate 9 character TSX files matching reference image
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const CHAR_DIR = 'C:/Users/90823/MemoryMap/src/components/characters';
const DESIGN_DIR = 'C:/Users/90823/MemoryMap/design';

// Helper: build TSX file content
function buildTSX(funcName, comment, svgBody) {
  return `// ${comment}
export function ${funcName}() {
  return \`
${svgBody}
  \`;
}
`;
}

// ============================================================
// SHARED DEFS (same for all characters that define their own)
// ============================================================
const DEFS = `    <defs>
      <linearGradient id="s0" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFE8CC"/>
        <stop offset="100%" stop-color="#FFD4A8"/>
      </linearGradient>
      <radialGradient id="ss0" cx="0.4" cy="0.3" r="0.6">
        <stop offset="0%" stop-color="#FFF0DE"/>
        <stop offset="100%" stop-color="#FFD4A8"/>
      </radialGradient>
      <radialGradient id="bl0" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FF9BBC" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#FF9BBC" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="h0" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3A3A3A"/>
        <stop offset="50%" stop-color="#222"/>
        <stop offset="100%" stop-color="#111"/>
      </linearGradient>`;

// Face SVG (same for all characters)
const FACE = `      <!-- HEAD -->
      <circle cx="60" cy="46" r="26" fill="url(#ss0)" stroke="#E8C4A0" stroke-width="0.3"/>
      <ellipse cx="60" cy="64" rx="14" ry="6" fill="#F0CDA0" opacity="0.3"/>
      <!-- EYES -->
      <ellipse cx="49" cy="46" rx="7" ry="8" fill="white"/>
      <ellipse cx="50" cy="46" rx="5.5" ry="6.5" fill="#2C2C2C"/>
      <ellipse cx="50.5" cy="45.5" rx="3" ry="3.5" fill="#0A0A0A"/>
      <circle cx="53" cy="43" r="2.2" fill="white" opacity="0.95"/>
      <circle cx="48" cy="48" r="1" fill="white" opacity="0.6"/>
      <ellipse cx="49" cy="46" rx="7" ry="8" fill="none" stroke="#1A0A00" stroke-width="1" opacity="0.8"/>
      <ellipse cx="71" cy="46" rx="7" ry="8" fill="white"/>
      <ellipse cx="70" cy="46" rx="5.5" ry="6.5" fill="#2C2C2C"/>
      <ellipse cx="69.5" cy="45.5" rx="3" ry="3.5" fill="#0A0A0A"/>
      <circle cx="73" cy="43" r="2.2" fill="white" opacity="0.95"/>
      <circle cx="67" cy="48" r="1" fill="white" opacity="0.6"/>
      <ellipse cx="71" cy="46" rx="7" ry="8" fill="none" stroke="#1A0A00" stroke-width="1" opacity="0.8"/>
      <!-- Eyebrows -->
      <path d="M42 38 Q48 35 55 37" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M65 37 Q72 35 78 38" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Blush -->
      <ellipse cx="40" cy="54" rx="7" ry="4" fill="url(#bl0)"/>
      <ellipse cx="80" cy="54" rx="7" ry="4" fill="url(#bl0)"/>
      <!-- Nose -->
      <ellipse cx="60" cy="52" rx="1.5" ry="1" fill="#E8B88A" opacity="0.6"/>
      <!-- Mouth -->
      <path d="M53 58 Q57 63 60 63 Q63 63 67 58" fill="#FF8888" stroke="#CC6666" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M56 60 Q60 64 64 60" fill="#FF6B6B" opacity="0.4"/>`;

// Hair SVG (same base for all characters)
const HAIR = `      <!-- HAIR back -->
      <path d="M34 42 Q34 16 60 12 Q86 16 86 42" fill="url(#h0)"/>
      <path d="M34 42 Q30 50 30 58 Q29 62 33 60 Q35 52 36 44" fill="url(#h0)"/>
      <path d="M86 42 Q90 50 90 58 Q91 62 87 60 Q85 52 84 44" fill="url(#h0)"/>
      <path d="M36 38 Q34 20 60 14 Q86 20 84 38" fill="#2A2A2A"/>
      <path d="M48 20 Q56 16 64 20" fill="#444" opacity="0.25"/>
      <path d="M52 18 Q58 14 62 18" fill="#555" opacity="0.15"/>
      <!-- Bangs -->
      <path d="M38 36 Q42 28 48 34 Q52 26 56 34 Q60 26 64 34 Q68 28 74 34 Q78 30 82 36 L82 42 Q76 36 72 40 Q66 32 62 38 Q58 32 54 38 Q50 32 46 40 Q42 36 38 42 Z" fill="url(#h0)"/>
      <path d="M46 34 Q50 30 54 34" fill="#444" opacity="0.15"/>
      <path d="M58 32 Q62 28 66 32" fill="#444" opacity="0.1"/>`;

const NECK = `      <!-- Neck -->
      <rect x="55" y="68" width="10" height="14" rx="5" fill="url(#s0)"/>`;

// ============================================================
// SCENE 1: Selfie → 王子 (Prince) - pink outfit, crown, wand with heart
// ============================================================
const SCENE_1 = DEFS + `
      <linearGradient id="selfie-dress" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF88AA"/>
        <stop offset="100%" stop-color="#E85580"/>
      </linearGradient>
      <linearGradient id="selfie-dress2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#FFB0C8"/>
        <stop offset="100%" stop-color="#FF88AA"/>
      </linearGradient>
      <linearGradient id="selfie-crown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="#DAA520"/>
      </linearGradient>
      <linearGradient id="selfie-wand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFB0C8"/>
        <stop offset="100%" stop-color="#FF69B4"/>
      </linearGradient>
      <radialGradient id="selfie-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FFD0E0"/>
        <stop offset="100%" stop-color="#FFB0C8"/>
      </radialGradient>
      <radialGradient id="selfie-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#FFD0E0" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#selfie-bg)" rx="8"/>
    <circle cx="60" cy="60" r="50" fill="url(#selfie-glow)"/>
    <!-- Floating hearts -->
    <path d="M15 20 Q15 16 18 16 Q21 16 21 20 Q21 24 18 26 Q15 24 15 20 Z" fill="#FF6B8A" opacity="0.5"/>
    <path d="M95 30 Q95 27 97 27 Q99 27 99 30 Q99 33 97 34 Q95 33 95 30 Z" fill="#FF6B8A" opacity="0.4"/>
    <path d="M100 80 Q100 77 102 77 Q104 77 104 80 Q104 83 102 84 Q100 83 100 80 Z" fill="#FF6B8A" opacity="0.35"/>
    <path d="M20 90 Q20 88 22 88 Q24 88 24 90 Q24 92 22 93 Q20 92 20 90 Z" fill="#FF6B8A" opacity="0.3"/>
    <!-- Sparkles -->
    <circle cx="30" cy="35" r="1.5" fill="#FFD700" opacity="0.5"/>
    <circle cx="90" cy="55" r="1.2" fill="#FFD700" opacity="0.4"/>
    <circle cx="50" cy="15" r="1" fill="#FFD700" opacity="0.6"/>
    <polygon points="25,55 26,58 29,58 27,60 28,63 25,61 22,63 23,60 21,58 24,58" fill="#FFD700" opacity="0.4"/>
    <polygon points="100,45 101,47 103,47 102,48 102,50 100,49 98,50 98,48 97,47 99,47" fill="#FFD700" opacity="0.35"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L55 120 Q57 120 57 116 Z" fill="#E85580"/>
    <path d="M63 116 Q62 120 66 120 L73 120 Q75 120 75 116 Z" fill="#E85580"/>

    <!-- BODY - pink prince outfit -->
    <path d="M40 80 Q38 78 36 82 L34 106 L86 106 L84 82 Q82 78 80 80 Z" fill="url(#selfie-dress)"/>
    <path d="M42 82 Q50 80 58 82 L56 106 L38 106 Z" fill="url(#selfie-dress2)" opacity="0.3"/>
    <path d="M46 78 Q52 74 60 78 Q68 74 74 78" fill="none" stroke="#FFB0C8" stroke-width="2" stroke-linecap="round"/>
    <path d="M48 80 Q54 76 60 80 Q66 76 72 80" fill="none" stroke="#FFC8D8" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    <path d="M42 96 Q60 100 78 96" fill="none" stroke="#FF69B4" stroke-width="2" stroke-linecap="round"/>
    <path d="M56 96 Q58 92 60 96 Q62 92 64 96" fill="#FF69B4" opacity="0.6"/>

    ${NECK}

    <!-- LEFT ARM (on hip) -->
    <path d="M38 82 Q28 88 26 98" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="26" cy="100" r="5" fill="url(#s0)"/>
    <!-- RIGHT ARM (holding wand) -->
    <path d="M80 82 Q90 74 96 62" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="97" cy="60" r="5" fill="url(#s0)"/>
    <!-- Magic wand -->
    <line x1="97" y1="58" x2="104" y2="36" stroke="url(#selfie-wand)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M104 32 Q104 28 107 28 Q110 28 110 32 Q110 36 107 38 Q104 36 104 32 Z" fill="#FF6B8A"/>
    <path d="M105 31 Q105 29 107 29 Q109 29 109 31" fill="#FFB0C8" opacity="0.5"/>
    <circle cx="112" cy="28" r="2" fill="#FFD700" opacity="0.6"/>
    <circle cx="108" cy="24" r="1.2" fill="#FFD700" opacity="0.4"/>

    ${HAIR}

    <!-- CROWN -->
    <path d="M42 22 L44 14 L50 18 L54 10 L60 16 L66 10 L70 18 L76 14 L78 22 Z" fill="url(#selfie-crown)" stroke="#DAA520" stroke-width="0.5"/>
    <circle cx="54" cy="16" r="2" fill="#FF6B8A"/>
    <circle cx="60" cy="14" r="2.5" fill="#FF6B8A"/>
    <circle cx="66" cy="16" r="2" fill="#FF6B8A"/>
    <rect x="42" y="20" width="36" height="4" rx="1" fill="url(#selfie-crown)" stroke="#DAA520" stroke-width="0.3"/>
    <!-- Choker -->
    <path d="M44 62 Q60 66 76 62" fill="none" stroke="#FF69B4" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="60" cy="65" r="2" fill="#FFD700"/>

    ${FACE}`;

// ============================================================
// SCENE 2: Rowing → 猫耳少年 (Cat boy)
// ============================================================
const SCENE_2 = DEFS + `
      <linearGradient id="rowing-outfit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3A3A4A"/>
        <stop offset="100%" stop-color="#2A2A3A"/>
      </linearGradient>
      <linearGradient id="rowing-boot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4A4A5A"/>
        <stop offset="100%" stop-color="#2A2A3A"/>
      </linearGradient>
      <radialGradient id="rowing-bg" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="#3A3A5A"/>
        <stop offset="100%" stop-color="#1A1A2E"/>
      </radialGradient>
      <radialGradient id="rowing-moon" cx="0.4" cy="0.4" r="0.5">
        <stop offset="0%" stop-color="#FFFFCC"/>
        <stop offset="100%" stop-color="#FFE888"/>
      </radialGradient>
    </defs>

    <!-- Background - dark night -->
    <rect x="0" y="0" width="120" height="120" fill="url(#rowing-bg)" rx="8"/>
    <circle cx="90" cy="20" r="12" fill="url(#rowing-moon)" opacity="0.8"/>
    <circle cx="94" cy="18" r="10" fill="url(#rowing-bg)"/>
    <circle cx="20" cy="12" r="1" fill="white" opacity="0.6"/>
    <circle cx="40" cy="8" r="0.8" fill="white" opacity="0.4"/>
    <circle cx="60" cy="15" r="0.6" fill="white" opacity="0.5"/>
    <circle cx="108" cy="30" r="0.7" fill="white" opacity="0.3"/>
    <!-- Bats -->
    <path d="M20 25 Q16 20 20 22 Q24 20 20 25" fill="#2A2A3A" opacity="0.6"/>
    <path d="M100 40 Q96 35 100 37 Q104 35 100 40" fill="#2A2A3A" opacity="0.5"/>
    <path d="M35 15 Q32 11 35 13 Q38 11 35 15" fill="#2A2A3A" opacity="0.4"/>
    <circle cx="50" cy="30" r="1" fill="#9B59B6" opacity="0.4"/>
    <circle cx="75" cy="10" r="0.8" fill="#9B59B6" opacity="0.3"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L55 120 Q58 120 58 116 L55 116 Z" fill="url(#rowing-boot)"/>
    <path d="M63 116 Q62 120 66 120 L73 120 Q76 120 76 116 L73 116 Z" fill="url(#rowing-boot)"/>

    <!-- BODY - dark bodysuit -->
    <path d="M40 80 Q38 78 36 82 L34 106 L86 106 L84 82 Q82 78 80 80 Z" fill="url(#rowing-outfit)"/>
    <line x1="60" y1="80" x2="60" y2="106" stroke="#4A4A5A" stroke-width="0.8"/>
    <rect x="38" y="96" width="44" height="3" rx="1" fill="#5A5A6A"/>
    <rect x="58" y="95" width="6" height="5" rx="1" fill="#888"/>

    ${NECK}
    <!-- Choker -->
    <path d="M46 64 Q60 68 74 64" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"/>
    <circle cx="60" cy="67" r="1.5" fill="#AAA"/>

    <!-- ARMS -->
    <path d="M38 82 Q28 88 24 100" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="23" cy="102" r="5" fill="url(#s0)"/>
    <path d="M80 82 Q90 76 96 68" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="97" cy="66" r="5" fill="url(#s0)"/>

    ${HAIR}

    <!-- CAT EARS -->
    <path d="M40 20 L44 6 L52 18" fill="url(#h0)" stroke="#222" stroke-width="0.5"/>
    <path d="M42 18 L44 9 L50 18" fill="#FFB0C0" opacity="0.5"/>
    <path d="M68 18 L76 6 L80 20" fill="url(#h0)" stroke="#222" stroke-width="0.5"/>
    <path d="M70 18 L76 9 L78 18" fill="#FFB0C0" opacity="0.5"/>

    ${FACE}`;

// ============================================================
// SCENE 3: Dining → 冬日少年 (Winter boy) - winter coat, gift box, snowflakes
// ============================================================
const SCENE_3 = DEFS + `
      <linearGradient id="dining-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E8F0FF"/>
        <stop offset="100%" stop-color="#C8D8F0"/>
      </linearGradient>
      <linearGradient id="dining-fur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#E8E8E8"/>
      </linearGradient>
      <linearGradient id="dining-hat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E0E8F8"/>
        <stop offset="100%" stop-color="#B8C8E0"/>
      </linearGradient>
      <linearGradient id="dining-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7EB8E0"/>
        <stop offset="100%" stop-color="#5A98C0"/>
      </linearGradient>
      <radialGradient id="dining-bg" cx="0.5" cy="0.3" r="0.6">
        <stop offset="0%" stop-color="#E8F0FF"/>
        <stop offset="100%" stop-color="#C0D8F0"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#dining-bg)" rx="8"/>
    <text x="15" y="20" font-size="8" fill="#A8C8E8" opacity="0.6">&#10052;</text>
    <text x="95" y="15" font-size="6" fill="#A8C8E8" opacity="0.5">&#10052;</text>
    <text x="105" y="50" font-size="7" fill="#A8C8E8" opacity="0.4">&#10052;</text>
    <text x="10" y="70" font-size="5" fill="#A8C8E8" opacity="0.5">&#10052;</text>
    <circle cx="30" cy="30" r="1" fill="#FFD700" opacity="0.4"/>
    <circle cx="80" cy="20" r="0.8" fill="#FFD700" opacity="0.3"/>
    <circle cx="100" cy="65" r="1.2" fill="#FFD700" opacity="0.35"/>
    <ellipse cx="60" cy="122" rx="65" ry="8" fill="white" opacity="0.4"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M44 116 Q43 120 47 120 L56 120 Q59 120 58 116 L56 116 Z" fill="#B0C0D8"/>
    <path d="M44 116 L44 118" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <path d="M62 116 Q61 120 65 120 L74 120 Q77 120 76 116 L74 116 Z" fill="#B0C0D8"/>
    <path d="M62 116 L62 118" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.5"/>

    <!-- BODY - winter coat -->
    <path d="M38 80 Q36 78 34 82 L32 108 L88 108 L86 82 Q84 78 82 80 Z" fill="url(#dining-coat)"/>
    <line x1="60" y1="80" x2="60" y2="108" stroke="#B0C0D8" stroke-width="1"/>
    <path d="M32 106 Q60 110 88 106 Q88 110 60 114 Q32 110 32 106 Z" fill="url(#dining-fur)" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="58" cy="88" r="1.5" fill="#A8B8D0"/>
    <circle cx="58" cy="96" r="1.5" fill="#A8B8D0"/>
    <circle cx="58" cy="104" r="1.5" fill="#A8B8D0"/>
    <rect x="40" y="94" width="12" height="8" rx="2" fill="none" stroke="#B0C0D8" stroke-width="0.6"/>
    <rect x="68" y="94" width="12" height="8" rx="2" fill="none" stroke="#B0C0D8" stroke-width="0.6"/>

    ${NECK}

    <!-- Scarf -->
    <path d="M44 66 Q60 72 76 66" fill="none" stroke="#87CEEB" stroke-width="4" stroke-linecap="round"/>
    <path d="M44 66 Q60 70 76 66" fill="none" stroke="#A0D8F0" stroke-width="2" opacity="0.5"/>
    <path d="M72 68 Q78 76 76 86" fill="none" stroke="#87CEEB" stroke-width="3.5" stroke-linecap="round"/>

    <!-- ARMS -->
    <path d="M38 82 Q26 86 20 92" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="19" cy="93" r="5" fill="url(#s0)"/>
    <path d="M80 82 Q92 86 98 92" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="93" r="5" fill="url(#s0)"/>

    <!-- Gift box -->
    <rect x="38" y="90" width="20" height="16" rx="2" fill="url(#dining-box)" stroke="#4A88B0" stroke-width="0.5"/>
    <rect x="46" y="90" width="3" height="16" fill="#FF6B8A" opacity="0.7"/>
    <rect x="38" y="96" width="20" height="3" fill="#FF6B8A" opacity="0.7"/>
    <path d="M44 90 Q42 86 44 88 Q46 86 48 90" fill="#FF6B8A"/>
    <path d="M52 90 Q50 86 52 88 Q54 86 56 90" fill="#FF6B8A"/>
    <circle cx="48" cy="90" r="1.5" fill="#FF8899"/>
    <rect x="40" y="92" width="6" height="3" rx="1" fill="white" opacity="0.15"/>

    ${HAIR}

    <!-- Winter hat -->
    <path d="M36 32 Q36 14 60 10 Q84 14 84 32" fill="url(#dining-hat)" stroke="#B0C0D8" stroke-width="0.4"/>
    <path d="M34 32 Q60 36 86 32 Q86 38 60 40 Q34 38 34 32 Z" fill="url(#dining-fur)" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="60" cy="8" r="5" fill="url(#dining-fur)" stroke="#DDD" stroke-width="0.3"/>
    <ellipse cx="55" cy="18" rx="8" ry="4" fill="white" opacity="0.1"/>

    ${FACE}`;

// ============================================================
// SCENE 4: Hiking → 男仆 (Butler boy) - black outfit, white apron, broom
// ============================================================
const SCENE_4 = DEFS + `
      <linearGradient id="hiking-dress" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3A3A3A"/>
        <stop offset="100%" stop-color="#222"/>
      </linearGradient>
      <linearGradient id="hiking-apron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F0F0F0"/>
      </linearGradient>
      <radialGradient id="hiking-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#F8F0FF"/>
        <stop offset="100%" stop-color="#E8D8F0"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#hiking-bg)" rx="8"/>
    <circle cx="20" cy="25" r="1.2" fill="#FFD700" opacity="0.5"/>
    <circle cx="100" cy="20" r="1" fill="#FFD700" opacity="0.4"/>
    <circle cx="15" cy="80" r="0.8" fill="#FFD700" opacity="0.3"/>
    <circle cx="105" cy="75" r="1.1" fill="#FFD700" opacity="0.4"/>
    <polygon points="30,50 31,53 34,53 32,55 33,58 30,56 27,58 28,55 26,53 29,53" fill="#FFD700" opacity="0.35"/>
    <polygon points="90,40 91,42 93,42 92,43 92,45 90,44 88,45 88,43 87,42 89,42" fill="#FFD700" opacity="0.3"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L56 120 Q58 120 58 116 L55 116 Z" fill="#222"/>
    <path d="M63 116 Q62 120 66 120 L74 120 Q76 120 76 116 L73 116 Z" fill="#222"/>

    <!-- BODY - black outfit with white apron -->
    <path d="M40 80 Q38 78 36 82 L34 108 L86 108 L84 82 Q82 78 80 80 Z" fill="url(#hiking-dress)"/>
    <path d="M42 84 L40 108 L80 108 L78 84 Z" fill="url(#hiking-apron)" stroke="#DDD" stroke-width="0.4"/>
    <path d="M42 84 Q36 86 34 90" fill="none" stroke="#EEE" stroke-width="2" stroke-linecap="round"/>
    <path d="M78 84 Q84 86 86 90" fill="none" stroke="#EEE" stroke-width="2" stroke-linecap="round"/>
    <line x1="60" y1="84" x2="60" y2="108" stroke="#E8E8E8" stroke-width="0.5"/>
    <rect x="52" y="94" width="16" height="10" rx="2" fill="none" stroke="#DDD" stroke-width="0.6"/>
    <path d="M46 80 Q52 76 60 80 Q68 76 74 80" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M36 82 L34 84" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M84 82 L86 84" stroke="white" stroke-width="2.5" stroke-linecap="round"/>

    ${NECK}

    <!-- LEFT ARM -->
    <path d="M38 82 Q26 86 20 96" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="19" cy="98" r="5" fill="url(#s0)"/>
    <!-- RIGHT ARM (holding broom) -->
    <path d="M80 82 Q92 76 98 66" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="64" r="5" fill="url(#s0)"/>
    <!-- Broom -->
    <line x1="100" y1="62" x2="108" y2="118" stroke="#A08050" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M105 112 L100 120 L108 120 L112 112 Z" fill="#C8A060"/>
    <line x1="106" y1="112" x2="104" y2="120" stroke="#B89050" stroke-width="0.5"/>
    <line x1="108" y1="112" x2="107" y2="120" stroke="#B89050" stroke-width="0.5"/>
    <line x1="110" y1="112" x2="110" y2="120" stroke="#B89050" stroke-width="0.5"/>
    <rect x="104" y="110" width="8" height="3" rx="1" fill="#888"/>

    ${HAIR}

    <!-- Maid headband -->
    <path d="M34 28 Q60 22 86 28" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <path d="M36 26 Q40 22 44 26 Q48 22 52 26 Q56 22 60 26 Q64 22 68 26 Q72 22 76 26 Q80 22 84 26" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M76 24 Q80 18 84 24" fill="white" stroke="#EEE" stroke-width="0.3"/>
    <path d="M84 24 Q88 18 92 24" fill="white" stroke="#EEE" stroke-width="0.3"/>
    <circle cx="82" cy="24" r="2" fill="#EEE"/>

    ${FACE}`;

// ============================================================
// SCENE 5: Shopping → 学生少年 (Schoolboy) - white shirt, plaid, tie, books
// ============================================================
const SCENE_5 = DEFS + `
      <linearGradient id="shopping-shirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F0F0F0"/>
      </linearGradient>
      <linearGradient id="shopping-plaid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5A9A5A"/>
        <stop offset="100%" stop-color="#3A7A3A"/>
      </linearGradient>
      <radialGradient id="shopping-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FFF8E0"/>
        <stop offset="100%" stop-color="#F0E8D0"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#shopping-bg)" rx="8"/>
    <circle cx="20" cy="25" r="6" fill="#FF4444" opacity="0.5"/>
    <path d="M20 19 Q22 16 24 18" fill="none" stroke="#4A8A2A" stroke-width="1" opacity="0.5"/>
    <rect x="90" y="30" width="12" height="8" rx="1" fill="#4488CC" opacity="0.4" transform="rotate(-10 96 34)"/>
    <rect x="92" y="28" width="12" height="8" rx="1" fill="#CC4444" opacity="0.35" transform="rotate(5 98 32)"/>
    <circle cx="100" cy="15" r="1" fill="#FFD700" opacity="0.4"/>
    <circle cx="15" cy="60" r="0.8" fill="#FFD700" opacity="0.3"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L56 120 Q58 120 58 116 L55 116 Z" fill="#8B6C5C"/>
    <path d="M63 116 Q62 120 66 120 L74 120 Q76 120 76 116 L73 116 Z" fill="#8B6C5C"/>

    <!-- BODY - white shirt + green plaid -->
    <path d="M40 80 Q38 78 36 82 L34 96 L86 96 L84 82 Q82 78 80 80 Z" fill="url(#shopping-shirt)"/>
    <path d="M50 78 L56 84 L60 78 L64 84 L70 78" fill="none" stroke="#E0E0E0" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Green plaid skirt -->
    <path d="M34 96 L32 108 L88 108 L86 96 Z" fill="url(#shopping-plaid)"/>
    <line x1="44" y1="96" x2="42" y2="108" stroke="#4A8A4A" stroke-width="0.8" opacity="0.4"/>
    <line x1="54" y1="96" x2="52" y2="108" stroke="#4A8A4A" stroke-width="0.8" opacity="0.4"/>
    <line x1="64" y1="96" x2="66" y2="108" stroke="#4A8A4A" stroke-width="0.8" opacity="0.4"/>
    <line x1="74" y1="96" x2="76" y2="108" stroke="#4A8A4A" stroke-width="0.8" opacity="0.4"/>
    <line x1="34" y1="100" x2="86" y2="100" stroke="#4A8A4A" stroke-width="0.6" opacity="0.3"/>
    <line x1="33" y1="104" x2="87" y2="104" stroke="#4A8A4A" stroke-width="0.6" opacity="0.3"/>

    ${NECK}

    <!-- Red necktie -->
    <path d="M58 72 L56 82 L60 86 L64 82 L62 72 Z" fill="#CC3333"/>
    <path d="M58 74 L60 82 L62 74" fill="#DD4444" opacity="0.4"/>
    <path d="M56 72 Q60 70 64 72 Q60 74 56 72" fill="#BB2222"/>

    <!-- ARMS (holding books) -->
    <path d="M38 82 Q26 86 20 94" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="19" cy="96" r="5" fill="url(#s0)"/>
    <path d="M80 82 Q92 80 98 88" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="90" r="5" fill="url(#s0)"/>
    <!-- Stack of books -->
    <rect x="14" y="88" width="18" height="5" rx="1" fill="#4488CC" stroke="#3366AA" stroke-width="0.3"/>
    <rect x="15" y="83" width="16" height="5" rx="1" fill="#CC4444" stroke="#AA3333" stroke-width="0.3"/>
    <rect x="13" y="78" width="18" height="5" rx="1" fill="#44AA44" stroke="#338833" stroke-width="0.3"/>
    <line x1="20" y1="89" x2="20" y2="93" stroke="#3366AA" stroke-width="0.4" opacity="0.5"/>
    <line x1="21" y1="84" x2="21" y2="88" stroke="#AA3333" stroke-width="0.4" opacity="0.5"/>

    ${HAIR}
    ${FACE}`;

// ============================================================
// SCENE 6: Beach → 玫瑰少年 (Rose boy) - red outfit, roses, hearts
// ============================================================
const SCENE_6 = DEFS + `
      <linearGradient id="beach-top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF5566"/>
        <stop offset="100%" stop-color="#CC3344"/>
      </linearGradient>
      <linearGradient id="beach-bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#333"/>
        <stop offset="100%" stop-color="#222"/>
      </linearGradient>
      <radialGradient id="beach-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FFE8E8"/>
        <stop offset="100%" stop-color="#FFD0D0"/>
      </radialGradient>
      <radialGradient id="beach-rose" cx="0.4" cy="0.3" r="0.5">
        <stop offset="0%" stop-color="#FF6677"/>
        <stop offset="100%" stop-color="#CC3344"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#beach-bg)" rx="8"/>
    <!-- Roses -->
    <g transform="translate(15, 25) scale(0.6)">
      <circle cx="0" cy="0" r="5" fill="url(#beach-rose)"/>
      <circle cx="-3" cy="-2" r="3.5" fill="#DD4455" opacity="0.7"/>
      <circle cx="3" cy="-2" r="3.5" fill="#DD4455" opacity="0.7"/>
      <circle cx="0" cy="-4" r="3" fill="#EE5566" opacity="0.6"/>
      <circle cx="0" cy="0" r="2" fill="#FF8899"/>
      <path d="M0 5 Q-2 12 0 16" fill="none" stroke="#4A8A2A" stroke-width="1.5"/>
      <path d="M0 10 Q-4 8 -3 6" fill="#4A8A2A"/>
    </g>
    <g transform="translate(100, 35) scale(0.5)">
      <circle cx="0" cy="0" r="5" fill="url(#beach-rose)"/>
      <circle cx="-3" cy="-2" r="3.5" fill="#DD4455" opacity="0.7"/>
      <circle cx="3" cy="-2" r="3.5" fill="#DD4455" opacity="0.7"/>
      <circle cx="0" cy="0" r="2" fill="#FF8899"/>
      <path d="M0 5 Q2 12 0 16" fill="none" stroke="#4A8A2A" stroke-width="1.5"/>
    </g>
    <!-- Floating hearts -->
    <path d="M90 20 Q90 17 92 17 Q94 17 94 20 Q94 23 92 24 Q90 23 90 20 Z" fill="#FF6B8A" opacity="0.5"/>
    <path d="M30 50 Q30 48 32 48 Q34 48 34 50 Q34 52 32 53 Q30 52 30 50 Z" fill="#FF6B8A" opacity="0.4"/>
    <path d="M105 70 Q105 68 107 68 Q109 68 109 70 Q109 72 107 73 Q105 72 105 70 Z" fill="#FF6B8A" opacity="0.35"/>
    <ellipse cx="45" cy="20" rx="3" ry="2" fill="#FF8899" opacity="0.3" transform="rotate(30 45 20)"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L56 120 Q58 120 58 116 L55 116 Z" fill="#CC3344"/>
    <path d="M63 116 Q62 120 66 120 L74 120 Q76 120 76 116 L73 116 Z" fill="#CC3344"/>

    <!-- BODY - red top, dark bottom -->
    <path d="M38 80 Q34 78 32 84 L34 96 L86 96 L88 84 Q86 78 82 80 Z" fill="url(#beach-top)"/>
    <path d="M36 80 Q60 76 84 80" fill="none" stroke="#FF7788" stroke-width="2"/>
    <path d="M38 82 Q60 78 82 82" fill="none" stroke="#FF8899" stroke-width="1" opacity="0.4"/>
    <path d="M34 96 L32 108 L88 108 L86 96 Z" fill="url(#beach-bottom)"/>
    <line x1="60" y1="96" x2="60" y2="108" stroke="#444" stroke-width="0.5" opacity="0.3"/>

    ${NECK}

    <!-- Rose choker -->
    <path d="M46 64 Q60 68 74 64" fill="none" stroke="#CC3344" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="60" cy="66" r="2.5" fill="#FF5566"/>
    <circle cx="60" cy="66" r="1.2" fill="#FF8899"/>

    <!-- LEFT ARM (on hip) -->
    <path d="M38 82 Q28 88 26 98" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="26" cy="100" r="5" fill="url(#s0)"/>
    <!-- RIGHT ARM (offering rose) -->
    <path d="M80 82 Q92 74 98 64" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="62" r="5" fill="url(#s0)"/>
    <!-- Rose in hand -->
    <circle cx="102" cy="58" r="4" fill="url(#beach-rose)"/>
    <circle cx="100" cy="56" r="2.5" fill="#DD4455" opacity="0.7"/>
    <circle cx="104" cy="56" r="2.5" fill="#DD4455" opacity="0.7"/>
    <circle cx="102" cy="56" r="1.5" fill="#FF8899"/>
    <line x1="102" y1="62" x2="104" y2="72" stroke="#4A8A2A" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M103 66 Q100 64 101 62" fill="#4A8A2A"/>

    ${HAIR}
    ${FACE}`;

// ============================================================
// SCENE 7: Park → 天使少年 (Angel boy) - white outfit, wings, halo
// ============================================================
const SCENE_7 = DEFS + `
      <linearGradient id="park-dress" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#E8E8F0"/>
      </linearGradient>
      <linearGradient id="park-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="50%" stop-color="#E8E8FF"/>
        <stop offset="100%" stop-color="#D0D0F0"/>
      </linearGradient>
      <radialGradient id="park-bg" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="#E8E0FF"/>
        <stop offset="100%" stop-color="#D0C8F0"/>
      </radialGradient>
      <radialGradient id="park-halo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#FFFFCC" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#FFD700" stop-opacity="0.3"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#park-bg)" rx="8"/>
    <line x1="60" y1="0" x2="40" y2="40" stroke="white" stroke-width="1" opacity="0.15"/>
    <line x1="60" y1="0" x2="80" y2="40" stroke="white" stroke-width="1" opacity="0.15"/>
    <circle cx="20" cy="20" r="1.5" fill="#FFD700" opacity="0.5"/>
    <circle cx="100" cy="25" r="1.2" fill="#FFD700" opacity="0.4"/>
    <circle cx="35" cy="55" r="1" fill="#FFD700" opacity="0.35"/>
    <circle cx="95" cy="60" r="0.8" fill="#FFD700" opacity="0.3"/>
    <circle cx="15" cy="85" r="1.1" fill="#FFD700" opacity="0.4"/>
    <polygon points="30,35 31,38 34,38 32,40 33,43 30,41 27,43 28,40 26,38 29,38" fill="#FFD700" opacity="0.4"/>
    <polygon points="90,40 91,42 93,42 92,43 92,45 90,44 88,45 88,43 87,42 89,42" fill="#FFD700" opacity="0.35"/>
    <polygon points="55,15 56,17 58,17 57,18 57,20 55,19 53,20 53,18 52,17 54,17" fill="#FFD700" opacity="0.5"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L56 120 Q58 120 58 116" fill="none" stroke="#DDD" stroke-width="2" stroke-linecap="round"/>
    <line x1="49" y1="116" x2="49" y2="120" stroke="#DDD" stroke-width="1.5"/>
    <path d="M63 116 Q62 120 66 120 L74 120 Q76 120 76 116" fill="none" stroke="#DDD" stroke-width="2" stroke-linecap="round"/>
    <line x1="69" y1="116" x2="69" y2="120" stroke="#DDD" stroke-width="1.5"/>

    <!-- WINGS -->
    <path d="M38 78 Q10 60 8 80 Q6 100 28 104 Q20 96 18 84 Q16 72 38 78 Z" fill="url(#park-wing)" stroke="#D0D0E8" stroke-width="0.5"/>
    <path d="M36 80 Q16 66 14 82 Q12 96 30 100" fill="none" stroke="#E0E0F0" stroke-width="0.5" opacity="0.5"/>
    <path d="M82 78 Q110 60 112 80 Q114 100 92 104 Q100 96 102 84 Q104 72 82 78 Z" fill="url(#park-wing)" stroke="#D0D0E8" stroke-width="0.5"/>
    <path d="M84 80 Q104 66 106 82 Q108 96 90 100" fill="none" stroke="#E0E0F0" stroke-width="0.5" opacity="0.5"/>

    <!-- BODY - white flowing dress -->
    <path d="M40 80 Q38 78 36 82 L34 108 L86 108 L84 82 Q82 78 80 80 Z" fill="url(#park-dress)"/>
    <path d="M42 84 Q44 96 42 108" stroke="#E0E0E8" stroke-width="0.6" fill="none" opacity="0.5"/>
    <path d="M60 84 Q62 96 60 108" stroke="#E0E0E8" stroke-width="0.6" fill="none" opacity="0.5"/>
    <path d="M78 84 Q76 96 78 108" stroke="#E0E0E8" stroke-width="0.6" fill="none" opacity="0.5"/>
    <path d="M46 78 Q52 74 60 78 Q68 74 74 78" fill="none" stroke="#E8E0F0" stroke-width="1.5" stroke-linecap="round"/>

    ${NECK}

    <!-- ARMS -->
    <path d="M38 82 Q26 86 20 96" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="19" cy="98" r="5" fill="url(#s0)"/>
    <path d="M80 82 Q92 76 98 66" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="64" r="5" fill="url(#s0)"/>

    ${HAIR}

    <!-- HALO -->
    <ellipse cx="60" cy="10" rx="14" ry="4" fill="none" stroke="url(#park-halo)" stroke-width="2.5"/>
    <ellipse cx="60" cy="10" rx="14" ry="4" fill="url(#park-halo)" opacity="0.3"/>
    <ellipse cx="60" cy="10" rx="18" ry="6" fill="#FFD700" opacity="0.08"/>

    ${FACE}`;

// ============================================================
// SCENE 8: City → 圣诞少年 (Christmas boy) - Santa hat, red suit
// ============================================================
const SCENE_8 = DEFS + `
      <linearGradient id="city-suit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#DD3333"/>
        <stop offset="100%" stop-color="#BB2222"/>
      </linearGradient>
      <linearGradient id="city-trim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#E8E8E8"/>
      </linearGradient>
      <linearGradient id="city-hat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#EE3333"/>
        <stop offset="100%" stop-color="#CC2222"/>
      </linearGradient>
      <radialGradient id="city-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#1A3A1A"/>
        <stop offset="100%" stop-color="#0A2A0A"/>
      </radialGradient>
    </defs>

    <!-- Background - dark green Christmas -->
    <rect x="0" y="0" width="120" height="120" fill="url(#city-bg)" rx="8"/>
    <!-- Christmas tree -->
    <polygon points="20,110 30,70 40,110" fill="#2A6A2A"/>
    <polygon points="22,100 30,75 38,100" fill="#3A8A3A"/>
    <polygon points="30,68 31,71 34,71 32,73 33,76 30,74 27,76 28,73 26,71 29,71" fill="#FFD700"/>
    <circle cx="26" cy="90" r="2" fill="#FF4444"/>
    <circle cx="34" cy="95" r="1.8" fill="#FFD700"/>
    <circle cx="28" cy="82" r="1.5" fill="#4488FF"/>
    <circle cx="32" cy="88" r="1.6" fill="#FF69B4"/>
    <!-- Bell -->
    <path d="M95 35 Q95 28 100 28 Q105 28 105 35 Z" fill="#FFD700" opacity="0.6"/>
    <circle cx="100" cy="36" r="2" fill="#DAA520" opacity="0.6"/>
    <!-- Candy cane -->
    <path d="M105 50 Q108 40 105 35" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M105 50 Q108 40 105 35" fill="none" stroke="#FF4444" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3,3" opacity="0.5"/>
    <!-- Snowflakes -->
    <text x="15" y="40" font-size="6" fill="white" opacity="0.3">&#10052;</text>
    <text x="85" y="20" font-size="5" fill="white" opacity="0.25">&#10052;</text>
    <text x="50" y="15" font-size="4" fill="white" opacity="0.2">&#10052;</text>
    <!-- String lights -->
    <path d="M0 8 Q30 16 60 8 Q90 0 120 8" fill="none" stroke="#4A4A4A" stroke-width="0.8"/>
    <circle cx="15" cy="11" r="2" fill="#FF4444" opacity="0.6"/>
    <circle cx="35" cy="13" r="2" fill="#44FF44" opacity="0.6"/>
    <circle cx="55" cy="10" r="2" fill="#4444FF" opacity="0.6"/>
    <circle cx="75" cy="7" r="2" fill="#FFD700" opacity="0.6"/>
    <circle cx="95" cy="9" r="2" fill="#FF69B4" opacity="0.6"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M44 116 Q43 120 47 120 L56 120 Q59 120 58 116 L56 116 Z" fill="#CC2222"/>
    <path d="M44 116 L44 118" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M62 116 Q61 120 65 120 L74 120 Q77 120 76 116 L74 116 Z" fill="#CC2222"/>
    <path d="M62 116 L62 118" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>

    <!-- BODY - Christmas suit -->
    <path d="M38 80 Q36 78 34 82 L32 108 L88 108 L86 82 Q84 78 82 80 Z" fill="url(#city-suit)"/>
    <path d="M32 106 Q60 110 88 106 Q88 110 60 114 Q32 110 32 106 Z" fill="url(#city-trim)" stroke="#DDD" stroke-width="0.3"/>
    <rect x="36" y="96" width="48" height="4" rx="1" fill="#222"/>
    <rect x="57" y="95" width="6" height="6" rx="1" fill="#FFD700"/>
    <rect x="58.5" y="96" width="3" height="4" rx="0.5" fill="#DAA520"/>
    <line x1="60" y1="80" x2="60" y2="96" stroke="#AA1111" stroke-width="1" opacity="0.5"/>
    <circle cx="52" cy="86" r="1.5" fill="#FFD700"/>
    <circle cx="52" cy="92" r="1.5" fill="#FFD700"/>
    <circle cx="68" cy="86" r="1.5" fill="#FFD700"/>
    <circle cx="68" cy="92" r="1.5" fill="#FFD700"/>

    ${NECK}

    <path d="M44 72 Q60 78 76 72" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.8"/>

    <!-- ARMS -->
    <path d="M38 82 Q26 86 20 96" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="19" cy="98" r="5" fill="url(#s0)"/>
    <path d="M22 94 Q20 96 22 98" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M80 82 Q92 76 98 68" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="99" cy="66" r="5" fill="url(#s0)"/>
    <path d="M96 68 Q98 66 100 68" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.7"/>

    ${HAIR}

    <!-- Santa hat -->
    <path d="M36 30 Q38 12 60 8 Q82 12 84 30" fill="url(#city-hat)" stroke="#AA1111" stroke-width="0.4"/>
    <path d="M34 30 Q60 34 86 30 Q86 36 60 38 Q34 36 34 30 Z" fill="url(#city-trim)" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="60" cy="6" r="5" fill="url(#city-trim)" stroke="#DDD" stroke-width="0.3"/>
    <path d="M60 8 Q70 4 78 10" fill="url(#city-hat)" stroke="#AA1111" stroke-width="0.3"/>

    ${FACE}`;

// ============================================================
// SCENE 9: Travel → 优雅少年 (Elegant boy) - purple outfit, pearls, crown
// ============================================================
const SCENE_9 = DEFS + `
      <linearGradient id="travel-outfit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8844AA"/>
        <stop offset="100%" stop-color="#6622AA"/>
      </linearGradient>
      <linearGradient id="travel-outfit2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#AA66CC"/>
        <stop offset="100%" stop-color="#8844AA"/>
      </linearGradient>
      <linearGradient id="travel-crown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="#DAA520"/>
      </linearGradient>
      <radialGradient id="travel-bg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#F0E8FF"/>
        <stop offset="100%" stop-color="#E0D0F0"/>
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect x="0" y="0" width="120" height="120" fill="url(#travel-bg)" rx="8"/>
    <polygon points="20,30 23,25 26,30 23,35" fill="#E0E0FF" opacity="0.5"/>
    <polygon points="95,25 98,20 101,25 98,30" fill="#E0E0FF" opacity="0.4"/>
    <polygon points="105,65 107,61 109,65 107,69" fill="#E0E0FF" opacity="0.35"/>
    <circle cx="30" cy="20" r="2" fill="white" opacity="0.5"/>
    <circle cx="33" cy="22" r="1.5" fill="white" opacity="0.4"/>
    <circle cx="88" cy="45" r="2" fill="white" opacity="0.45"/>
    <polygon points="45,12 46,15 49,15 47,17 48,20 45,18 42,20 43,17 41,15 44,15" fill="#FFD700" opacity="0.4"/>
    <polygon points="80,15 81,17 83,17 82,18 82,20 80,19 78,20 78,18 77,17 79,17" fill="#FFD700" opacity="0.35"/>
    <circle cx="60" cy="10" r="1" fill="#FFD700" opacity="0.5"/>
    <circle cx="15" cy="50" r="1.2" fill="#FFD700" opacity="0.4"/>

    <!-- LEGS -->
    <rect x="47" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <rect x="65" y="105" width="8" height="12" rx="3" fill="url(#s0)"/>
    <path d="M45 116 Q44 120 48 120 L56 120 Q58 120 58 116 L55 116 Z" fill="#6622AA"/>
    <path d="M46 117 Q48 119 54 119" fill="none" stroke="#8844AA" stroke-width="0.6" opacity="0.5"/>
    <path d="M63 116 Q62 120 66 120 L74 120 Q76 120 76 116 L73 116 Z" fill="#6622AA"/>
    <path d="M66 117 Q68 119 72 119" fill="none" stroke="#8844AA" stroke-width="0.6" opacity="0.5"/>

    <!-- BODY - purple elegant outfit -->
    <path d="M38 80 Q36 78 34 82 L32 108 L88 108 L86 82 Q84 78 82 80 Z" fill="url(#travel-outfit)"/>
    <path d="M40 82 Q50 80 58 82 L56 108 L36 108 Z" fill="url(#travel-outfit2)" opacity="0.2"/>
    <path d="M44 78 Q52 72 60 78 Q68 72 76 78" fill="none" stroke="#AA66CC" stroke-width="2" stroke-linecap="round"/>
    <path d="M46 80 Q54 74 60 80 Q66 74 74 80" fill="none" stroke="#BB88DD" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <line x1="44" y1="86" x2="44" y2="106" stroke="#AA66CC" stroke-width="0.5" opacity="0.4"/>
    <line x1="76" y1="86" x2="76" y2="106" stroke="#AA66CC" stroke-width="0.5" opacity="0.4"/>
    <path d="M32 106 L88 106" stroke="#FFD700" stroke-width="1.5" opacity="0.5"/>
    <circle cx="60" cy="88" r="2.5" fill="#FF69B4"/>
    <circle cx="59" cy="87" r="1" fill="white" opacity="0.4"/>

    ${NECK}

    <!-- Pearl necklace -->
    <circle cx="46" cy="66" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="51" cy="68" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="56" cy="69" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="60" cy="70" r="2.2" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="64" cy="69" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="69" cy="68" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="74" cy="66" r="1.8" fill="white" stroke="#DDD" stroke-width="0.3"/>
    <circle cx="60" cy="72" r="2" fill="#FFD700"/>
    <circle cx="60" cy="72" r="1" fill="#FF69B4"/>

    <!-- ARMS -->
    <path d="M38 82 Q26 88 22 98" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="21" cy="100" r="5" fill="url(#s0)"/>
    <path d="M80 82 Q90 88 92 98" fill="none" stroke="url(#s0)" stroke-width="10" stroke-linecap="round"/>
    <circle cx="93" cy="100" r="5" fill="url(#s0)"/>

    ${HAIR}

    <!-- Small crown -->
    <path d="M46 20 L48 12 L54 16 L58 8 L62 16 L68 12 L70 20 Z" fill="url(#travel-crown)" stroke="#DAA520" stroke-width="0.4"/>
    <circle cx="54" cy="16" r="1.5" fill="#FF69B4"/>
    <circle cx="58" cy="12" r="2" fill="#4488FF"/>
    <circle cx="62" cy="16" r="1.5" fill="#FF69B4"/>
    <rect x="46" y="18" width="24" height="3" rx="1" fill="url(#travel-crown)" stroke="#DAA520" stroke-width="0.3"/>

    ${FACE}`;

// ============================================================
// WRITE ALL 9 TSX FILES
// ============================================================
const sceneConfigs = [
  { file: 'SelfieCharacter.tsx', func: 'selfieSVG', comment: 'Selfie - 王子风格：粉色衣服，皇冠，爱心魔法棒', svg: SCENE_1 },
  { file: 'RowingCharacter.tsx', func: 'rowingSVG', comment: 'Rowing - 猫耳少年风格：深色衣服，猫耳，蝙蝠背景', svg: SCENE_2 },
  { file: 'DiningCharacter.tsx', func: 'diningSVG', comment: 'Dining - 冬日少年风格：白色毛绒冬装，礼盒，雪花', svg: SCENE_3 },
  { file: 'HikingCharacter.tsx', func: 'hikingSVG', comment: 'Hiking - 男仆风格：黑白执事服，扫帚', svg: SCENE_4 },
  { file: 'ShoppingCharacter.tsx', func: 'shoppingSVG', comment: 'Shopping - 学生少年风格：白衬衫，格子裙，红领结，书本', svg: SCENE_5 },
  { file: 'BeachCharacter.tsx', func: 'beachSVG', comment: 'Beach - 玫瑰少年风格：红色衣服，玫瑰花，爱心', svg: SCENE_6 },
  { file: 'ParkCharacter.tsx', func: 'parkSVG', comment: 'Park - 天使少年风格：白衣，翅膀，光环', svg: SCENE_7 },
  { file: 'CityCharacter.tsx', func: 'citySVG', comment: 'City - 圣诞少年风格：圣诞帽，红白服装，圣诞元素', svg: SCENE_8 },
  { file: 'TravelCharacter.tsx', func: 'travelSVG', comment: 'Travel - 优雅少年风格：紫色华丽服装，珍珠，皇冠', svg: SCENE_9 },
];

for (const s of sceneConfigs) {
  const tsx = `// ${s.comment}
export function ${s.func}() {
  return \`
${s.svg}
  \`;
}
`;
  writeFileSync(join(CHAR_DIR, s.file), tsx, 'utf-8');
  console.log('Generated: ' + s.file);
}

console.log('\n✅ Generated 9 character files (scenes 1-9)');
console.log('Scenes 10-19 unchanged.');

// ============================================================
// BUILD PREVIEW HTMLs
// ============================================================
console.log('\nBuilding preview HTMLs...');

const allFiles = [
  'SelfieCharacter.tsx', 'RowingCharacter.tsx', 'DiningCharacter.tsx',
  'HikingCharacter.tsx', 'ShoppingCharacter.tsx', 'BeachCharacter.tsx',
  'ParkCharacter.tsx', 'CityCharacter.tsx', 'TravelCharacter.tsx',
  'WorkCharacter.tsx', 'HomeCharacter.tsx', 'ConcertCharacter.tsx',
  'RainyCharacter.tsx', 'BirthdayCharacter.tsx', 'SportsCharacter.tsx',
  'SnowyCharacter.tsx', 'MovieCharacter.tsx', 'GardenCharacter.tsx',
  'NightSnackCharacter.tsx',
];

const sceneNames = [
  'Selfie', 'Rowing', 'Dining', 'Hiking', 'Shopping',
  'Beach', 'Park', 'City', 'Travel', 'Work',
  'Home', 'Concert', 'Rainy', 'Birthday', 'Sports',
  'Snowy', 'Movie', 'Garden', 'NightSnack',
];

const sharedDefs = '<defs>\n    <linearGradient id="s0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE8CC"/><stop offset="100%" stop-color="#FFD4A8"/></linearGradient>\n    <radialGradient id="ss0" cx="0.4" cy="0.3" r="0.6"><stop offset="0%" stop-color="#FFF0DE"/><stop offset="100%" stop-color="#FFD4A8"/></radialGradient>\n    <radialGradient id="bl0" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#FF9BBC" stop-opacity="0.7"/><stop offset="100%" stop-color="#FF9BBC" stop-opacity="0"/></radialGradient>\n    <linearGradient id="h0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3A3A3A"/><stop offset="50%" stop-color="#222"/><stop offset="100%" stop-color="#111"/></linearGradient>\n    <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6B4226"/><stop offset="100%" stop-color="#4A2C12"/></linearGradient>\n    <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C49A6C"/><stop offset="100%" stop-color="#A0784C"/></linearGradient>\n  </defs>';

function extractSVG(content) {
  const match = content.match(/return\s*`([\s\S]*?)`;/);
  if (!match) return '';
  let svg = match[1].trim();
  if (!svg.includes('<defs>')) {
    svg = sharedDefs + '\n' + svg;
  }
  return svg;
}

const chars = [];
for (let i = 0; i < allFiles.length; i++) {
  const content = readFileSync(join(CHAR_DIR, allFiles[i]), 'utf-8');
  chars.push({ name: sceneNames[i], svg: extractSVG(content) });
}

// Escape for embedding in HTML
const charsJSON = JSON.stringify(chars);

// illustrated-preview.html
const illustratedHTML = '<!DOCTYPE html>\n<html lang="zh">\n<head>\n<meta charset="UTF-8">\n<title>插画风格角色 v4 — 参考图完全替换</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:linear-gradient(135deg,#f5f7fa,#c3cfe2);min-height:100vh;font-family:Segoe UI,sans-serif;padding:30px}\nh1{text-align:center;color:#333;margin-bottom:10px;font-size:24px}\n.sub{text-align:center;color:#888;margin-bottom:30px;font-size:14px}\n.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:1000px;margin:0 auto}\n.card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center;transition:transform .2s}\n.card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,.12)}\n.card .name{margin-top:10px;font-size:14px;font-weight:600;color:#555}\n.card .label{font-size:11px;color:#aaa;margin-top:2px}\n.card.new{border:2px solid #FF69B4}\n.card.new .name::after{content:" ✨"}\nsvg{filter:drop-shadow(0 3px 6px rgba(0,0,0,.15))}\n@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}\n@keyframes steam-rise{0%{transform:translateY(0);opacity:.5}100%{transform:translateY(-10px);opacity:0}}\n@keyframes walk-cycle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}\n@keyframes foot-kick{0%,100%{transform:rotate(0)}30%{transform:rotate(12deg)}}\n@keyframes nap-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}\n</style>\n</head>\n<body>\n<h1>插画风格角色 v4 — 参考图完全替换</h1>\n<p class="sub">场景 1-9 已完全替换为参考图形象 · 场景 10-19 保持不变</p>\n<div class="grid" id="grid"></div>\n<script>\nconst chars=' + charsJSON + ';\nconst grid=document.getElementById("grid");\nchars.forEach((c,i)=>{const card=document.createElement("div");card.className="card"+(i<9?" new":"");card.innerHTML=`<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="width:180px;height:180px;animation:float 3s ease-in-out infinite">${c.svg}</svg><div class="name">${c.name}</div><div class="label">Scene ${i+1}</div>`;grid.appendChild(card)});\n</script>\n</body>\n</html>';

writeFileSync(join(DESIGN_DIR, 'illustrated-preview.html'), illustratedHTML, 'utf-8');
console.log('Generated: illustrated-preview.html');

// kawaii-preview.html
const stickerFilterSVG = '<defs><filter id="sticker" x="-25%" y="-25%" width="150%" height="150%"><feMorphology operator="dilate" radius="5" in="SourceAlpha" result="expanded"/><feFlood flood-color="white" result="white"/><feComposite in="white" in2="expanded" operator="in" result="whiteOutline"/><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="shadow"/><feOffset dx="1" dy="2" result="offsetShadow"/><feFlood flood-color="rgba(0,0,0,0.12)" result="shadowColor"/><feComposite in="shadowColor" in2="offsetShadow" operator="in" result="coloredShadow"/><feMerge><feMergeNode in="coloredShadow"/><feMergeNode in="whiteOutline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

const kawaiiChars = chars.map(c => ({
  name: c.name,
  svg: stickerFilterSVG + '<g filter="url(#sticker)">' + c.svg + '</g>'
}));

const kawaiiJSON = JSON.stringify(kawaiiChars);

const kawaiiHTML = '<!DOCTYPE html>\n<html lang="zh">\n<head>\n<meta charset="UTF-8">\n<title>Kawaii Sticker Characters v4</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:linear-gradient(135deg,#ffecd2,#fcb69f);min-height:100vh;font-family:Segoe UI,sans-serif;padding:30px}\nh1{text-align:center;color:#333;margin-bottom:10px;font-size:24px}\n.sub{text-align:center;color:#888;margin-bottom:30px;font-size:14px}\n.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;max-width:1000px;margin:0 auto}\n.card{background:rgba(255,255,255,.85);border-radius:20px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);text-align:center;transition:transform .2s}\n.card:hover{transform:scale(1.05)}\n.card .name{margin-top:10px;font-size:14px;font-weight:600;color:#555}\n.card .scene{font-size:11px;color:#bbb;margin-top:2px}\n.card.new{border:2px solid #FF69B4}\n.card.new .name::after{content:" ✨"}\n@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}\n@keyframes steam-rise{0%{transform:translateY(0);opacity:.5}100%{transform:translateY(-10px);opacity:0}}\n@keyframes walk-cycle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}\n</style>\n</head>\n<body>\n<h1>Kawaii Sticker Characters v4</h1>\n<p class="sub">场景 1-9 参考图替换版 · 场景 10-19 保持不变</p>\n<div class="grid" id="grid"></div>\n<script>\nconst chars=' + kawaiiJSON + ';\nconst grid=document.getElementById("grid");\nchars.forEach((c,i)=>{const card=document.createElement("div");card.className="card"+(i<9?" new":"");card.innerHTML=`<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="width:180px;height:180px;animation:float 3s ease-in-out infinite">${c.svg}</svg><div class="name">${c.name}</div><div class="scene">Scene ${i+1}</div>`;grid.appendChild(card)});\n</script>\n</body>\n</html>';

writeFileSync(join(DESIGN_DIR, 'kawaii-preview.html'), kawaiiHTML, 'utf-8');
console.log('Generated: kawaii-preview.html');

console.log('\n✅ All done!');
console.log('  - 9 TSX files generated (scenes 1-9)');
console.log('  - illustrated-preview.html rebuilt');
console.log('  - kawaii-preview.html rebuilt');
