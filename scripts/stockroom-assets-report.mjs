#!/usr/bin/env node
/**
 * Writes docs/3d-sources/ASSETS.md: every .glb shipped by the `/admin/3d` stockroom
 * with its size, read from the files themselves — Meshopt and WebP are checked in
 * each GLB's JSON chunk, not taken from the manifests. `--check` also fails on a
 * .glb in the asset folders that no manifest lists.
 *
 *   node scripts/stockroom-assets-report.mjs          # write the report
 *   node scripts/stockroom-assets-report.mjs --check  # exit 1 if a file breaks a rule
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const LIMIT = 2 * 1024 * 1024;
const HASHED = /\.[0-9a-f]{8}\.glb$/;

const DIRS = ['assets/3d/stockroom', 'assets/3d/stockroom-b'];
const manifestKenney = JSON.parse(readFileSync(join(root, 'src', DIRS[0], 'manifest.json'), 'utf8'));
const manifestSketchfab = JSON.parse(readFileSync(join(root, 'src', DIRS[1], 'manifest.json'), 'utf8'));

function inspect(file) {
  const buf = readFileSync(join(root, 'src', file));
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file}: not a GLB`);
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));
  const used = json.extensionsUsed ?? [];
  const images = json.images ?? [];
  const mimes = [...new Set(images.map((i) => i.mimeType ?? 'uri'))];
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  return {
    bytes: buf.length,
    meshopt: used.includes('EXT_meshopt_compression'),
    images: images.length,
    webp: images.length === 0 || (used.includes('EXT_texture_webp') && mimes.every((m) => m === 'image/webp')),
    mimes,
    hashed: HASHED.test(file),
    hashMatches: basename(file).includes(`.${hash}.glb`),
  };
}

const rows = [];
for (const entry of manifestSketchfab) {
  rows.push({ key: entry.key, file: entry.file, source: `Sketchfab (CC BY 4.0) — ${entry.name}, ${entry.author}`, raw: entry.rawBytes, ...inspect(entry.file) });
}
for (const entry of manifestKenney) {
  rows.push({ key: entry.key, file: entry.file, source: `Kenney (CC0) — ${entry.source}`, raw: entry.rawBytes, ...inspect(entry.file) });
}
const listed = new Set(rows.map((r) => r.file));
const orphans = DIRS.flatMap((dir) =>
  readdirSync(join(root, 'src', dir))
    .filter((name) => name.endsWith('.glb'))
    .map((name) => `${dir}/${name}`)
    .filter((file) => !listed.has(file)),
);

const kb = (n) => (n / 1024).toFixed(1);
const yes = (ok) => (ok ? 'sim' : '**não**');
const problems = rows.filter((r) => r.bytes > LIMIT || !r.meshopt || !r.webp || !r.hashed);
const total = rows.reduce((n, r) => n + r.bytes, 0);
const totalRaw = rows.reduce((n, r) => n + (r.raw ?? 0), 0);
const over = rows.filter((r) => r.bytes > LIMIT);
/** Originals are judged by the stricter decimal megabyte. */
const rawOver = rows.filter((r) => (r.raw ?? 0) > 2_000_000);
const biggest = rows.reduce((a, b) => (b.bytes > a.bytes ? b : a));

const lines = [
  '# Arquivos 3D do estoque (`/admin/3d`)',
  '',
  'Gerado por `node scripts/stockroom-assets-report.mjs` a partir dos próprios `.glb` (o script lê o',
  'bloco JSON de cada arquivo: `EXT_meshopt_compression` em `extensionsUsed` e imagens `image/webp`).',
  'Tamanhos em KB = bytes / 1024. Limite por arquivo: 2 MB (2048 KB).',
  '',
  '| Arquivo | Chave | Origem | Original (KB) | Enviado (KB) | Meshopt | Texturas WebP | Nome com hash | > 2 MB |',
  '| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| \`${basename(r.file)}\` | ${r.key} | ${r.source} | ${r.raw ? kb(r.raw) : '—'} | ${kb(r.bytes)} | ${yes(r.meshopt)} | ${r.images ? `${yes(r.webp)} (${r.images})` : 'sem textura'} | ${yes(r.hashed && r.hashMatches)} | ${r.bytes > LIMIT ? '**SIM**' : 'não'} |`,
  ),
  '',
  `- **Cena** (\`/admin/3d\`, padrão; \`?sketchfab=1\` é alias): ${rows.length} arquivos (${manifestSketchfab.length} Sketchfab + ${manifestKenney.length} Kenney: ${manifestKenney.map((e) => e.key).join(', ')}), ${kb(totalRaw)} KB originais → ${kb(total)} KB enviados.`,
  '- A opção A (Kenney, `?cc0=1`) foi removida: seus 6 arquivos exclusivos (estante, caixa, balcão, planta, coluna, caixa registradora) saíram do repositório; `?cc0=1` agora abre esta cena.',
  `- Maior arquivo enviado: \`${basename(biggest.file)}\` com ${kb(biggest.bytes)} KB.`,
  over.length
    ? `- **Acima de 2 MB:** ${over.map((r) => `\`${basename(r.file)}\` (${kb(r.bytes)} KB)`).join(', ')}.`
    : '- Nenhum arquivo enviado passa de 2 MB.',
  rawOver.length
    ? `- Originais acima de 2 MB (decimal) e o que foi feito: ${rawOver.map((r) => `\`${r.key}\` ${r.raw.toLocaleString('pt-BR')} bytes (${(r.raw / 1e6).toFixed(2)} MB / ${(r.raw / LIMIT * 2).toFixed(2)} MiB) → ${kb(r.bytes)} KB com Meshopt + WebP ≤ 1024 px, sem decimação`).join('; ')}.`
    : '- Nenhum original passava de 2 MB.',
  '- O decodificador Meshopt (`GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`, em `src/app/scene-engine/atelier-assets.ts`) só entra no chunk lazy da rota `/admin/3d`, não no bundle principal.',
  '  Conferido com `ng build --configuration production --stats-json`: `meshopt_decoder.module.js` cai num chunk',
  '  compartilhado importado apenas pelos chunks `stockroom-engine` e `scene-engine`, que o `admin-3d-page` carrega',
  '  com `import()`; ele fica fora do grafo inicial (`main` + `polyfills` e seus imports estáticos).',
  '',
];
const out = join(root, 'docs/3d-sources/ASSETS.md');
if (process.argv.includes('--check')) {
  if (problems.length || orphans.length) {
    console.error(problems.map((r) => `${r.file}: ${JSON.stringify(r)}`).join('\n'));
    if (orphans.length) console.error(`not in any manifest: ${orphans.join(', ')}`);
    process.exit(1);
  }
  console.log(`ok — ${rows.length} files`);
} else {
  writeFileSync(out, lines.join('\n'));
  console.log(`wrote ${out} (${rows.length} files, ${problems.length} problems)`);
}
