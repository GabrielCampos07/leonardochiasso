import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.ATELIER_SHOT_DIR || '/opt/cursor/artifacts';
fs.mkdirSync(dir, { recursive: true });

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-shot-name, content-type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(404);
    res.end();
    return;
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    const name = String(req.headers['x-shot-name'] || 'shot').replace(/[^a-z0-9._-]/gi, '');
    const b64 = raw.replace(/^data:image\/png;base64,/, '');
    const file = path.join(dir, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(file);
  });
});

server.listen(9877, '127.0.0.1', () => {
  process.stdout.write('atelier-shot-server 9877\n');
});
