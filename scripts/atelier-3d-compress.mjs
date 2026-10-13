/**
 * Downsample HDRI to 512, rebuild dress-form/plant glTFs, Meshopt-compress GLBs.
 * Run: node scripts/atelier-3d-compress.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { FloatType } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptEncoder } from 'meshoptimizer';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, meshopt } from '@gltf-transform/functions';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/3d');
const srcHdr = '/tmp/3d-src/hdri/studio_small_08_1k.hdr';
mkdirSync(outDir, { recursive: true });

function hash8(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function writeHashed(prefix, ext, buf) {
  const name = `${prefix}.${hash8(buf)}.${ext}`;
  writeFileSync(join(outDir, name), buf);
  return { file: `assets/3d/${name}`, bytes: buf.length, name };
}

function removePrefix(prefix) {
  for (const name of readdirSync(outDir)) {
    if (name.startsWith(prefix + '.') || name.startsWith(prefix + '-')) {
      unlinkSync(join(outDir, name));
    }
  }
}

function floatToRgbe(r, g, b) {
  const v = Math.max(r, g, b);
  if (v < 1e-32) return [0, 0, 0, 0];
  const exp = Math.ceil(Math.log2(v));
  const scale = Math.pow(2, exp);
  return [
    Math.min(255, Math.floor((r / scale) * 256)),
    Math.min(255, Math.floor((g / scale) * 256)),
    Math.min(255, Math.floor((b / scale) * 256)),
    exp + 128,
  ];
}

function writeRleChannel(out, channel) {
  let i = 0;
  while (i < channel.length) {
    let run = 1;
    while (i + run < channel.length && channel[i + run] === channel[i] && run < 127) run += 1;
    if (run >= 4) {
      out.push(128 + run, channel[i]);
      i += run;
      continue;
    }
    const start = i;
    let lit = 0;
    while (i < channel.length && lit < 128) {
      let peek = 1;
      while (i + peek < channel.length && channel[i + peek] === channel[i] && peek < 4) peek += 1;
      if (peek >= 4) break;
      i += 1;
      lit += 1;
    }
    out.push(lit, ...channel.slice(start, start + lit));
  }
}

function writeRgbe(width, height, rgba) {
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nGAMMA=1\nEXPOSURE=1\n\n-Y ${height} +X ${width}\n`;
  const body = [];
  for (let y = 0; y < height; y += 1) {
    body.push(2, 2, (width >> 8) & 255, width & 255);
    const ch = [[], [], [], []];
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b, e] = floatToRgbe(rgba[i], rgba[i + 1], rgba[i + 2]);
      ch[0].push(r);
      ch[1].push(g);
      ch[2].push(b);
      ch[3].push(e);
    }
    for (const channel of ch) writeRleChannel(body, channel);
  }
  return Buffer.concat([Buffer.from(header, 'ascii'), Buffer.from(body)]);
}

function downsampleHdr() {
  const loader = new HDRLoader();
  loader.type = FloatType;
  const raw = readFileSync(srcHdr);
  const tex = loader.parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const srcW = tex.width;
  const srcH = tex.height;
  const src = tex.data;
  const dstW = 512;
  const dstH = 256;
  const dst = new Float32Array(dstW * dstH * 4);
  const stepX = srcW / dstW;
  const stepY = srcH / dstH;
  for (let y = 0; y < dstH; y += 1) {
    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.min(srcW - 1, Math.floor((x + 0.5) * stepX));
      const sy = Math.min(srcH - 1, Math.floor((y + 0.5) * stepY));
      const si = (sy * srcW + sx) * 4;
      const di = (y * dstW + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = 1;
    }
  }
  return writeRgbe(dstW, dstH, dst);
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
  buffers.accessors.push({ bufferView: buffers.views.length, componentType: 5126, count: nrm.count, type: 'VEC3' });
  buffers.views.push({ buffer: 0, byteOffset: nrmOff, byteLength: nrmBytes.length, target: 34962 });
  buffers.accessors.push({
    bufferView: buffers.views.length,
    componentType: idxArray.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
    count: idxArray.length,
    type: 'SCALAR',
  });
  buffers.views.push({ buffer: 0, byteOffset: idxOff, byteLength: idxBytes.length, target: 34963 });
  return {
    attributes: { POSITION: posAcc, NORMAL: posAcc + 1 },
    indices: posAcc + 2,
    material: materialIndex,
  };
}

function buildGlb(name, parts, materials) {
  const buffers = { chunks: [], size: 0, views: [], accessors: [] };
  const prims = parts.map((p) => meshToPrim(p.geo, p.material, buffers));
  const bin = Buffer.concat(buffers.chunks);
  return encodeGlb(
    {
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
    },
    bin,
  );
}

function mannequinGlb() {
  const pts = [
    [0.0, 0.4],
    [0.1, 0.42],
    [0.122, 0.56],
    [0.152, 0.74],
    [0.118, 0.94],
    [0.148, 1.1],
    [0.158, 1.2],
    [0.132, 1.28],
    [0.052, 1.34],
    [0.046, 1.42],
    [0.0, 1.44],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new LatheGeometry(pts, 48);
  const neck = new CylinderGeometry(0.042, 0.048, 0.06, 24);
  neck.translate(0, 1.41, 0);
  const cap = new SphereGeometry(0.046, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, 1.44, 0);
  const pole = new CylinderGeometry(0.011, 0.011, 1.4, 12);
  pole.translate(0, 0.7, 0);
  const base = new CylinderGeometry(0.155, 0.17, 0.036, 28);
  base.translate(0, 0.018, 0);
  const ring = new TorusGeometry(0.132, 0.008, 8, 24);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.038, 0);
  return buildGlb(
    'mannequin',
    [
      { geo: body, material: 0 },
      { geo: neck, material: 0 },
      { geo: cap, material: 0 },
      { geo: pole, material: 1 },
      { geo: base, material: 1 },
      { geo: ring, material: 1 },
    ],
    [
      { name: 'linen', color: 0xe4dcd2, metal: 0.02, rough: 0.58 },
      { name: 'brass', color: 0xc4b08a, metal: 0.86, rough: 0.26 },
    ],
  );
}

function plantGlb() {
  const potPts = [
    [0.09, 0],
    [0.11, 0.02],
    [0.12, 0.14],
    [0.135, 0.22],
    [0.128, 0.24],
  ].map(([x, y]) => new Vector2(x, y));
  const pot = new LatheGeometry(potPts, 24);
  const dirt = new SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dirt.translate(0, 0.23, 0);
  const trunk = new CylinderGeometry(0.012, 0.018, 0.28, 8);
  trunk.translate(0, 0.38, 0);
  const a = new IcosahedronGeometry(0.2, 1);
  a.translate(0, 0.72, 0);
  const b = new IcosahedronGeometry(0.15, 1);
  b.translate(-0.1, 0.62, 0.06);
  const c = new IcosahedronGeometry(0.14, 1);
  c.translate(0.11, 0.64, -0.04);
  return buildGlb(
    'plant',
    [
      { geo: pot, material: 0 },
      { geo: dirt, material: 1 },
      { geo: trunk, material: 1 },
      { geo: a, material: 2 },
      { geo: b, material: 2 },
      { geo: c, material: 2 },
    ],
    [
      { name: 'terracotta', color: 0xb88768, metal: 0.04, rough: 0.62 },
      { name: 'soil', color: 0x3a2c22, metal: 0, rough: 0.95 },
      { name: 'leaf', color: 0x4f6a4a, metal: 0.02, rough: 0.48 },
    ],
  );
}

async function meshoptGlb(buf) {
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
  });
  const doc = await io.readBinary(new Uint8Array(buf));
  await doc.transform(dedup(), prune(), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return Buffer.from(await io.writeBinary(doc));
}

const catalog = [];

removePrefix('hdri-studio-small-08');
const hdr = downsampleHdr();
catalog.push({
  ...writeHashed('hdri-studio-small-08-512', 'hdr', hdr),
  license: 'CC0',
  author: 'Greg Zaal / Poly Haven',
  url: 'https://polyhaven.com/a/studio_small_08',
  kind: 'hdri',
  note: '512×256 RGBE downsample of the 1k original',
});

removePrefix('mdl-mannequin');
removePrefix('mdl-plant-potted');
removePrefix('mdl-plant-bush');
removePrefix('mdl-coat-rack');

for (const [prefix, builder, meta] of [
  [
    'mdl-mannequin',
    mannequinGlb,
    {
      license: 'CC0',
      author: 'Leonardo Chiasso atelier (modeled in code)',
      url: 'Dress-form mannequin with brass stand',
    },
  ],
  [
    'mdl-plant-potted',
    plantGlb,
    {
      license: 'CC0',
      author: 'Leonardo Chiasso atelier (modeled in code)',
      url: 'Ficus-style potted plant',
    },
  ],
]) {
  const raw = builder();
  const packed = await meshoptGlb(raw);
  catalog.push({ ...writeHashed(prefix, 'glb', packed), ...meta, kind: 'model', compressed: 'meshopt' });
}

for (const prefix of ['mdl-hanger', 'mdl-jewelry-tray', 'mdl-vitrine']) {
  const existing = readdirSync(outDir).find((n) => n.startsWith(prefix + '.') && n.endsWith('.glb'));
  if (!existing) continue;
  const raw = readFileSync(join(outDir, existing));
  const packed = await meshoptGlb(raw);
  unlinkSync(join(outDir, existing));
  catalog.push({
    ...writeHashed(prefix, 'glb', packed),
    license: 'CC0',
    author: 'Leonardo Chiasso atelier (modeled in code)',
    url: prefix,
    kind: 'model',
    compressed: 'meshopt',
  });
}

for (const name of readdirSync(outDir)) {
  if (!name.endsWith('.jpg') && !name.endsWith('.ktx2')) continue;
  const buf = readFileSync(join(outDir, name));
  catalog.push({
    file: `assets/3d/${name}`,
    bytes: buf.length,
    name,
    license: 'CC0',
    author: 'Rob Tuytel / Poly Haven',
    kind: 'texture',
  });
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(catalog.map((c) => `${c.file} ${(c.bytes / 1024).toFixed(1)}KB ${c.compressed || ''}`).join('\n'));
console.log(`TOTAL ${(catalog.reduce((n, c) => n + c.bytes, 0) / 1024).toFixed(1)} KB`);
