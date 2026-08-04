const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const inputFiles = [
  {
    src: 'C:\\Users\\90823\\.gemini\\antigravity\\brain\\d56cdb1c-2c56-43bf-afdd-69acb81cb7b8\\media__1784134120342.png',
    destName: 'dining.png',
    desc: '美食 (吃面/便当)'
  },
  {
    src: 'C:\\Users\\90823\\.gemini\\antigravity\\brain\\d56cdb1c-2c56-43bf-afdd-69acb81cb7b8\\media__1784134120343.jpg',
    destName: 'rowing.png',
    desc: '划船 (救生衣划船)'
  },
  {
    src: 'C:\\Users\\90823\\.gemini\\antigravity\\brain\\d56cdb1c-2c56-43bf-afdd-69acb81cb7b8\\media__1784134120349.jpg',
    destName: 'park.png',
    desc: '公园游玩 (捕虫网草地奔跑)'
  },
  {
    src: 'C:\\Users\\90823\\.gemini\\antigravity\\brain\\d56cdb1c-2c56-43bf-afdd-69acb81cb7b8\\media__1784134120425.jpg',
    destName: 'shopping.png',
    desc: '购物 (手提购物袋咖啡)'
  },
  {
    src: 'C:\\Users\\90823\\.gemini\\antigravity\\brain\\d56cdb1c-2c56-43bf-afdd-69acb81cb7b8\\media__1784134120430.jpg',
    destName: 'beach.png',
    desc: '沙滩 (太阳镜墨镜沙雕海浪)'
  }
];

async function removeBackgroundAndWatermarks(srcPath, destName, desc) {
  console.log(`正在处理 [${desc}]... 源文件: ${srcPath}`);
  const img = await Jimp.read(srcPath);
  const width = img.bitmap.width;
  const height = img.bitmap.height;

  // 1. 创建访问标记数组和队列 (BFS Flood Fill 从边缘开始往内侵蚀背景)
  const visited = new Uint8Array(width * height);
  const queue = [];

  // 判断是否为外围待擦除区域（黑色背景或角落水印）
  function isBackgroundOrWatermark(x, y) {
    const idx = (y * width + x) << 2;
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx + 1];
    const b = img.bitmap.data[idx + 2];

    // 如果接近纯白或较亮的贴纸边框 (RGB 均大等于 140 且非角落区域)，肯定是贴纸边缘，停止遍历
    if (r >= 140 && g >= 140 && b >= 140) {
      return false;
    }

    // 判断是否在左上角水印区域 ("AI生成" 图标通常在 x < 28%, y < 13%)
    if (x < width * 0.28 && y < height * 0.13) {
      if (r < 180 && g < 180 && b < 180) return true;
    }

    // 判断是否在右下角水印区域 ("即梦AI" 图标通常在 x > 70%, y > 86%)
    if (x > width * 0.70 && y > height * 0.86) {
      if (r < 200 && g < 200 && b < 200) return true;
    }

    // 普通外围黑色/深灰背景
    if (r < 85 && g < 85 && b < 85) {
      return true;
    }

    return false;
  }

  // 将所有边缘像素加入初始 BFS 队列
  for (let x = 0; x < width; x++) {
    queue.push([x, 0]);
    queue.push([x, height - 1]);
    visited[0 * width + x] = 1;
    visited[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y]);
    queue.push([width - 1, y]);
    visited[y * width + 0] = 1;
    visited[y * width + (width - 1)] = 1;
  }

  // BFS 遍历
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    
    if (isBackgroundOrWatermark(x, y)) {
      // 设为完全透明
      const idx = (y * width + x) << 2;
      img.bitmap.data[idx + 3] = 0; // Alpha = 0

      // 检查 8 邻域
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex]) {
            visited[nIndex] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // 2. 额外清理残留的水印区域（防漏网之鱼）
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) << 2;
      if (img.bitmap.data[idx + 3] === 0) continue; // 已经透明

      // 强制清除左上角和右下角孤立暗色水印斑块
      if ((x < width * 0.25 && y < height * 0.12) || (x > width * 0.73 && y > height * 0.88)) {
        const r = img.bitmap.data[idx];
        const g = img.bitmap.data[idx + 1];
        const b = img.bitmap.data[idx + 2];
        if (r < 150 && g < 150 && b < 150) {
          img.bitmap.data[idx + 3] = 0;
        }
      }
    }
  }

  // 3. 边缘抗锯齿与平滑修复 (Alpha 羽化 1px)
  const origAlpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    origAlpha[i] = img.bitmap.data[i * 4 + 3];
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (origAlpha[i] > 0) {
        // 如果周围有透明像素，说明是外轮廓边缘
        let transCount = 0;
        if (origAlpha[i - 1] === 0) transCount++;
        if (origAlpha[i + 1] === 0) transCount++;
        if (origAlpha[i - width] === 0) transCount++;
        if (origAlpha[i + width] === 0) transCount++;
        if (transCount >= 2) {
          img.bitmap.data[i * 4 + 3] = Math.floor(origAlpha[i] * 0.7); // 羽化边缘
        }
      }
    }
  }

  // 保存到 src/assets/characters 和 public/assets/characters
  const srcDest = path.join(__dirname, 'src', 'assets', 'characters', destName);
  const pubDest = path.join(__dirname, 'public', 'assets', 'characters', destName);

  await img.writeAsync(srcDest);
  await img.writeAsync(pubDest);
  console.log(`✅ 抠图成功！已同步覆盖至: \n  - ${srcDest}\n  - ${pubDest}`);
}

async function main() {
  for (const item of inputFiles) {
    if (fs.existsSync(item.src)) {
      await removeBackgroundAndWatermarks(item.src, item.destName, item.desc);
    } else {
      console.error(`❌ 未找到输入文件: ${item.src}`);
    }
  }
  console.log('\n🎉 所有场景角色贴纸抠图与替换全部完成！');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
