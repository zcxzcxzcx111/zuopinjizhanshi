import { readdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const SRC = 'C:/Users/90823/Desktop/形象图';
const OUT1 = 'C:/Users/90823/MemoryMap/assets/characters';
const OUT2 = 'C:/Users/90823/MemoryMap/src/assets/characters';

const files = readdirSync(SRC).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} PNG files\n`);

// Map by specific keywords (order matters - more specific first)
const matchRules = [
  { key: '自拍杆', scene: 'selfie' },
  { key: '划船', scene: 'rowing' },
  { key: '吃饭', scene: 'dining' },
  { key: '徒步', scene: 'hiking' },
  { key: '购物袋', scene: 'shopping' },
  { key: '玩沙', scene: 'beach' },
  { key: '喝咖啡', scene: 'city' },
  { key: '拿着地图', scene: 'travel' },
];

for (const file of files) {
  let matchedScene = null;
  for (const { key, scene } of matchRules) {
    if (file.includes(key)) {
      matchedScene = scene;
      break;
    }
  }

  if (!matchedScene) {
    console.log(`  ⚠ No match: ${file}`);
    continue;
  }

  const srcPath = join(SRC, file);
  const outPath1 = join(OUT1, `${matchedScene}.png`);
  const outPath2 = join(OUT2, `${matchedScene}.png`);

  await sharp(srcPath)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath1);

  copyFileSync(outPath1, outPath2);
  console.log(`  ✓ ${matchedScene}.png`);
}

console.log('\nDone! 8 scenes updated. (park.png not found - skipped)');
