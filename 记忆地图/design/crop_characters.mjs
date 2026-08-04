import sharp from 'sharp';
import { join } from 'path';

const SRC = 'C:/Users/90823/Downloads/Gemini_Generated_Image_p9ce87p9ce87p9ce.png';
const OUT = 'C:/Users/90823/MemoryMap/src/assets/characters';

// Get image dimensions first
const meta = await sharp(SRC).metadata();
console.log(`Image: ${meta.width}x${meta.height}`);

// 3x3 grid layout
const cols = 3;
const rows = 3;
const cellW = Math.floor(meta.width / cols);
const cellH = Math.floor(meta.height / rows);

console.log(`Cell size: ${cellW}x${cellH}`);

// Scene names mapped to grid positions (row by row, left to right)
const grid = [
  ['selfie',   'rowing',   'dining'],
  ['hiking',   'shopping', 'beach'],
  ['park',     'city',     'travel'],
];

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const name = grid[row][col];
    const left = col * cellW;
    const top = row * cellH;

    await sharp(SRC)
      .extract({ left, top, width: cellW, height: cellH })
      .png()
      .toFile(join(OUT, `${name}.png`));

    console.log(`  ✓ ${name}.png (${left},${top} ${cellW}x${cellH})`);
  }
}

console.log('\nDone! All 9 character images cropped.');
