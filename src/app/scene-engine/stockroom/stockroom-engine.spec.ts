import { OVERVIEW_FOCUS_ID } from '../camera-guide';
import type { SceneHanger, SceneLayout } from '../types';
import { DRAFT_UNIT_ID } from '../unit-layout';
import { StockroomEngine, compactPrice, createStockroomEngine, upsertHanger } from './stockroom-engine';
import { SKETCHFAB_KIT } from './stockroom-kit-sketchfab';

function hanger(rackId: string, j: number, extra: Partial<SceneHanger> = {}): SceneHanger {
  return {
    productId: `${rackId}-${j}`,
    slug: `${rackId}-${j}`,
    name: `Peça ${j}`,
    imageUrl: null,
    stockQty: 1,
    priceLabel: 'R$ 1,00',
    status: 'published',
    rackId,
    kind: 'garment',
    ...extra,
  };
}

function layout(counts: number[]): SceneLayout {
  return {
    racks: counts.map((n, i) => ({
      id: `c${i}`,
      name: `Coleção ${i}`,
      sortOrder: i,
      kind: 'rack' as const,
      hangers: Array.from({ length: n }, (_, j) => hanger(`c${i}`, j)),
    })),
  };
}

/** First client point (coarse grid) whose pick lands on the area itself, not a piece. */
function areaPick(e: StockroomEngine, id: string): { x: number; y: number } | null {
  const pick = (e as unknown as { pick(x: number, y: number): { slug: string | null; areaId: string | null } }).pick.bind(e);
  for (let y = 20; y < 720; y += 16) {
    for (let x = 20; x < 1280; x += 16) {
      const hit = pick(x, y);
      if (!hit.slug && hit.areaId === id) return { x, y };
    }
  }
  return null;
}

function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number): void {
  canvas.dispatchEvent(
    new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, bubbles: true }),
  );
}

describe('compactPrice', () => {
  it('drops whole cents and the site-wide hidden-price note', () => {
    expect(compactPrice('R$ 7.200,00 (oculto no site)')).toBe('R$ 7.200');
    expect(compactPrice('R$ 7.200,50')).toBe('R$ 7.200,50');
    expect(compactPrice('Sob consulta')).toBe('Sob consulta');
    expect(compactPrice(null)).toBe('');
  });
});

describe('upsertHanger', () => {
  it('updates a piece in place without reordering its collection', () => {
    const base = layout([3]);
    const next = upsertHanger(base, hanger('c0', 0, { stockQty: 0 }));
    expect(next.racks[0].hangers.map((h) => h.slug)).toEqual(['c0-0', 'c0-1', 'c0-2']);
    expect(next.racks[0].hangers[0].stockQty).toBe(0);
  });

  it('moves a piece to the end of its new collection', () => {
    const next = upsertHanger(layout([2, 1]), hanger('c1', 0, { slug: 'c0-0' }));
    expect(next.racks[0].hangers.map((h) => h.slug)).toEqual(['c0-1']);
    expect(next.racks[1].hangers.map((h) => h.slug)).toEqual(['c1-0', 'c0-0']);
  });
});

describe('StockroomEngine', () => {
  let canvas: HTMLCanvasElement;
  let host: HTMLDivElement;
  let engine: StockroomEngine | null;

  beforeEach(() => {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;';
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    spyOn(canvas, 'setPointerCapture');
    spyOn(canvas, 'releasePointerCapture');
    engine = createStockroomEngine(canvas, { reducedMotion: true, host });
  });

  afterEach(() => {
    engine?.dispose();
    host.remove();
  });

  function boot(counts: number[], done: () => void): void {
    if (!engine) {
      pending('WebGL not available in this browser');
      return;
    }
    engine.onFirstFrame(done);
    engine.start();
    engine.setLayout(layout(counts));
  }

  it('reaches the first frame and scene complete with one area per collection', (done) => {
    if (!engine) {
      pending('WebGL not available in this browser');
      return;
    }
    const e = engine;
    e.onSceneComplete(() => {
      expect(e.areaIds()).toEqual(['c0', 'c1', 'c2']);
      done();
    });
    e.start();
    e.setLayout(layout([7, 2, 0]));
  });

  it('badges an unpublished collection sign and a collection created from the 3D', (done) => {
    if (!engine) {
      pending('WebGL not available in this browser');
      return;
    }
    const e = engine;
    const base = layout([3, 1]);
    base.racks[0] = { ...base.racks[0]!, unpublished: true };
    e.onSceneComplete(() => {
      expect(e.areaUnpublished('c0')).toBeTrue();
      expect(e.areaUnpublished('c1')).toBeFalse();
      e.showDraft('rack', 'Nova', true);
      e.commitDraft({ id: 'nova', name: 'Nova', sortOrder: 9, kind: 'rack', hangers: [], unpublished: true }, true);
      expect(e.areaUnpublished('nova')).toBeTrue();
      done();
    });
    e.start();
    e.setLayout(base);
  });

  /** Canvas of the admin 3D at a 1280×800 window: header above, nav bar below. */
  function desktopStage(): void {
    host.style.height = '636px';
    engine?.resize();
  }

  function minPhotoEdge(e: StockroomEngine): number {
    return Math.min(...e.overlay().pieces.map((p) => e.pieceScreenRect(p.slug)!.edge));
  }

  it('lands on the first collection, not the whole room', (done) => {
    boot([6, 6, 6], () => {
      const e = engine!;
      expect(e.focusedRackId()).toBe('c0');
      const labels = e.overlay().areas;
      expect(labels.find((a) => a.focused)?.id).toBe('c0');
      expect(labels.find((a) => a.focused)?.name).toBe('Coleção 0');
      done();
    });
  });

  it('keeps every framed photo at least 120 px tall on a 1280×800 desktop', (done) => {
    desktopStage();
    boot([17, 18, 12], () => {
      const e = engine!;
      expect(e.overlay().pieces.length).toBe(17);
      expect(minPhotoEdge(e)).toBeGreaterThanOrEqual(120);
      e.focusRack('c1', true);
      requestAnimationFrame(() => {
        expect(e.overlay().pieces.filter((p) => p.slug.startsWith('c1-')).length).toBe(18);
        expect(minPhotoEdge(e)).toBeGreaterThanOrEqual(120);
        done();
      });
    });
  });

  it('frames a short collection whole, without bay paging', (done) => {
    desktopStage();
    boot([9], () => {
      const e = engine!;
      expect(e.areaBayWindow('c0')).toEqual({ start: 0, count: 2, total: 2 });
      expect(e.panRack(1)).toBeFalse();
      expect(e.canPan(-1)).toBeFalse();
      expect(e.rackPanState().showChrome).toBeFalse();
      done();
    });
  });

  it('pages the bays of a long collection and reports the pieces in view', (done) => {
    desktopStage();
    boot([40], () => {
      const e = engine!;
      const win = e.areaBayWindow('c0')!;
      expect(win.total).toBe(7);
      expect(win.count).toBeLessThan(7);
      const first = e.rackPanState();
      expect(first.showChrome).toBeTrue();
      expect(first.canPrev).toBeFalse();
      expect(first.canNext).toBeTrue();
      expect(first.label).toBe(`1–${win.count * 6} de 40`);
      const pans: number[] = [];
      e.onPanChange(() => pans.push(e.areaBayWindow('c0')!.start));
      expect(e.panRack(1)).toBeTrue();
      expect(e.rackPanState().first).toBe(win.count * 6 + 1);
      expect(e.canPan(-1)).toBeTrue();
      while (e.panRack(1)) {
        /* to the last page */
      }
      const last = e.rackPanState();
      expect(last.canNext).toBeFalse();
      expect(last.last).toBe(40);
      expect(pans.length).toBeGreaterThan(0);
      expect(minPhotoEdge(e)).toBeGreaterThanOrEqual(120);
      done();
    });
  });

  it('captions legible photos in HTML and hides their painted badge', (done) => {
    const base = layout([3, 2]);
    base.racks[0].hangers[1] = hanger('c0', 1, { stockQty: 0, priceLabel: 'R$ 7.200,00 (oculto no site)' });
    base.racks[0].hangers[2] = hanger('c0', 2, { status: 'draft' });
    base.racks[1] = { ...base.racks[1]!, unpublished: true };
    if (!engine) {
      pending('WebGL not available in this browser');
      return;
    }
    const e = engine;
    e.start();
    e.onFirstFrame(() => {
      const seen: number[] = [];
      e.onOverlay((frame) => seen.push(frame.pieces.length));
      requestAnimationFrame(() => {
        const pieces = new Map(e.overlay().pieces.map((p) => [p.slug, p]));
        expect(pieces.get('c0-1')?.badge).toBe('soldout');
        expect(pieces.get('c0-1')?.badgeText).toBe('ESGOTADO');
        expect(pieces.get('c0-1')?.price).toBe('R$ 7.200');
        expect(pieces.get('c0-2')?.badge).toBe('draft');
        expect(pieces.get('c0-0')?.name).toBe('Peça 0');
        expect(pieces.get('c0-0')!.h).toBeGreaterThanOrEqual(90);
        const boxes = (e as unknown as { boxes: Map<string, { badge: { visible: boolean } }> }).boxes;
        expect(boxes.get('c0-1')!.badge.visible).toBeFalse();
        expect(seen.length).toBeGreaterThan(0);
        e.focusRack('c1', true);
        requestAnimationFrame(() => {
          const label = e.overlay().areas.find((a) => a.focused)!;
          expect(label.id).toBe('c1');
          expect(label.unpublished).toBeTrue();
          expect(label.count).toBe(2);
          done();
        });
      });
    });
    e.setLayout(base);
  });

  it('outlines the hovered piece and shows a pointer', (done) => {
    boot([4], () => {
      const e = engine!;
      requestAnimationFrame(() => {
        const at = e.boxScreenPoint('c0-1')!;
        canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: at.x, clientY: at.y, buttons: 0, bubbles: true }));
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            expect(e.isHoverOutlined('c0-1')).toBeTrue();
            expect(e.isHoverOutlined('c0-0')).toBeFalse();
            expect(canvas.style.cursor).toBe('pointer');
            expect(e.overlay().pieces.find((p) => p.hover)?.slug).toBe('c0-1');
            canvas.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
            expect(e.isHoverOutlined('c0-1')).toBeFalse();
            done();
          });
        });
      });
    });
  });

  it('zooms in when a collection is focused and back out for the overview', (done) => {
    boot([6, 6, 6, 6], () => {
      const e = engine!;
      e.focusOverview(true);
      const overview = e.cameraZoom();
      const focused: string[] = [];
      e.onFocusChange((id) => focused.push(id));
      e.focusRack('c2', true);
      expect(e.focusedRackId()).toBe('c2');
      expect(e.cameraZoom()).toBeGreaterThan(overview * 1.3);
      e.focusOverview(true);
      expect(e.cameraZoom()).toBeCloseTo(overview, 5);
      expect(focused).toEqual(['c2', OVERVIEW_FOCUS_ID]);
      done();
    });
  });

  it('opens the editor for a tapped box', (done) => {
    boot([4, 3], () => {
      const e = engine!;
      e.focusRack('c0', true);
      requestAnimationFrame(() => {
        const at = e.boxScreenPoint('c0-1');
        expect(at).not.toBeNull();
        const picked: string[] = [];
        e.onClick((slug) => picked.push(slug));
        pointer(canvas, 'pointerdown', at!.x, at!.y);
        pointer(canvas, 'pointerup', at!.x, at!.y);
        expect(picked).toEqual(['c0-1']);
        done();
      });
    });
  });

  it('focuses an area when its floor is tapped, and offers to add pieces to an empty one', (done) => {
    boot([3, 0], () => {
      const e = engine!;
      e.focusOverview(true);
      const empty: string[] = [];
      e.onEmptyUnit((id) => empty.push(id));
      requestAnimationFrame(() => {
        const at = e.areaScreenPoint('c1')!;
        pointer(canvas, 'pointerdown', at.x, at.y);
        pointer(canvas, 'pointerup', at.x, at.y);
        expect(e.focusedRackId()).toBe('c1');
        expect(empty).toEqual([]);
        requestAnimationFrame(() => {
          // The collection view crops the rug, so tap the empty bay itself.
          const again = areaPick(e, 'c1')!;
          expect(again).not.toBeNull();
          pointer(canvas, 'pointerdown', again.x, again.y);
          pointer(canvas, 'pointerup', again.x, again.y);
          expect(empty).toEqual(['c1']);
          done();
        });
      });
    });
  });

  it('ignores a drag (pan) as a tap', (done) => {
    boot([2], () => {
      const e = engine!;
      requestAnimationFrame(() => {
        const at = e.boxScreenPoint('c0-0')!;
        const picked: string[] = [];
        e.onClick((slug) => picked.push(slug));
        pointer(canvas, 'pointerdown', at.x, at.y);
        pointer(canvas, 'pointerup', at.x + 40, at.y + 10);
        expect(picked).toEqual([]);
        done();
      });
    });
  });

  it('adds a draft area and replaces it with the committed collection', (done) => {
    boot([2], () => {
      const e = engine!;
      const point = e.showDraft('rack', 'Nova coleção', true);
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBeTrue();
      expect(e.areaIds()).toEqual(['c0', DRAFT_UNIT_ID]);
      expect(e.focusedRackId()).toBe(DRAFT_UNIT_ID);
      e.commitDraft({ id: 'nova', name: 'Nova', sortOrder: 9, kind: 'rack', hangers: [] }, true);
      expect(e.areaIds()).toEqual(['c0', 'nova']);
      expect(e.focusedRackId()).toBe('nova');
      done();
    });
  });

  it('adds, updates and removes boxes and areas', (done) => {
    boot([2, 1], () => {
      const e = engine!;
      e.addHanger(hanger('c1', 5), true);
      expect(e.boxScreenPoint('c1-5')).not.toBeNull();
      e.updateHanger(hanger('c1', 5, { stockQty: 0 }));
      expect(e.boxScreenPoint('c1-5')).not.toBeNull();
      e.removeHanger('c1-5', true);
      expect(e.boxScreenPoint('c1-5')).toBeNull();
      e.sinkUnit('c1', true);
      expect(e.areaIds()).toEqual(['c0']);
      e.restoreUnit(layout([2, 1]).racks[1]);
      expect(e.areaIds()).toEqual(['c0', 'c1']);
      done();
    });
  });
});

describe('StockroomEngine with the Sketchfab kit (option B)', () => {
  let canvas: HTMLCanvasElement;
  let host: HTMLDivElement;
  let engine: StockroomEngine | null;

  beforeEach(() => {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;';
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    spyOn(canvas, 'setPointerCapture');
    spyOn(canvas, 'releasePointerCapture');
    engine = createStockroomEngine(canvas, { reducedMotion: true, host, kit: SKETCHFAB_KIT });
  });

  afterEach(() => {
    engine?.dispose();
    host.remove();
  });

  function bootB(base: SceneLayout, done: () => void): void {
    if (!engine) {
      pending('WebGL not available in this browser');
      return;
    }
    engine.onSceneComplete(done);
    engine.start();
    engine.setLayout(base);
  }

  it('builds one area per collection with hanging pieces and their badges', (done) => {
    const base = layout([3, 1]);
    base.racks[0].hangers[1] = hanger('c0', 1, { stockQty: 0 });
    base.racks[0].hangers[2] = hanger('c0', 2, { status: 'draft' });
    bootB(base, () => {
      const e = engine!;
      expect(e.kit.id).toBe('sketchfab');
      expect(e.areaIds()).toEqual(['c0', 'c1']);
      expect(e.pieceBadge('c0-0')).toBe('stock');
      expect(e.pieceBadge('c0-1')).toBe('soldout');
      expect(e.pieceBadge('c0-2')).toBe('draft');
      expect(e.pieceBadge('missing')).toBeNull();
      done();
    });
  });

  it('badges only the unpublished collection sign', (done) => {
    const base = layout([2, 2]);
    base.racks[1] = { ...base.racks[1]!, unpublished: true };
    bootB(base, () => {
      expect(engine!.areaUnpublished('c0')).toBeFalse();
      expect(engine!.areaUnpublished('c1')).toBeTrue();
      done();
    });
  });

  it('lands on the first collection with photos at least 120 px tall on a 1280×800 desktop', (done) => {
    host.style.height = '636px';
    engine?.resize();
    bootB(layout([17, 18]), () => {
      const e = engine!;
      expect(e.focusedRackId()).toBe('c0');
      const edges = e.overlay().pieces.map((p) => e.pieceScreenRect(p.slug)!.edge);
      expect(edges.length).toBeGreaterThan(0);
      expect(Math.min(...edges)).toBeGreaterThanOrEqual(120);
      expect(e.rackPanState().showChrome).toBeTrue();
      done();
    });
  });

  it('opens the editor for a tapped piece', (done) => {
    bootB(layout([4, 2]), () => {
      const e = engine!;
      e.focusRack('c0', true);
      requestAnimationFrame(() => {
        const at = e.boxScreenPoint('c0-2');
        expect(at).not.toBeNull();
        const picked: string[] = [];
        e.onClick((slug) => picked.push(slug));
        pointer(canvas, 'pointerdown', at!.x, at!.y);
        pointer(canvas, 'pointerup', at!.x, at!.y);
        expect(picked).toEqual(['c0-2']);
        done();
      });
    });
  });
});
