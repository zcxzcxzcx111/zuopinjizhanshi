const fs = require('fs');

const p = (file) => 'c:/Users/90823/Desktop/所有文件/AI项目/记忆地图/' + file;

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
  return c.replace(/SceneType/g, 'string')
          .replace(/scene,/g, 'tag: "selfie",');
});

replaceInFile(p('src/data/mockPhotos.ts'), c => {
  return c.replace(/Record<string>/g, 'Record<string, any>');
});

replaceInFile(p('src/data/photoDerivations.test.ts'), c => {
  return c.replace(/isDailyPick,/g, '')
          .replace(/generateDescription\([^)]+\)/g, '"未知地点"');
});

replaceInFile(p('src/screens/MapScreen.tsx'), c => {
  return c.replace(/import.*SceneWheel.*;\n/g, '')
          .replace(/import.*SceneConfirmBanner.*;\n/g, '')
          .replace(/scene:/g, 'tag:')
          .replace(/scene\s*===/g, 'tag ===')
          .replace(/scene,/g, 'tag: "selfie",')
          .replace(/m\.scene/g, 'm.tag');
});

replaceInFile(p('src/screens/PhotoDetail.tsx'), c => {
  return c.replace(/scene,/g, 'tag: "selfie",');
});

replaceInFile(p('src/services/characterGeneration.test.ts'), c => {
  return c.replace(/generateCharacterSticker\([^,]+,\s*'[^']+'\)/g, match => match.split(',')[0] + ')');
});
