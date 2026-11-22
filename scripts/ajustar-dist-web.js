const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.resolve('dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const FONTS_DIR = path.join(DIST_DIR, 'fonts');
const IMG_DIR = path.join(DIST_DIR, 'img');
const JS_WEB_DIR = path.join(DIST_DIR, '_expo', 'static', 'js', 'web');
const TEXT_EXTENSIONS = new Set(['.js', '.css', '.html', '.json', '.map']);
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, result);
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function toPosixUrl(filePath) {
  return '/' + path.relative(DIST_DIR, filePath).split(path.sep).join('/');
}

function md5Hex(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// 1. Move assets out of dist/assets/node_modules/... into flat folders (/fonts and /img),
//    and inline Ionicons.ttf as a data URI so icons work offline and on any static host
//    (including Netlify Drop) without extra font network requests or folder-ignore issues.
const urlReplacements = new Map();

if (fs.existsSync(ASSETS_DIR)) {
  fs.rmSync(FONTS_DIR, { recursive: true, force: true });
  fs.rmSync(IMG_DIR, { recursive: true, force: true });
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  for (const filePath of walkFiles(ASSETS_DIR)) {
    const oldUrl = toPosixUrl(filePath);
    const baseName = path.basename(filePath);
    const ext = path.extname(baseName).toLowerCase();

    if (/^Ionicons\.[0-9a-f]+\.ttf$/i.test(baseName)) {
      const base64 = fs.readFileSync(filePath).toString('base64');
      urlReplacements.set(oldUrl, `data:font/ttf;base64,${base64}`);
      continue;
    }

    const targetDir = FONT_EXTENSIONS.has(ext) ? FONTS_DIR : IMG_DIR;
    const targetPath = path.join(targetDir, baseName);
    fs.copyFileSync(filePath, targetPath);
    urlReplacements.set(oldUrl, toPosixUrl(targetPath));
  }

  fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
}

// 2. Rewrite asset URLs inside dist text files and collect modified JS bundles.
const modifiedJsFiles = [];
const sortedReplacements = [...urlReplacements.entries()].sort((a, b) => b[0].length - a[0].length);

for (const filePath of walkFiles(DIST_DIR)) {
  if (!TEXT_EXTENSIONS.has(path.extname(filePath))) continue;

  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;
  for (const [from, to] of sortedReplacements) {
    if (updated.includes(from)) {
      updated = updated.split(from).join(to);
    }
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    if (filePath.startsWith(JS_WEB_DIR) && filePath.endsWith('.js')) {
      modifiedJsFiles.push(filePath);
    }
  }
}

// 3. Re-hash modified JS bundle filenames so browsers and CDNs never serve stale cached JS.
const jsRenames = new Map();

for (const filePath of modifiedJsFiles) {
  const dir = path.dirname(filePath);
  const oldName = path.basename(filePath);
  const match = oldName.match(/^(.+)-([0-9a-f]{32})\.js$/);
  if (!match) continue;

  const newHash = md5Hex(fs.readFileSync(filePath));
  const newName = `${match[1]}-${newHash}.js`;
  if (newName === oldName) continue;

  const newPath = path.join(dir, newName);
  fs.renameSync(filePath, newPath);
  jsRenames.set(oldName, newName);
}

if (jsRenames.size > 0) {
  for (const filePath of walkFiles(DIST_DIR)) {
    if (!TEXT_EXTENSIONS.has(path.extname(filePath))) continue;

    const original = fs.readFileSync(filePath, 'utf8');
    let updated = original;
    for (const [oldName, newName] of jsRenames.entries()) {
      if (updated.includes(oldName)) {
        updated = updated.split(oldName).join(newName);
      }
    }

    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }
  }
}

console.log(
  `[ajustar-dist-web] Ionicons embutido em data URI, assets achatados em /fonts e /img (${urlReplacements.size} mapeamentos, ${jsRenames.size} bundles re-hasheados).`,
);
