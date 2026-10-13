import {
  CAMERA_AZIMUTH_LIMIT,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  CREATE_TWEEN_MS,
  computeEyeLevelFit,
  chromeBandTargetY,
  collectionSwitcherItems,
  computePortraitOverviewFit,
  isPortraitAtelierViewport,
  portraitOverviewTargetY,
  OVERVIEW_MAX_DISTANCE,
  OVERVIEW_MAX_DISTANCE_COMPACT,
  PORTRAIT_STACK_PITCH,
  PORTRAIT_STACK_Z,
  portraitStackOffset,
  clampOrbitSpherical,
  computeVitrineFit,
  defaultChromeInsets,
  distanceToFitWidth,
  COMPACT_RACK_RAISE,
  FIT_WIDTH_MARGIN_COMPACT,
  RACK_MAX_DISTANCE_COMPACT,
  measureAtelierChrome,
  easeInOutCubic,
  easeOutBack,
  isCompactAtelierViewport,
  photoPlaneSize,
  pieceFocusBox,
  PIECE_NEIGHBOR_PAD,
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

  it('lists Ver todas first for the mobile collection switcher', () => {
    expect(collectionSwitcherItems(rackNavItems([{ id: 'organic-dreams', name: 'Organic Dreams' }]))).toEqual([
      { id: 'all', name: 'Ver todas' },
      { id: 'organic-dreams', name: 'Organic Dreams' },
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
  it('allows a real orbit (±70° azimuth, 8–48° elevation) instead of a sway', () => {
    expect(CAMERA_AZIMUTH_LIMIT).toBeCloseTo((70 * Math.PI) / 180, 5);
    expect(CAMERA_AZIMUTH_LIMIT).toBeGreaterThan((60 * Math.PI) / 180);
    expect(CAMERA_POLAR_MIN).toBeCloseTo(Math.PI / 2 - (48 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MAX).toBeCloseTo(Math.PI / 2 - (8 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MIN).toBeLessThan(CAMERA_POLAR_MAX);
  });

  it('clamps a hard sideways drag back into the lock every frame', () => {
    const locked = clampOrbitSpherical(2.4, 0.1);
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

  it('raises a compact rack so the wall does not fill the top of the phone', () => {
    const chrome = { top: 0.08, bottom: 0.22 };
    const pose = computeEyeLevelFit(box, 393 / 852, 38, 'rack', true, chrome);
    const cy = (box.minY + box.maxY) / 2;
    expect(COMPACT_RACK_RAISE).toBeGreaterThan(0.4);
    expect(pose.target.y).toBeLessThan(cy);
    expect(pose.target.y).toBeLessThan(chromeBandTargetY(cy, box.maxY - box.minY, chrome) - 0.3);
  });

  it('keeps a compact viewport on the width fit with extra side margin', () => {
    const compact = computeEyeLevelFit(box, 400 / 720, 38, 'rack', true);
    const need = distanceToFitWidth(3, 400 / 720, 38, FIT_WIDTH_MARGIN_COMPACT);
    expect(compact.distance).toBeGreaterThanOrEqual(need * 0.92);
    expect(compact.distance).toBeLessThan(need * 1.25);
  });

  it('backs far enough on 393×852 to keep an 8-col Organic inside the side margin', () => {
    const organic = { minX: -2.82, maxX: 2.82, minY: -0.45, maxY: 1.3, minZ: -0.1, maxZ: 0.1 };
    const chrome = { top: 0.08, bottom: 0.22 };
    const pose = computeEyeLevelFit(organic, 393 / 852, 38, 'rack', true, chrome);
    const visible = 2 * Math.tan((38 * Math.PI) / 360) * pose.distance * (393 / 852);
    expect(5.64 / visible).toBeLessThan(1 - FIT_WIDTH_MARGIN_COMPACT * 2 + 0.02);
    expect(pose.distance).toBeGreaterThan(10);
    expect(pose.distance).toBeLessThanOrEqual(RACK_MAX_DISTANCE_COMPACT);
  });

  it('fits a tall 3-row rack without the old 4.6 distance cap', () => {
    const tall = { minX: -1.6, maxX: 1.6, minY: -0.2, maxY: 3.2, minZ: -0.1, maxZ: 0.1 };
    const rack = computeEyeLevelFit(tall, 16 / 9, 38, 'rack');
    expect(rack.distance).toBeGreaterThan(4.6);
  });

  it('fits a four-rack aisle so Organic and Sem coleção stay in frame', () => {
    const aisle = { minX: -14, maxX: 14, minY: -0.2, maxY: 2.2, minZ: -0.1, maxZ: 0.1 };
    const all = computeEyeLevelFit(aisle, 16 / 9, 38, 'overview');
    const visible = 2 * Math.tan((38 * Math.PI) / 360) * all.distance * (16 / 9);
    expect(28 / visible).toBeLessThan(1.02);
    expect(all.distance).toBeGreaterThan(16);
    expect(all.distance).toBeLessThanOrEqual(OVERVIEW_MAX_DISTANCE);
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
    const close = computeEyeLevelFit(piece, 16 / 9, 38, 'piece', false, chrome);
    expect(close.distance).toBeLessThan(wide.distance);
  });

  it('looks down more in piece mode so the collection sign stays above the frame', () => {
    const piece = { minX: -0.4, maxX: 0.4, minY: -0.45, maxY: 0.75, minZ: -0.1, maxZ: 0.1 };
    const chrome = { top: 0.05, bottom: 0.18 };
    const rack = computeEyeLevelFit(piece, 16 / 9, 38, 'rack', false, chrome);
    const close = computeEyeLevelFit(piece, 16 / 9, 38, 'piece', false, chrome);
    const rackElev = Math.atan2(rack.position.y - rack.target.y, rack.position.z - rack.target.z);
    const pieceElev = Math.atan2(close.position.y - close.target.y, close.position.z - close.target.z);
    expect(pieceElev).toBeGreaterThan(rackElev);
    expect(close.distance).toBeLessThan(rack.distance);
  });
});

describe('pieceFocusBox', () => {
  const piece = { minX: -0.56, maxX: -0.08, minY: 0.02, maxY: 1.06, minZ: 0, maxZ: 0.16 };

  it('opens toward the right sibling so its ellipsized plate stays in frame', () => {
    const box = pieceFocusBox(piece, 0, 2);
    const pieceCx = (piece.minX + piece.maxX) / 2;
    const lookCx = (box.minX + box.maxX) / 2;
    expect(lookCx).toBeGreaterThan(pieceCx);
    expect(box.maxX).toBeCloseTo(piece.maxX + 0.06 + PIECE_NEIGHBOR_PAD, 5);
  });

  it('opens toward the left sibling the other way', () => {
    const box = pieceFocusBox(piece, 1, 2);
    const pieceCx = (piece.minX + piece.maxX) / 2;
    expect((box.minX + box.maxX) / 2).toBeLessThan(pieceCx);
    expect(box.minX).toBeCloseTo(piece.minX - 0.06 - PIECE_NEIGHBOR_PAD, 5);
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

describe('portrait Ver todas stack', () => {
  it('treats 393×852 as portrait and 390×300 as compact landscape', () => {
    expect(isPortraitAtelierViewport(393, 852)).toBeTrue();
    expect(isPortraitAtelierViewport(390, 844)).toBeTrue();
    expect(isPortraitAtelierViewport(390, 300)).toBeFalse();
    expect(isPortraitAtelierViewport(1280, 900)).toBeFalse();
  });

  it('stacks racks on Y at the same X, first collection on top, last on the floor', () => {
    const top = portraitStackOffset(0, 3);
    const mid = portraitStackOffset(1, 3);
    const bottom = portraitStackOffset(2, 3);
    expect(top.x).toBe(0);
    expect(mid.x).toBe(0);
    expect(bottom.x).toBe(0);
    expect(bottom.y).toBe(0);
    expect(top.z).toBe(PORTRAIT_STACK_Z);
    expect(mid.y).toBeCloseTo(PORTRAIT_STACK_PITCH, 5);
    expect(top.y).toBeCloseTo(2 * PORTRAIT_STACK_PITCH, 5);
  });

  it('frames a stacked aisle in the usable band above the bar on 393×852', () => {
    const aisle = { minX: -14, maxX: 14, minY: -0.2, maxY: 2.2, minZ: -0.1, maxZ: 0.1 };
    const stack = { minX: -3.4, maxX: 3.4, minY: -0.7, maxY: 7.1, minZ: -0.1, maxZ: 0.1 };
    const chrome = { top: 0.08, bottom: 0.28 };
    const wide = computeEyeLevelFit(aisle, 393 / 852, 38, 'overview', true, chrome);
    const stacked = computePortraitOverviewFit(stack, 393 / 852, 38, chrome);
    expect(wide.distance).toBeLessThanOrEqual(OVERVIEW_MAX_DISTANCE_COMPACT);
    expect(stacked.distance).toBeGreaterThan(OVERVIEW_MAX_DISTANCE_COMPACT);
    expect(stacked.distance).toBeLessThanOrEqual(OVERVIEW_MAX_DISTANCE);
    const stackVisible = 2 * Math.tan((38 * Math.PI) / 360) * stacked.distance * (393 / 852);
    expect(6.8 / stackVisible).toBeLessThan(1.02);
    expect(6.8 / stackVisible).toBeGreaterThan(0.7);
    const viewH = 2 * Math.tan((38 * Math.PI) / 360) * stacked.distance;
    expect(stacked.target.y).toBeCloseTo(portraitOverviewTargetY(stack.maxY, viewH, chrome), 5);
    const stackTopOnScreen = 0.5 - (stack.maxY - stacked.target.y) / viewH;
    expect(stackTopOnScreen).toBeGreaterThan(chrome.top - 0.02);
    expect(stackTopOnScreen).toBeLessThan(chrome.top + 0.06);
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
    expect(chrome.bottom).toBeGreaterThan((800 - 720) / 800);
    expect(chrome.bottom).toBeLessThan(0.2);
    expect(chrome.top).toBeGreaterThan(52 / 800);
    expect(host.style.getPropertyValue('--lc-atelier-chrome-bottom')).toMatch(/px$/);
  });

  it('uses the live 393×852 bar instead of the 0.30 compact fallback', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientHeight', { value: 852 });
    Object.defineProperty(host, 'clientWidth', { value: 393 });
    spyOn(host, 'getBoundingClientRect').and.returnValue({
      top: 0,
      bottom: 852,
      height: 852,
      width: 393,
      left: 0,
      right: 393,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const guide = document.createElement('nav');
    guide.className = 'admin-3d__guide';
    spyOn(guide, 'getBoundingClientRect').and.returnValue({
      top: 692,
      bottom: 852,
      height: 160,
      width: 393,
      left: 0,
      right: 393,
      x: 0,
      y: 692,
      toJSON: () => ({}),
    } as DOMRect);
    host.appendChild(guide);
    const chrome = measureAtelierChrome(host);
    const measured = (852 - 692 + 20) / 852;
    expect(chrome.bottom).toBeCloseTo(measured, 2);
    expect(chrome.bottom).toBeLessThan(defaultChromeInsets(true).bottom);
    expect(chrome.bottom).toBeLessThan(0.3);
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
