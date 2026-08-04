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

    content = content.replace(/,\s*SceneType/g, '');
    content = content.replace(/SceneType,\s*/g, '');
    content = content.replace(/import \{ SceneType \} from '[^']+';\n/g, '');
    content = content.replace(/SceneType/g, 'string'); // replace standalone types

    content = content.replace(/scene:\s*['"][a-zA-Z]+['"]/g, match => match.replace('scene:', 'tag:'));
    content = content.replace(/scene: /g, 'tag: ');
    content = content.replace(/\.scene/g, '.tag');
    content = content.replace(/scene=\{[^}]+\}/g, '');
    
    content = content.replace(/import.*SceneSelector.*;\n/g, '');
    content = content.replace(/import.*sceneDetector.*;\n/g, '');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
