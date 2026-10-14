import { STOCKROOM_B_ASSETS, STOCKROOM_B_CREDITS } from './stockroom-b-assets';
import {
  CARD_DROP,
  CARD_H,
  CARD_W,
  RAIL_LEN,
  ROD_Y,
  SKETCHFAB_BAY,
  SKETCHFAB_KIT,
} from './stockroom-kit-sketchfab';
import { areaFocusBox, columnOffset, planStockroom, slotsPerBay, type StockroomUnitInput } from './stockroom-layout';

function unit(id: string, pieces: number): StockroomUnitInput {
  return { id, name: id, hangers: Array.from({ length: pieces }, (_, i) => ({ slug: `${id}-${i}` })) };
}

const HASHED_GLB = /^assets\/3d\/stockroom(-b)?\/[A-Za-z0-9-]+\.[0-9a-f]{8}\.glb$/;

describe('stockroom kit (Sketchfab)', () => {
  it('hangs six pieces per bay: three on each of two rails', () => {
    expect(SKETCHFAB_BAY.perLevel).toBe(3);
    expect(SKETCHFAB_BAY.levelY.length).toBe(2);
    expect(slotsPerBay(SKETCHFAB_BAY)).toBe(6);
  });

  it('fits three cards on one rail and the rail inside its bay', () => {
    const outer = columnOffset(SKETCHFAB_BAY.perLevel - 1, SKETCHFAB_BAY) + CARD_W / 2;
    expect(outer * 2).toBeLessThanOrEqual(RAIL_LEN + 1e-9);
    expect(RAIL_LEN).toBeLessThan(SKETCHFAB_BAY.width);
    expect(SKETCHFAB_BAY.columnPitch).toBeGreaterThan(CARD_W);
  });

  it('keeps the top rail cards clear of the lower rail and every card off the floor', () => {
    const upperBottom = ROD_Y[0] - CARD_DROP - CARD_H / 2;
    // The lower rail's shelf board rises ~0.16 above its rod.
    expect(upperBottom - ROD_Y[1]).toBeGreaterThan(0.2);
    const lowerBottom = ROD_Y[1] - CARD_DROP - CARD_H / 2;
    expect(lowerBottom).toBeGreaterThan(0.5);
    expect(ROD_Y[0] + 0.2).toBeLessThan(SKETCHFAB_BAY.height);
  });

  it('shows the photo large at the 4:5 bitmap aspect with the badge across its foot', () => {
    expect(SKETCHFAB_KIT.photo.w / SKETCHFAB_KIT.photo.h).toBeCloseTo(0.8, 5);
    expect(SKETCHFAB_KIT.photo.w).toBeGreaterThan(CARD_W * 0.85);
    expect(SKETCHFAB_KIT.badge.h).toBeLessThan(SKETCHFAB_KIT.photo.h / 3);
    expect(SKETCHFAB_KIT.badge.z).toBeGreaterThan(SKETCHFAB_KIT.photo.z);
  });

  it('places pieces on their rail and frames an area from just under the lower cards', () => {
    const area = planStockroom([unit('a', 8)], SKETCHFAB_BAY).areas[0];
    expect(area.bayX.length).toBe(2);
    for (const slot of area.slots) {
      expect(slot.y).toBeCloseTo(ROD_Y[slot.level] - CARD_DROP, 5);
      expect(Math.abs(slot.x - area.bayX[slot.bay]) + CARD_W / 2).toBeLessThanOrEqual(RAIL_LEN / 2 + 1e-9);
      expect(slot.z).toBeLessThan(area.bayFrontZ);
    }
    const box = areaFocusBox(area, SKETCHFAB_BAY);
    expect(box.min[1]).toBe(SKETCHFAB_BAY.focusMinY!);
    expect(box.min[1]).toBeLessThan(ROD_Y[1] - CARD_DROP - CARD_H / 2);
  });

  it('loads every Sketchfab model plus the Kenney CC0 floor, walls and rug, all content-hashed', () => {
    const ids = Object.keys(SKETCHFAB_KIT.assets);
    for (const id of ['floor', 'wall', 'wallWindow', 'rug', ...Object.keys(STOCKROOM_B_ASSETS)]) {
      expect(ids).toContain(id);
    }
    for (const url of Object.values(SKETCHFAB_KIT.assets)) expect(url).toMatch(HASHED_GLB);
    for (const url of Object.values(STOCKROOM_B_ASSETS)) expect(url).toContain('assets/3d/stockroom-b/sketchfab-');
  });

  it('credits every Sketchfab model with author, source and the CC BY 4.0 licence', () => {
    expect(STOCKROOM_B_CREDITS.map((c) => c.key).sort()).toEqual(Object.keys(STOCKROOM_B_ASSETS).sort());
    for (const credit of STOCKROOM_B_CREDITS) {
      expect(credit.url).toMatch(/^https:\/\/sketchfab\.com\/3d-models\/[a-z0-9-]+-[0-9a-f]{32}$/);
      expect(credit.authorUrl).toMatch(/^https:\/\/sketchfab\.com\/[^/]+$/);
      expect(credit.author.trim()).not.toBe('');
      expect(credit.license).toBe('CC BY 4.0');
      expect(credit.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(credit.modified).toContain('Meshopt');
    }
  });
});

describe('stockroom asset budget', () => {
  interface ManifestRow {
    key: string;
    file: string;
    bytes: number;
  }

  async function manifest(path: string): Promise<ManifestRow[]> {
    const res = await fetch(path);
    expect(res.ok).withContext(path).toBeTrue();
    return (await res.json()) as ManifestRow[];
  }

  it('ships the whole scene under 5 MB of models', async () => {
    const own = await manifest('assets/3d/stockroom-b/manifest.json');
    const shared = await manifest('assets/3d/stockroom/manifest.json');
    const urls = new Set(Object.values(SKETCHFAB_KIT.assets));
    const rows = [...own, ...shared].filter((row) => urls.has(row.file));
    expect(rows.length).toBe(urls.size);
    const total = rows.reduce((sum, row) => sum + row.bytes, 0);
    expect(total).toBeLessThan(5_000_000);
  });

  it('ships only Kenney files the scene loads', async () => {
    const urls = new Set(Object.values(SKETCHFAB_KIT.assets));
    const shared = await manifest('assets/3d/stockroom/manifest.json');
    expect(shared.map((row) => row.key).sort()).toEqual(['floor', 'rug', 'wall', 'wallWindow']);
    for (const row of shared) expect(urls.has(row.file)).withContext(row.file).toBeTrue();
  });
});
