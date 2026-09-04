const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', '@rnmapbox', 'maps', 'package.json');
const indexJsPath = path.join(__dirname, '..', 'node_modules', '@rnmapbox', 'maps', 'lib', 'module', 'index.js');

if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  pkg.main = './lib/module/index.native.js';
  pkg['react-native'] = './lib/module/index.native.js';

  if (!pkg.exports) {
    pkg.exports = {};
  }
  pkg.exports['.'] = {
    'react-native': './lib/module/index.native.js',
    default: './lib/module/index.native.js'
  };
  pkg.exports['./package.json'] = './package.json';
  pkg.exports['./app.plugin.js'] = './app.plugin.js';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('[fix-rnmapbox-esm] Successfully updated package.json.');
}

if (fs.existsSync(indexJsPath)) {
  let content = fs.readFileSync(indexJsPath, 'utf8');
  content = content.replace(/from '\.\/Mapbox(\.js)?'/g, "from './Mapbox.native.js'");
  fs.writeFileSync(indexJsPath, content, 'utf8');
  console.log('[fix-rnmapbox-esm] Successfully updated index.js.');
}
