
export interface FoodArtResult {
  originalUri: string;
  animeUri: string;
  width: number;
  height: number;
}

// Anime-style CSS filters for web
export const animeFilterCSS = `
  filter: contrast(1.4) saturate(1.8) brightness(1.1);
  filter: url(#anime-filter);
`;

// SVG filter definition for anime/painterly effect
export const animeSVGFilter = `
<svg style="position:absolute;width:0;height:0;">
  <defs>
    <filter id="anime-filter" x="-10%" y="-10%" width="120%" height="120%">
      <!-- Posterize: reduce colors to create flat anime look -->
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
        <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
        <feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
      </feComponentTransfer>
      <!-- Boost saturation -->
      <feColorMatrix type="saturate" values="1.6"/>
      <!-- Slight sharpening -->
      <feConvolveMatrix order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0"/>
      <!-- Edge detection for outline -->
      <feMorphology operator="dilate" radius="0.5" result="dilated"/>
      <feComposite in="SourceGraphic" in2="dilated" operator="over"/>
    </filter>

    <filter id="food-glow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feColorMatrix type="saturate" values="2"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
</svg>
`;

// The PWA keeps the original browser image and applies its treatment in CSS.
export async function processFoodToAnime(uri: string): Promise<FoodArtResult> {
  return { originalUri: uri, animeUri: uri, width: 0, height: 0 };
}

// Generate a decorative anime-style frame/overlay for the food photo
export function getFoodOverlayStyle(isSelected: boolean) {
  return {
    // Comic/anime style frame
    borderWidth: isSelected ? 4 : 3,
    borderColor: isSelected ? '#FF6B6B' : '#FFB366',
    borderRadius: 16,
    filter: 'contrast(1.3) saturate(1.6) brightness(1.05)',
  };
}

// Generate the food pin/sticker SVG that appears on the map
export function generateFoodPinSVG(animeUri: string): string {
  return `
    <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="food-circle">
          <circle cx="50" cy="45" r="38"/>
        </clipPath>
        <filter id="pin-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.2"/>
        </filter>
      </defs>

      <!-- Pin body -->
      <circle cx="50" cy="45" r="42" fill="white" filter="url(#pin-shadow)"/>
      <circle cx="50" cy="45" r="40" fill="#FFF9E6"/>
      <circle cx="50" cy="45" r="39" fill="none" stroke="#FFB366" stroke-width="2"/>

      <!-- Food image placeholder -->
      <image href="${animeUri}" x="12" y="7" width="76" height="76" clip-path="url(#food-circle)"/>

      <!-- Anime sparkle decorations -->
      <g style="animation: sparkle 2s ease-in-out infinite;">
        <polygon points="85,20 87,24 91,24 88,27 89,31 85,28 81,31 82,27 79,24 83,24" fill="#FFD700" opacity="0.8"/>
      </g>
      <g style="animation: sparkle 2s ease-in-out infinite; animation-delay: 1s;">
        <polygon points="15,15 16.5,18 20,18 17.5,20 18.5,23 15,21 11.5,23 12.5,20 10,18 13.5,18" fill="#FF69B4" opacity="0.7"/>
      </g>

      <!-- Pin pointer -->
      <path d="M 42 85 L 50 115 L 58 85" fill="#FF6B6B" stroke="#E55B5B" stroke-width="1.5"/>
      <circle cx="50" cy="80" r="6" fill="#FF6B6B"/>

      <!-- Chopsticks icon -->
      <g transform="translate(35, 88) rotate(-15)">
        <line x1="0" y1="0" x2="12" y2="-8" stroke="#8B4513" stroke-width="2" stroke-linecap="round"/>
        <line x1="4" y1="0" x2="16" y2="-8" stroke="#8B4513" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// CSS for the floating food sticker effect
export const foodStickerCSS = `
  @keyframes food-float {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-6px) rotate(2deg); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
    50% { opacity: 1; transform: scale(1) rotate(180deg); }
  }
  @keyframes food-bounce {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .food-sticker {
    animation: food-float 3s ease-in-out infinite;
  }
  .food-original {
    animation: food-bounce 0.3s ease-out;
  }
`;
