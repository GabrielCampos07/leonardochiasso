import { OVERVIEW_FOCUS_ID } from '../camera-guide';
import type { SceneHanger, SceneLayout } from '../types';
import { DRAFT_UNIT_ID } from '../unit-layout';
import { StockroomEngine, createStockroomEngine, upsertHanger } from './stockroom-engine';

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

function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number): void {
  canvas.dispatchEvent(
    new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, bubbles: true }),
  );
}

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

  it('has no per-rack pan window', (done) => {
    boot([9], () => {
      expect(engine!.panRack(1)).toBeFalse();
      expect(engine!.canPan(-1)).toBeFalse();
      expect(engine!.rackPanState().showChrome).toBeFalse();
      done();
    });
  });

  it('zooms in when a collection is focused and back out for the overview', (done) => {
    boot([6, 6, 6, 6], () => {
      const e = engine!;
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
      const empty: string[] = [];
      e.onEmptyUnit((id) => empty.push(id));
      requestAnimationFrame(() => {
        const at = e.areaScreenPoint('c1')!;
        pointer(canvas, 'pointerdown', at.x, at.y);
        pointer(canvas, 'pointerup', at.x, at.y);
        expect(e.focusedRackId()).toBe('c1');
        expect(empty).toEqual([]);
        requestAnimationFrame(() => {
          const again = e.areaScreenPoint('c1')!;
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
