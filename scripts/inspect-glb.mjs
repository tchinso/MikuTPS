import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const directory = resolve(process.argv[2] ?? 'assets-source/characters');
const files = readdirSync(directory).filter((file) => file.endsWith('.glb')).sort();

function readJsonChunk(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('utf8', 0, 4) !== 'glTF') throw new Error(`${path}: not a GLB file`);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) return JSON.parse(bytes.toString('utf8', offset, offset + length).replace(/\0+$/g, '').trim());
    offset += length;
  }
  throw new Error(`${path}: JSON chunk not found`);
}

const report = files.map((file) => {
  const json = readJsonChunk(resolve(directory, file));
  const joints = new Set((json.skins ?? []).flatMap((skin) => skin.joints ?? []));
  const jointNames = [...joints].map((index) => json.nodes?.[index]?.name ?? `node-${index}`);
  const socketCandidates = (json.nodes ?? []).map((node) => node.name ?? '').filter((name) => /hand|weapon|gun|wrist/i.test(name));
  return {
    fileName: basename(file),
    generator: json.asset?.generator ?? 'unknown',
    scenes: json.scenes?.length ?? 0,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    skins: json.skins?.length ?? 0,
    joints: joints.size,
    animations: (json.animations ?? []).map((animation, index) => animation.name ?? `animation-${index}`),
    socketCandidates: socketCandidates.slice(0, 12),
    rootJoints: jointNames.slice(0, 12)
  };
});

console.log(JSON.stringify(report, null, 2));
