import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputRoot = join(projectRoot, 'dist');

function assert(condition, message) {
  if (!condition) throw new Error(`PWA verification failed: ${message}`);
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const requiredFiles = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/leaflet.js',
];

for (const file of requiredFiles) {
  assert(existsSync(join(outputRoot, file)), `missing dist/${file}`);
}

const manifest = JSON.parse(readFileSync(join(outputRoot, 'manifest.json'), 'utf8'));
assert(manifest.display === 'standalone', 'manifest display must be standalone');
assert(manifest.start_url === '/', 'manifest start_url must be /');
assert(manifest.scope === '/', 'manifest scope must be /');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'manifest must provide install icons');

for (const icon of manifest.icons) {
  const relativePath = String(icon.src || '').replace(/^\/+/, '');
  assert(relativePath && existsSync(join(outputRoot, relativePath)), `missing manifest icon ${icon.src}`);
}

const serviceWorker = readFileSync(join(outputRoot, 'sw.js'), 'utf8');
assert(serviceWorker.includes("url.pathname.startsWith('/api/')"), 'service worker must bypass API requests');
assert(serviceWorker.includes('url.origin !== self.location.origin'), 'service worker must bypass cross-origin requests');

const webBundle = collectFiles(join(outputRoot, '_expo'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
assert(webBundle.includes('/sw.js'), 'generated JavaScript must register /sw.js');
assert(webBundle.includes('apple-mobile-web-app-capable'), 'generated JavaScript must configure Apple PWA metadata');

console.log('PWA verification passed.');
