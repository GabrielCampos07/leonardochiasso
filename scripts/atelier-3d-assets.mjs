/**
 * Build hashed atelier 3D assets: Kenney/Poly Haven files + compact generated glTFs.
 * Run: node scripts/atelier-3d-assets.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BoxGeometry,
  BufferAttribute,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/3d');
const srcGlb = '/tmp/3d-src/glb';
const srcHdr = '/tmp/3d-src/hdri';
const srcTex = '/tmp/3d-src/tex512';

mkdirSync(outDir, { recursive: true });

function hash8(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function writeHashed(prefix, ext, buf) {
  const name = `${prefix}.${hash8(buf)}.${ext}`;
  writeFileSync(join(outDir, name), buf);
  return { file: `assets/3d/${name}`, bytes: buf.length, name };
}

function align4(n) {
  return (n + 3) & ~3;
}

function encodeGlb(doc, bin) {
  const json = Buffer.from(JSON.stringify(doc), 'utf8');
  const jsonPad = align4(json.length) - json.length;
  const binPad = align4(bin.length) - bin.length;
  const jsonChunk = json.length + jsonPad;
  const binChunk = bin.length + binPad;
  const total = 12 + 8 + jsonChunk + 8 + binChunk;
  const out = Buffer.alloc(total);
  out.write('glTF', 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonChunk, 12);
  out.write('JSON', 16);
  json.copy(out, 20);
  out.fill(0x20, 20 + json.length, 20 + jsonChunk);
  const binOff = 20 + jsonChunk;
  out.writeUInt32LE(binChunk, binOff);
  out.write('BIN\0', binOff + 4);
  bin.copy(out, binOff + 8);
  return out;
}

function colorOf(hex) {
  return [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

function meshToPrim(geo, materialIndex, buffers) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const idx = geo.index;
  const posBytes = Buffer.from(pos.array.buffer, pos.array.byteOffset, pos.array.byteLength);
  const nrmBytes = Buffer.from(nrm.array.buffer, nrm.array.byteOffset, nrm.array.byteLength);
  const idxArray = idx ? idx.array : Uint32Array.from({ length: pos.count }, (_, i) => i);
  const idxBytes = Buffer.from(idxArray.buffer, idxArray.byteOffset, idxArray.byteLength);

  const posOff = buffers.size;
  buffers.chunks.push(posBytes);
  buffers.size += posBytes.length;
  const nrmOff = buffers.size;
  buffers.chunks.push(nrmBytes);
  buffers.size += nrmBytes.length;
  const idxOff = buffers.size;
  buffers.chunks.push(idxBytes);
  buffers.size += idxBytes.length;

  const posAcc = buffers.accessors.length;
  buffers.accessors.push({
    bufferView: buffers.views.length,
    componentType: 5126,
    count: pos.count,
    type: 'VEC3',
    max: [pos.array[0], pos.array[1], pos.array[2]],
    min: [pos.array[0], pos.array[1], pos.array[2]],
  });
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.array[i * 3];
    const y = pos.array[i * 3 + 1];
    const z = pos.array[i * 3 + 2];
    const a = buffers.accessors[posAcc];
    a.max[0] = Math.max(a.max[0], x);
    a.max[1] = Math.max(a.max[1], y);
    a.max[2] = Math.max(a.max[2], z);
    a.min[0] = Math.min(a.min[0], x);
    a.min[1] = Math.min(a.min[1], y);
    a.min[2] = Math.min(a.min[2], z);
  }
  buffers.views.push({ buffer: 0, byteOffset: posOff, byteLength: posBytes.length, target: 34962 });

  const nrmAcc = buffers.accessors.length;
  buffers.accessors.push({
    bufferView: buffers.views.length,
    componentType: 5126,
    count: nrm.count,
    type: 'VEC3',
  });
  buffers.views.push({ buffer: 0, byteOffset: nrmOff, byteLength: nrmBytes.length, target: 34962 });

  const idxAcc = buffers.accessors.length;
  buffers.accessors.push({
    bufferView: buffers.views.length,
    componentType: idxArray.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
    count: idxArray.length,
    type: 'SCALAR',
  });
  buffers.views.push({ buffer: 0, byteOffset: idxOff, byteLength: idxBytes.length, target: 34963 });

  return {
    attributes: { POSITION: posAcc, NORMAL: nrmAcc },
    indices: idxAcc,
    material: materialIndex,
  };
}

function buildGlb(name, parts, materials) {
  const buffers = { chunks: [], size: 0, views: [], accessors: [] };
  const prims = parts.map((p) => meshToPrim(p.geo, p.material, buffers));
  const bin = Buffer.concat(buffers.chunks);
  const doc = {
    asset: { version: '2.0', generator: 'leonardo-chiasso-atelier' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: prims }],
    materials: materials.map((m) => ({
      name: m.name,
      pbrMetallicRoughness: {
        baseColorFactor: [...colorOf(m.color), 1],
        metallicFactor: m.metal ?? 0,
        roughnessFactor: m.rough ?? 0.5,
      },
    })),
    accessors: buffers.accessors,
    bufferViews: buffers.views,
    buffers: [{ byteLength: bin.length }],
  };
  return encodeGlb(doc, bin);
}

function hangerGlb() {
  const hook = new TorusGeometry(0.05, 0.007, 8, 18, Math.PI * 1.3);
  hook.rotateZ(Math.PI * 0.15);
  hook.translate(0, 0.48, 0);
  const neck = new CylinderGeometry(0.007, 0.007, 0.07, 8);
  neck.translate(0, 0.405, 0);
  const bar = new BoxGeometry(0.34, 0.01, 0.01);
  bar.translate(0, 0.365, 0);
  return buildGlb(
    'hanger',
    [
      { geo: hook, material: 0 },
      { geo: neck, material: 0 },
      { geo: bar, material: 0 },
    ],
    [{ name: 'brass', color: 0xc4b08a, metal: 0.85, rough: 0.28 }],
  );
}

function trayGlb() {
  const stand = new CylinderGeometry(0.03, 0.04, 0.05, 16);
  stand.translate(0, 0.03, 0);
  const tray = new BoxGeometry(0.46, 0.014, 0.36);
  tray.translate(0, 0.06, 0);
  const rim = new BoxGeometry(0.48, 0.01, 0.38);
  rim.translate(0, 0.072, 0);
  return buildGlb(
    'jewelry-tray',
    [
      { geo: stand, material: 0 },
      { geo: tray, material: 0 },
      { geo: rim, material: 1 },
    ],
    [
      { name: 'waxed-wood', color: 0x4a3d32, metal: 0.08, rough: 0.42 },
      { name: 'brass', color: 0xc4b08a, metal: 0.8, rough: 0.3 },
    ],
  );
}

function vitrineGlb() {
  const plinth = new BoxGeometry(1.8, 0.08, 0.64);
  plinth.translate(0, 0, 0);
  const back = new BoxGeometry(1.7, 1.1, 0.03);
  back.translate(0, 0.59, -0.27);
  const left = new BoxGeometry(0.04, 1.1, 0.58);
  left.translate(-0.85, 0.59, 0);
  const right = new BoxGeometry(0.04, 1.1, 0.58);
  right.translate(0.85, 0.59, 0);
  const top = new BoxGeometry(1.78, 0.03, 0.62);
  top.translate(0, 1.16, 0);
  const glass = new BoxGeometry(1.62, 1.02, 0.012);
  glass.translate(0, 0.59, 0.27);
  return buildGlb(
    'vitrine',
    [
      { geo: plinth, material: 0 },
      { geo: back, material: 0 },
      { geo: left, material: 0 },
      { geo: right, material: 0 },
      { geo: top, material: 0 },
      { geo: glass, material: 1 },
    ],
    [
      { name: 'light-wood', color: 0xc8b396, metal: 0.04, rough: 0.48 },
      { name: 'glass', color: 0xf4fbff, metal: 0.04, rough: 0.04 },
    ],
  );
}

function mannequinGlb() {
  const pts = [
    [0.02, 0.0],
    [0.07, 0.04],
    [0.08, 0.18],
    [0.11, 0.42],
    [0.16, 0.72],
    [0.14, 0.96],
    [0.1, 1.12],
    [0.07, 1.22],
    [0.09, 1.34],
    [0.07, 1.46],
    [0.0, 1.52],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new LatheGeometry(pts, 18);
  const neck = new CylinderGeometry(0.035, 0.04, 0.08, 12);
  neck.translate(0, 1.26, 0);
  const head = new SphereGeometry(0.075, 14, 10);
  head.translate(0, 1.4, 0);
  const base = new CylinderGeometry(0.11, 0.14, 0.04, 16);
  base.translate(0, 0.02, 0);
  return buildGlb(
    'mannequin',
    [
      { geo: body, material: 0 },
      { geo: neck, material: 0 },
      { geo: head, material: 0 },
      { geo: base, material: 1 },
    ],
    [
      { name: 'linen', color: 0xd8cfc4, metal: 0.02, rough: 0.72 },
      { name: 'brass', color: 0xc4b08a, metal: 0.8, rough: 0.32 },
    ],
  );
}

const catalog = [];

function addCopy(prefix, ext, path, meta) {
  const buf = readFileSync(path);
  const hashed = writeHashed(prefix, ext, buf);
  catalog.push({ ...hashed, ...meta });
}

addCopy('hdri-studio-small-08-1k', 'hdr', join(srcHdr, 'studio_small_08_1k.hdr'), {
  license: 'CC0',
  author: 'Greg Zaal / Poly Haven',
  url: 'https://polyhaven.com/a/studio_small_08',
  kind: 'hdri',
});
addCopy('tex-wood-floor-diff', 'jpg', join(srcTex, 'wood_floor_diff_1k_512.jpg'), {
  license: 'CC0',
  author: 'Rob Tuytel / Poly Haven',
  url: 'https://polyhaven.com/a/wood_floor',
  kind: 'texture',
});
addCopy('tex-light-wood-diff', 'jpg', join(srcTex, 'wood_cabinet_worn_long_diff_1k_512.jpg'), {
  license: 'CC0',
  author: 'Rob Tuytel / Poly Haven',
  url: 'https://polyhaven.com/a/wood_cabinet_worn_long',
  kind: 'texture',
});
addCopy('tex-plaster-wall-diff', 'jpg', join(srcTex, 'plastered_wall_diff_1k_512.jpg'), {
  license: 'CC0',
  author: 'Rob Tuytel / Poly Haven',
  url: 'https://polyhaven.com/a/plastered_wall',
  kind: 'texture',
});
addCopy('mdl-coat-rack', 'glb', join(srcGlb, 'coatRackStanding.glb'), {
  license: 'CC0',
  author: 'Kenney',
  url: 'https://kenney.nl/assets/furniture-kit',
  kind: 'model',
});
addCopy('mdl-plant-potted', 'glb', join(srcGlb, 'pottedPlant.glb'), {
  license: 'CC0',
  author: 'Kenney',
  url: 'https://kenney.nl/assets/furniture-kit',
  kind: 'model',
});
addCopy('mdl-plant-bush', 'glb', join(srcGlb, 'plantSmall2.glb'), {
  license: 'CC0',
  author: 'Kenney',
  url: 'https://kenney.nl/assets/furniture-kit',
  kind: 'model',
});

for (const [prefix, builder, title] of [
  ['mdl-hanger', hangerGlb, 'Brushed-brass hanger (modeled in code)'],
  ['mdl-jewelry-tray', trayGlb, 'Waxed-wood jewelry tray (modeled in code)'],
  ['mdl-vitrine', vitrineGlb, 'Wood-and-glass vitrine (modeled in code)'],
  ['mdl-mannequin', mannequinGlb, 'Dress-form mannequin (modeled in code)'],
]) {
  const buf = builder();
  const hashed = writeHashed(prefix, 'glb', buf);
  catalog.push({
    ...hashed,
    license: 'CC0',
    author: 'Leonardo Chiasso atelier (modeled in code)',
    url: title,
    kind: 'model',
  });
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(catalog.map((c) => `${c.file} ${(c.bytes / 1024).toFixed(1)}KB`).join('\n'));
const total = catalog.reduce((n, c) => n + c.bytes, 0);
console.log(`TOTAL ${(total / 1024).toFixed(1)} KB`);
