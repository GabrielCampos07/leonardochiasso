import {
  CAMERA_AZIMUTH_LIMIT,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  CREATE_TWEEN_MS,
  computeEyeLevelFit,
  computeVitrineFit,
  easeInOutCubic,
  easeOutBack,
  isCompactAtelierViewport,
  photoPlaneSize,
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
});

describe('easeInOutCubic', () => {
  it('starts and ends on the endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('create-collection motion', () => {
  it('keeps the create tween inside 400–700ms', () => {
    expect(CREATE_TWEEN_MS).toBeGreaterThanOrEqual(400);
    expect(CREATE_TWEEN_MS).toBeLessThanOrEqual(700);
  });

  it('overshoots then settles for the floor rise', () => {
    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(1)).toBeCloseTo(1, 5);
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
  });
});

describe('camera lock', () => {
  it('limits azimuth to about ±25° and polar to 10–35° above horizontal', () => {
    expect(CAMERA_AZIMUTH_LIMIT).toBeCloseTo((25 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MIN).toBeCloseTo(Math.PI / 2 - (35 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MAX).toBeCloseTo(Math.PI / 2 - (10 * Math.PI) / 180, 5);
    expect(CAMERA_POLAR_MIN).toBeLessThan(CAMERA_POLAR_MAX);
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
});

describe('computeVitrineFit', () => {
  it('looks down from about 30–40° at the case', () => {
    const box = { minX: -0.8, maxX: 0.8, minY: -0.6, maxY: 0.7, minZ: -0.25, maxZ: 0.25 };
    const pose = computeVitrineFit(box, 16 / 9, 38);
    const dy = pose.position.y - pose.target.y;
    const dz = pose.position.z - pose.target.z;
    const elev = Math.atan2(dy, dz) * (180 / Math.PI);
    expect(elev).toBeGreaterThan(28);
    expect(elev).toBeLessThan(42);
  });
});

describe('isCompactAtelierViewport', () => {
  it('treats 415px as one-unit framing', () => {
    expect(isCompactAtelierViewport(415)).toBeTrue();
    expect(isCompactAtelierViewport(1280)).toBeFalse();
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
