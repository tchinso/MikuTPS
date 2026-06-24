import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registry = JSON.parse(readFileSync(resolve('assets-source/asset-provenance.json'), 'utf8'));
const issues = [];
const pendingSources = [];
const allowedStatuses = new Set(['verified', 'user-attested']);

for (const asset of registry.assets) {
  const sourcePath = resolve('assets-source/characters', asset.fileName);
  const runtimePath = resolve('public/assets/models/characters/runtime', asset.fileName);
  if (!existsSync(sourcePath) || !existsSync(runtimePath)) issues.push(`${asset.fileName}: source/runtime file missing`);
  else {
    const hash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex').toUpperCase();
    if (hash !== asset.sha256) issues.push(`${asset.fileName}: source hash mismatch`);
  }
  if (!allowedStatuses.has(asset.licenseStatus) || !asset.licenseEvidence) issues.push(`${asset.fileName}: rights status incomplete`);
  if (!asset.sourceUrl) pendingSources.push(asset.fileName);
}

if (issues.length) {
  console.error(`Release audit failed with ${issues.length} issue(s):\n- ${issues.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Release audit passed: ${registry.assets.length} model rights records and hashes are valid.`);
  if (pendingSources.length) console.log(`README attribution URLs pending by user choice: ${pendingSources.length} model(s).`);
}
