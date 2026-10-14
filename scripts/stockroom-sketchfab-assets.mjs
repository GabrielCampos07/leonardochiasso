/**
 * Build the option B (`?sketchfab=1`) stockroom assets from the Sketchfab CC-BY
 * downloads (`sketchfab-b.zip`: one folder per model with `model.glb` + `meta.json`).
 * Checks every licence against the verified list, trims unused parts, runs
 * gltf-transform (Meshopt geometry + WebP textures ≤ 1024 px), writes
 * content-hashed GLBs, the manifest and the TypeScript asset + credits map.
 *
 * Run: node scripts/stockroom-sketchfab-assets.mjs <sketchfab-b.zip | unpacked dir>
 * Needs: unzip, npm (installs @gltf-transform 4.5.1 into the temp dir once).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GLTF_VERSION = '4.5.1';
const GLTF_TRANSFORM = `@gltf-transform/cli@${GLTF_VERSION}`;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/3d/stockroom-b');
const tsOut = join(root, 'src/app/scene-engine/stockroom/stockroom-b-assets.ts');
const cacheDir = join(tmpdir(), 'lc-sketchfab');
const CC_BY = 'http://creativecommons.org/licenses/by/4.0/';

/**
 * Verified in phase 1 (docs/3d-sources/FONTES.md, screenshots in licencas/):
 * CC Attribution 4.0, downloadable, no NoAI tag, no NC/ND/editorial wording.
 * key → [zip folder, Sketchfab uid, author profile, trim].
 */
const MODELS = {
  rail: ['clothes-rack-with-hanger', '443cffc140bc403e975ca806192970b0', 'https://sketchfab.com/neverfollow81', 'rail'],
  hanger: ['hangers-and-tee-shirt', '44e260855c7f4c1ca611af8d2370195a', 'https://sketchfab.com/dudecon', 'hanger'],
  mannequin: ['store-mannequin', 'a404eb4a7297442d8168004cae1568ee', 'https://sketchfab.com/ainarchi', null],
  counter: ['store-counter', 'c160eb255df34ad581c62b4dbc1ba9f8', 'https://sketchfab.com/VoidLance', null],
  register: ['caisse-enregistreuse', '4d64359fffbe421c8b6ff8a1d852b607', 'https://sketchfab.com/codepromo', null],
  display: ['shelves-display-2x2', '35a6444fd88b4697b770b95663c5c49f', 'https://sketchfab.com/Wans.Setiabudi', 'display'],
  plantLeaf: ['potted-plant-mediterranean-med-leaf-low-poly', 'bc7f26baef2a45d18dbd9a5d6d2ec565', 'https://sketchfab.com/dudecon', null],
  plantFlower: ['potted-plant-mediterranean-flowering-low-poly', 'b8950690664342a497154a8ad2787566', 'https://sketchfab.com/dudecon', null],
};

/** What each trim drops, for the Créditos "modificado" note (UI copy, pt-BR). */
const COMPRESS_NOTE = 'geometria comprimida (Meshopt), texturas WebP ≤ 1024 px';
const TRIM_NOTES = {
  rail: 'mantido só um dos dois acabamentos; cabide de arame removido',
  hanger: 'mantido só o cabide de madeira (outros cabides e a camiseta removidos)',
  display: 'base de piso removida',
};

const OPTIMIZE_FLAGS = [
  '--compress', 'meshopt',
  '--texture-compress', 'webp',
  '--texture-size', '1024',
  '--simplify', 'false',
  '--instance', 'false',
  '--palette', 'false',
  '--join', 'false',
  '--flatten', 'false',
];

function hash8(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function sourceDir(input) {
  if (!input) throw new Error('usage: node scripts/stockroom-sketchfab-assets.mjs <sketchfab-b.zip | dir>');
  const path = resolve(input);
  if (statSync(path).isDirectory()) return existsSync(join(path, 'sketchfab-b')) ? join(path, 'sketchfab-b') : path;
  const dir = join(cacheDir, 'src');
  mkdirSync(dir, { recursive: true });
  execFileSync('unzip', ['-oq', path, '-d', dir], { stdio: 'inherit' });
  return existsSync(join(dir, 'sketchfab-b')) ? join(dir, 'sketchfab-b') : dir;
}

async function gltfApi() {
  const tools = join(cacheDir, 'tools');
  const pkgs = ['core', 'extensions', 'functions'].map((p) => `@gltf-transform/${p}@${GLTF_VERSION}`);
  if (!existsSync(join(tools, 'node_modules/@gltf-transform/functions'))) {
    mkdirSync(tools, { recursive: true });
    writeFileSync(join(tools, 'package.json'), '{"private":true}\n');
    execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', '--prefix', tools, ...pkgs], { stdio: 'inherit' });
  }
  const req = createRequire(join(tools, 'package.json'));
  const load = (name) => import(pathToFileURL(req.resolve(name)).href);
  const [core, extensions, functions] = await Promise.all(
    ['@gltf-transform/core', '@gltf-transform/extensions', '@gltf-transform/functions'].map(load),
  );
  return { core, extensions, functions };
}

function gltfTransform(args) {
  execFileSync('npx', ['--yes', GLTF_TRANSFORM, ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
}

function readMeta(dir, key, uid) {
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  const problems = [];
  if (meta.uid !== uid) problems.push(`uid ${meta.uid} ≠ verified ${uid}`);
  if (meta.license?.slug !== 'by') problems.push(`licence slug "${meta.license?.slug}" is not CC-BY`);
  if (meta.license?.url !== CC_BY) problems.push(`licence url ${meta.license?.url}`);
  if (!String(meta.viewerUrl ?? '').endsWith(uid)) problems.push(`viewerUrl ${meta.viewerUrl}`);
  if (problems.length) throw new Error(`${key}: ${problems.join('; ')}`);
  return meta;
}

/** Drop whole triangles of a primitive where `keep(firstVertexIndex)` is false. */
function filterTriangles(functions, prim, keep) {
  const indices = prim.getIndices();
  const kept = [];
  for (let t = 0; t < indices.getCount(); t += 3) {
    const ia = indices.getScalar(t);
    if (keep(ia)) kept.push(ia, indices.getScalar(t + 1), indices.getScalar(t + 2));
  }
  indices.setArray(new Uint32Array(kept));
  functions.compactPrimitive(prim);
}

/** Group triangles into vertex-connected parts; returns per-triangle part id and part boxes. */
function triangleParts(prim) {
  const pos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  const parent = Array.from({ length: pos.getCount() }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let t = 0; t < indices.getCount(); t += 3) {
    const r = find(indices.getScalar(t));
    parent[find(indices.getScalar(t + 1))] = r;
    parent[find(indices.getScalar(t + 2))] = r;
  }
  const boxes = new Map();
  const v = [];
  for (let i = 0; i < pos.getCount(); i += 1) {
    const r = find(i);
    pos.getElement(i, v);
    const box = boxes.get(r) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let d = 0; d < 3; d += 1) {
      box.min[d] = Math.min(box.min[d], v[d]);
      box.max[d] = Math.max(box.max[d], v[d]);
    }
    boxes.set(r, box);
  }
  return { find, boxes };
}

const TRIMS = {
  /**
   * The download holds the wall rail twice (dark wood at x < 0, marble at x > 0),
   * each with a loose wire hanger below the rod. Keep the dark rail only and turn
   * it so the rod runs along +X with the wall bracket at −Z.
   */
  rail(doc, { functions }) {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const { find, boxes } = triangleParts(prim);
        filterTriangles(functions, prim, (i) => {
          const part = boxes.get(find(i));
          return part.max[0] < 0 && part.min[1] > -0.1;
        });
      }
    }
    // Rotate −90° about Y: (x, y, z) → (−z, y, x). Wall side (x = −1) ends up at z = −1.
    const matrix = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1];
    for (const mesh of doc.getRoot().listMeshes()) functions.transformMesh(mesh, matrix);
  },
  /** Five hangers + a tee-shirt: keep the wooden hanger. */
  hanger(doc) {
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const materials = mesh.listPrimitives().map((p) => p.getMaterial()?.getName());
      if (!materials.includes('Wood')) node.dispose();
    }
  },
  /** The display ships with its own floor tiles; the scene has a floor. */
  display(doc) {
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const materials = mesh.listPrimitives().map((p) => p.getMaterial()?.getName());
      if (materials.some((m) => m === 'Tile_Che' || m === 'FrontCol')) node.dispose();
    }
  },
};

const api = await gltfApi();
const { NodeIO } = api.core;
const io = new NodeIO().registerExtensions(api.extensions.ALL_EXTENSIONS);
const src = sourceDir(process.argv[2]);

mkdirSync(outDir, { recursive: true });
for (const name of readdirSync(outDir)) {
  if (name.endsWith('.glb')) unlinkSync(join(outDir, name));
}
const work = join(cacheDir, 'work');
mkdirSync(work, { recursive: true });

const found = readdirSync(src).filter((d) => existsSync(join(src, d, 'meta.json')));
const expected = new Set(Object.values(MODELS).map(([folder]) => folder));
const extra = found.filter((d) => !expected.has(d));
if (extra.length) throw new Error(`unverified models in the download: ${extra.join(', ')}`);

const manifest = [];
const assetMap = {};
for (const [key, [folder, uid, profile, trim]] of Object.entries(MODELS)) {
  const dir = join(src, folder);
  const meta = readMeta(dir, key, uid);
  const rawPath = join(dir, 'model.glb');
  const doc = await io.read(rawPath);
  if (trim) TRIMS[trim](doc, api);
  await doc.transform(api.functions.flatten());
  for (const node of doc.getRoot().listNodes()) api.functions.clearNodeTransform(node);
  await doc.transform(api.functions.prune());
  const trimmed = join(work, `${key}.trim.glb`);
  const packed = join(work, `${key}.glb`);
  await io.write(trimmed, doc);
  gltfTransform(['optimize', trimmed, packed, ...OPTIMIZE_FLAGS]);
  const buf = readFileSync(packed);
  const name = `sketchfab-${folder}.${hash8(buf)}.glb`;
  writeFileSync(join(outDir, name), buf);
  assetMap[key] = `assets/3d/stockroom-b/${name}`;
  manifest.push({
    key,
    file: `assets/3d/stockroom-b/${name}`,
    bytes: buf.length,
    rawBytes: statSync(rawPath).size,
    name: meta.name,
    url: meta.viewerUrl,
    uid,
    author: meta.user.displayName,
    authorUrl: profile,
    license: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    modified: [COMPRESS_NOTE, TRIM_NOTES[trim]].filter(Boolean).join('; '),
  });
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const assetLines = Object.entries(assetMap).map(([key, url]) => `  ${key}: ${q(url)},`);
const creditLines = manifest.map(
  (m) =>
    `  { key: ${q(m.key)}, name: ${q(m.name)}, url: ${q(m.url)}, author: ${q(m.author)}, authorUrl: ${q(m.authorUrl)}, ` +
    `license: 'CC BY 4.0', licenseUrl: ${q(m.licenseUrl)}, modified: ${q(m.modified)} },`,
);
writeFileSync(
  tsOut,
  [
    '/** Generated by `scripts/stockroom-sketchfab-assets.mjs`. Hashed names — safe to cache forever. */',
    'export const STOCKROOM_B_ASSETS = {',
    ...assetLines,
    '} as const;',
    '',
    'export type StockroomBAssetId = keyof typeof STOCKROOM_B_ASSETS;',
    '',
    'export interface StockroomCredit {',
    '  key: string;',
    '  name: string;',
    '  url: string;',
    '  author: string;',
    '  authorUrl: string;',
    '  license: string;',
    '  licenseUrl: string;',
    '  modified: string;',
    '}',
    '',
    '/** Sketchfab CC-BY 4.0 models in option B, from each download\'s `meta.json`. */',
    'export const STOCKROOM_B_CREDITS: readonly StockroomCredit[] = [',
    ...creditLines,
    '];',
    '',
  ].join('\n'),
);

const total = manifest.reduce((n, m) => n + m.bytes, 0);
const rawTotal = manifest.reduce((n, m) => n + m.rawBytes, 0);
for (const m of manifest) console.log(`${m.file}  ${(m.bytes / 1024).toFixed(1)} KB  (raw ${(m.rawBytes / 1024).toFixed(1)} KB)`);
console.log(`total ${(total / 1024).toFixed(1)} KB (raw ${(rawTotal / 1024).toFixed(1)} KB)`);
