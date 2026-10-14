import { Box3, OrthographicCamera, Vector3 } from 'three';
import {
  STOCKROOM_AZIMUTH_LIMIT,
  STOCKROOM_CAMERA_DISTANCE,
  STOCKROOM_FRUSTUM_HALF,
  STOCKROOM_POLAR_DEFAULT,
  STOCKROOM_POLAR_MAX,
  STOCKROOM_POLAR_MIN,
  clampStockroomSpherical,
  clampStockroomTarget,
  fitOrthoBox,
  lerpPose,
  offsetDirection,
  stockroomInsetsPx,
  stockroomZoomLimits,
  uprightScreenPx,
  viewBasis,
} from './stockroom-camera';

function cameraFor(polar: number, azimuth: number, target: Vector3, zoom: number, aspect: number): OrthographicCamera {
  const half = STOCKROOM_FRUSTUM_HALF;
  const camera = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 200);
  camera.position.copy(target).addScaledVector(offsetDirection(polar, azimuth), STOCKROOM_CAMERA_DISTANCE);
  camera.zoom = zoom;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

describe('stockroom camera', () => {
  it('clamps rotation so the view stays top-down and never flips', () => {
    const wild = clampStockroomSpherical(-3, 9);
    expect(wild.polar).toBe(STOCKROOM_POLAR_MIN);
    expect(wild.azimuth).toBe(STOCKROOM_AZIMUTH_LIMIT);
    const low = clampStockroomSpherical(Math.PI, -9);
    expect(low.polar).toBe(STOCKROOM_POLAR_MAX);
    expect(low.azimuth).toBe(-STOCKROOM_AZIMUTH_LIMIT);
    expect(STOCKROOM_POLAR_MIN).toBeGreaterThan(0);
    expect(STOCKROOM_POLAR_MAX).toBeLessThan(Math.PI / 2 - 0.2);
    expect(STOCKROOM_AZIMUTH_LIMIT).toBeLessThanOrEqual(Math.PI / 6 + 1e-9);
  });

  it('keeps screen up pointing away from the floor at every allowed angle', () => {
    for (const polar of [STOCKROOM_POLAR_MIN, STOCKROOM_POLAR_DEFAULT, STOCKROOM_POLAR_MAX]) {
      for (const azimuth of [-STOCKROOM_AZIMUTH_LIMIT, 0, STOCKROOM_AZIMUTH_LIMIT]) {
        const { up, forward } = viewBasis(polar, azimuth);
        expect(up.y).toBeGreaterThan(0);
        expect(forward.y).toBeLessThan(0);
      }
    }
  });

  it('fits a box inside the band left free by the chrome', () => {
    const box = new Box3(new Vector3(-4, 0, -2), new Vector3(4, 3.5, 1));
    const insets = { top: 0.1, bottom: 0.2, side: 0.04 };
    const aspect = 1280 / 720;
    const { zoom, target } = fitOrthoBox(box, STOCKROOM_POLAR_DEFAULT, 0.2, aspect, insets);
    const camera = cameraFor(STOCKROOM_POLAR_DEFAULT, 0.2, target, zoom, aspect);
    const corner = new Vector3();
    for (let i = 0; i < 8; i += 1) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      const ndc = corner.clone().project(camera);
      expect(ndc.x).toBeGreaterThanOrEqual(-1 + 2 * insets.side - 1e-3);
      expect(ndc.x).toBeLessThanOrEqual(1 - 2 * insets.side + 1e-3);
      expect(ndc.y).toBeGreaterThanOrEqual(-1 + 2 * insets.bottom - 1e-3);
      expect(ndc.y).toBeLessThanOrEqual(1 - 2 * insets.top + 1e-3);
    }
  });

  it('zooms in further on a smaller box', () => {
    const insets = { top: 0.1, bottom: 0.2 };
    const big = fitOrthoBox(new Box3(new Vector3(-8, 0, -6), new Vector3(8, 3, 6)), 0.8, 0, 1.6, insets);
    const small = fitOrthoBox(new Box3(new Vector3(-1, 0, -0.5), new Vector3(1, 3, 0.5)), 0.8, 0, 1.6, insets);
    expect(small.zoom).toBeGreaterThan(big.zoom * 2);
  });

  it('clamps pan inside the room and moves only the escaping axes', () => {
    const room = { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };
    const t = clampStockroomTarget(new Vector3(12, 9, -1), room);
    expect(t.x).toBe(5);
    expect(t.z).toBe(-1);
    expect(t.y).toBeLessThanOrEqual(3.6);
  });

  it('lets the user zoom out a little past the overview and in to box level', () => {
    const limits = stockroomZoomLimits(0.6);
    expect(limits.min).toBeCloseTo(0.42, 5);
    expect(limits.max).toBeGreaterThan(5);
  });

  it('tweens poses from start to end', () => {
    const a = { polar: 0.6, azimuth: -0.2, target: new Vector3(0, 0, 0), zoom: 1 };
    const b = { polar: 0.9, azimuth: 0.3, target: new Vector3(4, 1, -2), zoom: 4 };
    expect(lerpPose(a, b, 0).zoom).toBeCloseTo(1, 6);
    const end = lerpPose(a, b, 1);
    expect(end.zoom).toBeCloseTo(4, 6);
    expect(end.target.distanceTo(b.target)).toBeLessThan(1e-6);
    expect(lerpPose(a, b, 0.5).zoom).toBeCloseTo(2, 6);
  });
});

describe('stockroom pixel helpers', () => {
  it('measures an upright plane on screen from the ortho zoom and tilt', () => {
    const viewportH = 600;
    const polar = Math.PI / 3;
    const zoom = 2;
    const px = uprightScreenPx(0.5, polar, zoom, viewportH);
    expect(px).toBeCloseTo((0.5 * Math.sin(polar) * zoom * viewportH) / (2 * STOCKROOM_FRUSTUM_HALF), 6);
    expect(uprightScreenPx(0.5, polar, zoom * 2, viewportH)).toBeCloseTo(px * 2, 6);
  });

  it('turns fixed pixel bands into fractional insets', () => {
    const insets = stockroomInsetsPx(640, 64, 16);
    expect(insets.top).toBeCloseTo(0.1, 6);
    expect(insets.bottom).toBeCloseTo(0.025, 6);
    expect(stockroomInsetsPx(100, 400, 400).top).toBeLessThanOrEqual(0.4);
  });
});
