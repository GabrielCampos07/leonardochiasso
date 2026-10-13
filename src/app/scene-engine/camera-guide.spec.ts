import {
  CAMERA_AZIMUTH_LIMIT,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  CREATE_TWEEN_MS,
  computeEyeLevelFit,
  clampOrbitSpherical,
  computeVitrineFit,
  defaultChromeInsets,
  distanceToFitWidth,
  measureAtelierChrome,
  easeInOutCubic,
  easeOutBack,
  isCompactAtelierViewport,
  photoPlaneSize,
  pieceFocusBox,
  PIECE_FOCUS_SHIFT,
  rackNavItems,
  stepRackIndex,
} from './camera-guide';

describe('stepRackIndex', () => {
  it('clamps at the ends', () => {
    expect(stepRackIndex(0, -1, 4)).toBe(0);
    expect(stepRackIndex(3, 1, 4)).toBe(3);
    expect(stepRackIndex(1, 1, 4)).toBe(2);
  });
});

describe('rackNavItems', () => {
  it('keeps collection order and indexes', () => {
    expect(rackNavItems([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toEqual([
      { id: 'a', name: 'A', index: 0 },
      { id: 'b', name: 'B', index: 1 },
    ]);
  });

  it('keeps Sem coleção last after a new collection is created', () => {
    const items = rackNavItems([
      { id: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 },
      { id: '__none__', name: 'Sem coleção', sortOrder: 99 },
      { id: 'nova-col', name: 'Nova col', sortOrder: 2 },
    ]);
    expect(items.map((item) => item.id)).toEqual(['organic-dreams', 'nova-col', '__none__']);
    expect(items.map((item) => item.id)).toEqual(
      rackNavItems([
        { id: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 },
        { id: 'nova-col', name: 'Nova col', sortOrder: 2 },
        { id: '__none__', name: 'Sem coleção', sortOrder: 99 },
      ]).map((item) => item.id),
    );
  });
});

describe('easeInOutCubic', () => {
  it('starts and ends on the endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('easeOutBack', () => {
  it('overshoots then lands on 1', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 10);
    expect(easeOutBack(1)).toBeCloseTo(1, 5);
    expect(easeOutBack(0.85)).toBeGreaterThan(1);
  });
});

describe('CREATE_TWEEN_MS', () => {
  it('stays inside the 400–600 ms motion band', () => {
    expect(CREATE_TWEEN_MS).toBeGreaterThanOrEqual(400);
    expect(CREATE_TWEEN_MS).toBeLessThanOrEqual(600);
  });
});

describe('camera lock', () => {
  it('limits azimuth to about ±25° and polar to 10–35° above horizontal', () => {
    expect(CAMERA_AZIMUTH_LIMIT).toBeCloseTo((25 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MIN).toBeCloseTo(Math.PI / 2 - (35 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MAX).toBeCloseTo(Math.PI / 2 - (10 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MIN).toBeLessThan(CAMERA_POLAR_MAX);
  });

  it('clamps a hard sideways drag back into the lock every frame', () => {
    const locked = clampOrbitSpherical(1.2, 0.1);
    expect(locked.theta).toBeCloseTo(CAMERA_AZIMUTH_LIMIT, 5);
    expect(locked.phi).toBe(CAMERA_POLAR_MIN);
    const other = clampOrbitSpherical(-2, 2);
    expect(other.theta).toBeCloseTo(-CAMERA_AZIMUTH_LIMIT, 5);
    expect(other.phi).toBe(CAMERA_POLAR_MAX);
  });
});

describe('computeEyeLevelFit', () => {
  const box = { minX: 0, maxX: 3, minY: -0.2, maxY: 1.4, minZ: -0.1, maxZ: 0.1 };

  it('places the rack camera closer than overview and above the floor', () => {
    const rack = computeEyeLevelFit(box, 16 / 9, 38, 'rack');
    const all = computeEyeLevelFit(box, 16 / 9, 38, 'overview');
    expect(rack.distance).toBeLessThan(all.distance);
    expect(rack.position.z).toBeGreaterThan(rack.target.z);
    expect(rack.position.y).toBeGreaterThan(-0.45);
  });

  it('fills about 85% of viewport width when the rack is wider than it is tall', () => {
    const wide = { minX: 0, maxX: 4, minY: 0, maxY: 1.1, minZ: -0.1, maxZ: 0.1 };
    const pose = computeEyeLevelFit(wide, 16 / 9, 38, 'rack');
    const visible = 2 * Math.tan((38 * Math.PI) / 360) * pose.distance * (16 / 9);
    expect(4 / visible).toBeGreaterThan(0.78);
    expect(4 / visible).toBeLessThan(0.95);
  });

  it('keeps a compact viewport on the 85% width fit instead of backing away', () => {
    const compact = computeEyeLevelFit(box, 400 / 720, 38, 'rack', true);
    const need = distanceToFitWidth(3, 400 / 720, 38, 0.075);
    expect(compact.distance).toBeGreaterThanOrEqual(need * 0.92);
    expect(compact.distance).toBeLessThan(need * 1.25);
  });

  it('fits a tall 3-row rack without the old 4.6 distance cap', () => {
    const tall = { minX: -1.6, maxX: 1.6, minY: -0.2, maxY: 3.2, minZ: -0.1, maxZ: 0.1 };
    const rack = computeEyeLevelFit(tall, 16 / 9, 38, 'rack');
    expect(rack.distance).toBeGreaterThan(4.6);
  });

  it('keeps Ver todas closer so plates stay legible', () => {
    const wide = { minX: -1, maxX: 16, minY: -0.2, maxY: 3.2, minZ: -0.1, maxZ: 0.1 };
    const all = computeEyeLevelFit(wide, 16 / 9, 38, 'overview');
    expect(all.distance).toBeGreaterThan(6);
    expect(all.distance).toBeLessThanOrEqual(16);
  });

  it('backs off when the collections bar reserves more of the viewport', () => {
    const unit = { minX: -1, maxX: 1, minY: -0.4, maxY: 1.3, minZ: -0.1, maxZ: 0.1 };
    const open = computeEyeLevelFit(unit, 16 / 9, 38, 'rack', false, { top: 0.04, bottom: 0.08 });
    const barred = computeEyeLevelFit(unit, 16 / 9, 38, 'rack', false, { top: 0.05, bottom: 0.24 });
    expect(barred.distance).toBeGreaterThan(open.distance);
  });

  it('frames a single hanger closer than the full rack', () => {
    const rack = { minX: -1.1, maxX: 1.1, minY: -0.45, maxY: 1.3, minZ: -0.1, maxZ: 0.1 };
    const piece = { minX: -0.4, maxX: 0.4, minY: -0.45, maxY: 0.75, minZ: -0.1, maxZ: 0.1 };
    const chrome = { top: 0.05, bottom: 0.18 };
    const wide = computeEyeLevelFit(rack, 16 / 9, 38, 'rack', false, chrome);
    const close = computeEyeLevelFit(piece, 16 / 9, 38, 'rack', false, chrome);
    expect(close.distance).toBeLessThan(wide.distance);
  });
});

describe('pieceFocusBox', () => {
  const piece = { minX: -0.56, maxX: -0.08, minY: 0.02, maxY: 1.06, minZ: 0, maxZ: 0.16 };

  it('shifts a left hanger look-at outward so the neighbor leaves the frame', () => {
    const box = pieceFocusBox(piece, 0, 2);
    const pieceCx = (piece.minX + piece.maxX) / 2;
    const lookCx = (box.minX + box.maxX) / 2;
    expect(lookCx).toBeCloseTo(pieceCx - PIECE_FOCUS_SHIFT, 5);
    expect(box.maxX - box.minX).toBeCloseTo(piece.maxX - piece.minX + 0.1, 5);
  });

  it('shifts a right hanger look-at the other way', () => {
    const box = pieceFocusBox(piece, 1, 2);
    const pieceCx = (piece.minX + piece.maxX) / 2;
    expect((box.minX + box.maxX) / 2).toBeCloseTo(pieceCx + PIECE_FOCUS_SHIFT, 5);
  });

  it('keeps a solo hanger centered', () => {
    const box = pieceFocusBox(piece, 0, 1);
    expect((box.minX + box.maxX) / 2).toBeCloseTo((piece.minX + piece.maxX) / 2, 5);
  });
});

describe('computeVitrineFit', () => {
  it('fits compact vitrine width including the plate', () => {
    const box = { minX: -1.2, maxX: 1.2, minY: -0.6, maxY: 0.9, minZ: -0.25, maxZ: 0.25 };
    const compact = computeVitrineFit(box, 400 / 720, 38, true);
    const need = distanceToFitWidth(2.4, 400 / 720, 38, 0.08);
    expect(compact.distance).toBeGreaterThanOrEqual(need);
  });

  it('looks down from about 18–26° and stays closer than the old 34° framing', () => {
    const box = { minX: -0.8, maxX: 0.8, minY: -0.6, maxY: 0.7, minZ: -0.25, maxZ: 0.25 };
    const pose = computeVitrineFit(box, 16 / 9, 38);
    const dy = pose.position.y - pose.target.y;
    const dz = pose.position.z - pose.target.z;
    const elev = Math.atan2(dy, dz) * (180 / Math.PI);
    expect(elev).toBeGreaterThan(18);
    expect(elev).toBeLessThan(26);
    expect(pose.distance).toBeLessThan(2.8);
    expect(pose.position.y).toBeLessThan(pose.target.y + 1.2);
  });
});

describe('isCompactAtelierViewport', () => {
  it('treats 415px as one-unit framing', () => {
    expect(isCompactAtelierViewport(415)).toBeTrue();
    expect(isCompactAtelierViewport(1280)).toBeFalse();
  });
});

describe('distanceToFitWidth', () => {
  it('grows as the viewport gets narrower', () => {
    const wide = distanceToFitWidth(3, 16 / 9, 38, 0.08);
    const narrow = distanceToFitWidth(3, 400 / 720, 38, 0.08);
    expect(narrow).toBeGreaterThan(wide);
  });
});

describe('measureAtelierChrome', () => {
  it('reserves the live collections bar plus a margin', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientHeight', { value: 800 });
    Object.defineProperty(host, 'clientWidth', { value: 1280 });
    spyOn(host, 'getBoundingClientRect').and.returnValue({
      top: 0,
      bottom: 800,
      height: 800,
      width: 1280,
      left: 0,
      right: 1280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const guide = document.createElement('nav');
    guide.className = 'admin-3d__guide';
    spyOn(guide, 'getBoundingClientRect').and.returnValue({
      top: 720,
      bottom: 792,
      height: 72,
      width: 1200,
      left: 12,
      right: 1212,
      x: 12,
      y: 720,
      toJSON: () => ({}),
    } as DOMRect);
    host.appendChild(guide);
    const overlay = document.createElement('div');
    overlay.className = 'admin-3d__chrome';
    spyOn(overlay, 'getBoundingClientRect').and.returnValue({
      top: 12,
      bottom: 52,
      height: 40,
      width: 160,
      left: 1100,
      right: 1260,
      x: 1100,
      y: 12,
      toJSON: () => ({}),
    } as DOMRect);
    host.appendChild(overlay);
    const chrome = measureAtelierChrome(host);
    expect(chrome.bottom).toBeGreaterThan(defaultChromeInsets(false).bottom - 0.01);
    expect(chrome.bottom).toBeGreaterThan((800 - 720) / 800);
    expect(chrome.top).toBeGreaterThan(52 / 800);
  });
});

describe('photoPlaneSize', () => {
  it('keeps the photo aspect inside the hanger max box', () => {
    const portrait = photoPlaneSize(900, 1200, 0.48, 0.64);
    expect(portrait.width / portrait.height).toBeCloseTo(0.75, 5);
    expect(portrait.height).toBeLessThanOrEqual(0.64);
    expect(portrait.width).toBeLessThanOrEqual(0.48);
  });
});
