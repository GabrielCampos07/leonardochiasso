import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.ATELIER_URL || 'http://127.0.0.1:4200';
const OUT = process.env.ATELIER_OUT || '/opt/cursor/artifacts';
mkdirSync(OUT, { recursive: true });

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const allLogs = [];

function attachConsole(page, label, bucket) {
  page.on('console', (msg) => {
    const text = msg.text();
    const row = { label, type: msg.type(), text };
    bucket.push(row);
    allLogs.push(row);
    if (text.includes('[admin-3d]') || text.includes('WebGL') || msg.type() === 'error') {
      console.log(`[${label}] ${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (err) => {
    const row = { label, type: 'pageerror', text: String(err) };
    bucket.push(row);
    allLogs.push(row);
    console.log(`[${label}] pageerror: ${err}`);
  });
}

async function interceptAdmin(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/admin/auth/me') || url.includes('/api/admin/auth/login')) {
      void req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ email: 'admin@local', role: 'admin' }),
      });
      return;
    }
    void req.continue();
  });
}

async function waitAtelier(page) {
  await page.waitForSelector('canvas.admin-3d__canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const boot = document.querySelector('.admin-3d__boot');
      return !boot || boot.classList.contains('is-out');
    },
    { timeout: 25000 },
  );
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas.admin-3d__canvas');
      return canvas && canvas.width > 8 && canvas.height > 8;
    },
    { timeout: 10000 },
  );
  await new Promise((r) => setTimeout(r, 700));
}

async function dismissHint(page) {
  const btn = await page.$('.admin-3d__hint-dismiss');
  if (btn) await btn.click();
}

async function focusNiponic(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.admin-3d__rack')].some((el) =>
        (el.textContent || '').includes('Niponic'),
      ),
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('.admin-3d__rack')].find((el) =>
      (el.textContent || '').includes('Niponic'),
    );
    tab?.click();
  });
  await page.waitForFunction(
    () => {
      const on = document.querySelector('.admin-3d__rack.is-on');
      return Boolean(on && (on.textContent || '').includes('Niponic'));
    },
    { timeout: 8000 },
  );
  await new Promise((r) => setTimeout(r, 1100));
}

function pickLog(bucket, needle) {
  return bucket.find((l) => l.text.includes(needle))?.text ?? null;
}

async function capture(name, viewport) {
  const bucket = [];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      `--window-size=${viewport.width},${viewport.height}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  attachConsole(page, name, bucket);
  await interceptAdmin(page);
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.setItem('lc-admin-session', '1');
      sessionStorage.setItem('lc-admin-edit-mode', '1');
      localStorage.setItem('lc.admin.3d.mock', '1');
    } catch {
      /* ignore */
    }
  });
  const started = Date.now();
  await page.goto(`${BASE}/admin/3d?mock=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitAtelier(page);
  await dismissHint(page);
  await focusNiponic(page);
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, type: 'png', fullPage: false });
  const elapsed = Date.now() - started;
  await browser.close();
  return {
    name,
    path,
    elapsed,
    ttff: pickLog(bucket, 'time-to-first-frame'),
    complete: pickLog(bucket, 'scene-complete'),
    viewport,
  };
}

const results = [];
results.push(await capture('atelier-desktop-1440x900', { width: 1440, height: 900 }));
results.push(await capture('atelier-mobile-390x844', { width: 390, height: 844 }));
results.push(await capture('atelier-desktop-esgotado-1440x900', { width: 1440, height: 900 }));

writeFileSync(`${OUT}/atelier-3d-capture.json`, JSON.stringify({ results, logs: allLogs }, null, 2));
console.log(JSON.stringify(results, null, 2));
