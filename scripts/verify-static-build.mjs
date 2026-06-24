import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const indexPath = resolve(dist, 'index.html');
if (!existsSync(indexPath)) throw new Error('dist/index.html is missing. Run pnpm build first.');

const html = readFileSync(indexPath, 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (!assetUrls.length) throw new Error('No script or stylesheet assets found in dist/index.html.');

for (const url of assetUrls) {
  if (!url.startsWith('./')) throw new Error(`Static Pages hosts require a relative asset URL, found: ${url}`);
  const file = resolve(dist, url.slice(2));
  if (!existsSync(file)) throw new Error(`Referenced build asset is missing: ${url}`);
}

const manifestPath = resolve(dist, 'manifest.webmanifest');
if (!existsSync(manifestPath)) throw new Error('The installable fullscreen web app manifest is missing.');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.display !== 'fullscreen' || manifest.orientation !== 'landscape') {
  throw new Error('The web app manifest must request landscape fullscreen mode.');
}
if (manifest.start_url !== './' || manifest.scope !== './') {
  throw new Error('The web app manifest must keep start_url and scope relative for static Pages hosts.');
}
for (const icon of manifest.icons ?? []) {
  if (!icon.src?.startsWith('./')) throw new Error(`Manifest icon URL must be relative: ${icon.src}`);
  if (!existsSync(resolve(dist, icon.src.slice(2)))) throw new Error(`Manifest icon is missing: ${icon.src}`);
}

const runtimeDir = resolve(dist, 'assets/models/characters/runtime');
const glbs = existsSync(runtimeDir) ? readdirSync(runtimeDir).filter((file) => file.endsWith('.glb')) : [];
if (glbs.length !== 13) throw new Error(`Expected 13 runtime GLBs in the deployment artifact, found ${glbs.length}.`);
if (glbs.some((file) => !/^[a-z0-9-]+\.glb$/.test(file))) throw new Error('Deployment artifact contains a non-English GLB filename.');
if (existsSync(resolve(dist, 'assets/models/characters/raw'))) throw new Error('Source GLBs must not be included in the public deployment artifact.');

const builtJavaScript = readdirSync(resolve(dist, 'assets'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(resolve(dist, 'assets', file), 'utf8'))
  .join('\n');
if (!builtJavaScript.includes('./assets/models/characters/runtime/')) {
  throw new Error('Runtime GLB URLs were not compiled as relative deployment URLs.');
}
if (/(["'])\/assets\//.test(builtJavaScript)) throw new Error('An absolute /assets/ URL remains in the JavaScript build.');

console.log(`Static Pages build verified: ${assetUrls.length} entry assets, fullscreen manifest, ${glbs.length} runtime GLBs, all URLs relative.`);
