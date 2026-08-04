const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(path.join('c:/Users/90823/Desktop/所有文件/AI项目/记忆地图/src'), function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Fix styles
    content = content.replace(/tagRow/g, 'sceneRow');
    content = content.replace(/tagPill/g, 'scenePill');
    content = content.replace(/tagEmoji/g, 'sceneEmoji');
    content = content.replace(/tagName/g, 'sceneName');
    content = content.replace(/tagTag/g, 'sceneTag');
    content = content.replace(/tagEditor/g, 'sceneEditor');
    
    // Fix shorthand property scene (where it's missing)
    // Actually just change `scene` to `tag` where it accesses m.scene
    content = content.replace(/m\.scene/g, 'm.tag');
    content = content.replace(/marker\.scene/g, 'marker.tag');
    content = content.replace(/photo\.scene/g, 'photo.tag');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed styles in', filePath);
    }
  }
});
