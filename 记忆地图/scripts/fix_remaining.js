const fs = require('fs');
const path = require('path');

const p = (file) => path.join('c:/Users/90823/Desktop/所有文件/AI项目/记忆地图', file);

const replaceInFile = (file, replacer) => {
  if (!fs.existsSync(file)) return;
  const original = fs.readFileSync(file, 'utf-8');
  const updated = replacer(original);
  if (original !== updated) {
    fs.writeFileSync(file, updated);
    console.log('Fixed', file);
  }
};

replaceInFile(p('App.tsx'), c => {
  return c.replace(/import\s*\{\s*SceneType\s*\}\s*from\s*'[^']+';\n?/g, '')
          .replace(/,\s*SceneType/g, '')
          .replace(/SceneType,\s*/g, '')
          .replace(/scene:/g, 'tag:');
});

replaceInFile(p('src/data/mockPhotos.ts'), c => {
  return c.replace(/scene:/g, 'tag:')
          .replace(/Record<SceneType,\s*any>/g, 'Record<string, any>')
          .replace(/import.*SceneType.*;/g, '');
});

replaceInFile(p('src/data/photoDerivations.test.ts'), c => {
  return c.replace(/scene:/g, 'tag:')
          .replace(/,\s*scene\s*,/g, ',')
          .replace(/isDailyPick\s*,/g, '') // or define it
          .replace(/generateDescription\(([^,]+),\s*([^)]+)\)/g, '$2 || "未知地点"');
});

replaceInFile(p('src/screens/MapScreen.tsx'), c => {
  return c.replace(/marker\.scene/g, 'marker.tag')
          .replace(/scene\s*===/g, 'tag ===');
});

replaceInFile(p('src/screens/PhotoDetail.tsx'), c => {
  return c.replace(/<SceneSelector[^>]+>/g, '')
          .replace(/import.*SceneSelector.*;\n/g, '')
          .replace(/scene:/g, 'tag:')
          .replace(/m\.scene/g, 'm.tag');
});

replaceInFile(p('src/services/characterGeneration.test.ts'), c => {
  return c.replace(/generateCharacterSticker\([^,]+,\s*'[^']+'\)/g, match => {
    return match.split(',')[0] + ')';
  });
});

replaceInFile(p('src/components/QCharacter.tsx'), c => {
  return c.replace(/import.*sceneColors.*;\n/g, '')
          .replace(/import.*sceneEmojis.*;\n/g, '')
          .replace(/import.*hasCharacterImage.*;\n/g, '')
          .replace(/import.*sceneEmoji.*;\n/g, '');
});

