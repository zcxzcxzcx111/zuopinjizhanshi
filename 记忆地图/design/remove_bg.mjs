import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const SRC = 'C:/Users/90823/Desktop/形象图';
const OUT = 'C:/Users/90823/MemoryMap/assets/characters';
const OUT2 = 'C:/Users/90823/MemoryMap/src/assets/characters';

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

const files = readdirSync(SRC).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} PNG files\n`);

// Remove background by scanning from each edge inward.
// Stops at the first "character" pixel (dark enough).
function edgeScanRemove(data, width, height, channels, tolerance) {
  function isBg(r, g, b) {
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    return dist < tolerance;
  }

  // Scan each row: left→right and right→left
  for (let y = 0; y < height; y++) {
    // Left to right
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isBg(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      } else {
        break; // hit character, stop
      }
    }
    // Right to left
    for (let x = width - 1; x >= 0; x--) {
      const i = (y * width + x) * channels;
      if (isBg(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      } else {
        break;
      }
    }
  }

  // Scan each column: top→bottom and bottom→top
  for (let x = 0; x < width; x++) {
    // Top to bottom
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * channels;
      if (isBg(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      } else {
        break;
      }
    }
    // Bottom to top
    for (let y = height - 1; y >= 0; y--) {
      const i = (y * width + x) * channels;
      if (isBg(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      } else {
        break;
      }
    }
  }
}

// Second pass: remove remaining light-colored background pixels
// that are disconnected from the character (e.g. ground shadow patches)
function removeDisconectedLight(data, width, height, channels, brightnessThresh, satThresh) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] === 0) continue; // already transparent

      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = max;
      const saturation = max > 0 ? (max - min) / max : 0;

      // Light, desaturated pixel = likely background remnant
      if (brightness > brightnessThresh && saturation < satThresh) {
        // Check if it has any non-transparent neighbor (connected to character)
        let hasCharNeighbor = false;
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const ni = (ny * width + nx) * channels;
            if (data[ni + 3] > 0) {
              const nr = data[ni], ng = data[ni+1], nb = data[ni+2];
              const nBright = Math.max(nr, ng, nb);
              if (nBright < brightnessThresh) {
                hasCharNeighbor = true;
                break;
              }
            }
          }
        }
        // If NOT adjacent to a character pixel, remove it
        if (!hasCharNeighbor) {
          data[i + 3] = 0;
        }
      }
    }
  }
}

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

  const { data, info } = await sharp(srcPath)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  // Pass 1: edge scan (conservative, won't cross into character)
  edgeScanRemove(out, width, height, channels, 40);

  // Pass 2: remove disconnected light patches (ground shadows) - aggressive
  removeDisconectedLight(out, width, height, channels, 200, 0.20);

  // Pass 3: flood fill from existing transparent pixels to catch remaining isolated patches
  {
    const visited = new Uint8Array(width * height);
    const queue = [];
    // Seed from all currently-transparent edge pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        if (out[i + 3] === 0) {
          visited[y * width + x] = 1;
          queue.push(x, y);
        }
      }
    }
    // BFS: spread from transparent into adjacent light-colored pixels
    let head = 0;
    const neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
    while (head < queue.length) {
      const x = queue[head++], y = queue[head++];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nidx = ny * width + nx;
        if (visited[nidx]) continue;
        visited[nidx] = 1;
        const ni = nidx * channels;
        if (out[ni + 3] > 0) {
          const nr = out[ni], ng = out[ni+1], nb = out[ni+2];
          const nBright = Math.max(nr, ng, nb);
          const nMin = Math.min(nr, ng, nb);
          const nSat = nBright > 0 ? (nBright - nMin) / nBright : 0;
          // Light & desaturated = background remnant
          if (nBright > 195 && nSat < 0.25) {
            out[ni + 3] = 0;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Save to both output dirs
  const pipeline = sharp(out, { raw: { width, height, channels } }).png();
  await pipeline.toFile(join(OUT, `${matchedScene}.png`));
  await pipeline.toFile(join(OUT2, `${matchedScene}.png`));
  console.log(`  ✓ ${matchedScene}.png`);
}

console.log('\nDone! 8 scenes processed.');
