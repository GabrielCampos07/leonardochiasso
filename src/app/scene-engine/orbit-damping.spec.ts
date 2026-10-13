import { CAMERA_AZIMUTH_LIMIT, clampOrbitSpherical } from './camera-guide';
import {
  ORBIT_DAMPING_FACTOR,
  ORBIT_DAMPING_MAX_MS,
  ORBIT_INERTIA_MAX_RAD,
  ORBIT_PAN_MAX,
  ORBIT_SCALE_MAX,
  capOrbitInertia,
  clampDollyScale,
  clampFrameDelta,
  clampPanOffset,
  clampSphericalDelta,
  dampingFactorForDelta,
  hangerTooltipWhileCameraBusy,
  hoverSlugAfterCameraSettle,
  orbitDampingExpired,
  stopOrbitInertia,
  stopPanZoomInertia,
} from './orbit-damping';

describe('orbit damping', () => {
  it('is snappy enough that leftover dies in under 0.5s at 60 fps', () => {
    expect(ORBIT_DAMPING_FACTOR).toBeGreaterThanOrEqual(0.25);
    expect(ORBIT_DAMPING_MAX_MS).toBeLessThan(500);
    const leftover = Math.pow(1 - ORBIT_DAMPING_FACTOR, 30);
    expect(leftover).toBeLessThan(0.01);
  });

  it('scales the factor by frame delta so a stall cannot apply many steps', () => {
    expect(dampingFactorForDelta(1 / 60)).toBeCloseTo(ORBIT_DAMPING_FACTOR, 5);
    expect(clampFrameDelta(2)).toBe(1 / 30);
    expect(dampingFactorForDelta(2)).toBeCloseTo(dampingFactorForDelta(1 / 30), 5);
    expect(dampingFactorForDelta(1 / 120)).toBeLessThan(ORBIT_DAMPING_FACTOR);
  });

  it('caps leftover rotate / pan / dolly so a floor flick cannot coast', () => {
    const capped = clampSphericalDelta(2.2, 0.8);
    expect(Math.hypot(capped.theta, capped.phi)).toBeCloseTo(ORBIT_INERTIA_MAX_RAD, 5);
    expect(clampSphericalDelta(0.01, 0.01)).toEqual({ theta: 0.01, phi: 0.01 });
    const locked = clampOrbitSpherical(CAMERA_AZIMUTH_LIMIT + capped.theta, 0.4);
    expect(locked.theta).toBe(CAMERA_AZIMUTH_LIMIT);
    const pan = clampPanOffset(2, 0.4, 1.5);
    expect(Math.hypot(pan.x, pan.y, pan.z)).toBeCloseTo(ORBIT_PAN_MAX, 5);
    expect(clampDollyScale(1.4)).toBe(ORBIT_SCALE_MAX);
    expect(clampDollyScale(0.2)).toBeLessThan(1);
  });

  it('expires the settle window and zeros rotate, pan, and scale leftover', () => {
    expect(orbitDampingExpired(1000, 0)).toBeTrue();
    expect(orbitDampingExpired(1000, 1000)).toBeTrue();
    expect(orbitDampingExpired(999, 1000)).toBeFalse();
    const controls = {
      dampingFactor: 0.32,
      enableDamping: true,
      update: () => true,
      _sphericalDelta: { theta: 1, phi: 0.4, set(r: number) { this.theta = r; this.phi = r; } },
      _panOffset: { x: 2, y: 0.5, z: 1, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
      _scale: 1.8,
    };
    capOrbitInertia(controls);
    expect(Math.hypot(controls._sphericalDelta.theta, controls._sphericalDelta.phi)).toBeCloseTo(ORBIT_INERTIA_MAX_RAD, 5);
    expect(Math.hypot(controls._panOffset.x, controls._panOffset.y, controls._panOffset.z)).toBeCloseTo(ORBIT_PAN_MAX, 5);
    expect(controls._scale).toBe(ORBIT_SCALE_MAX);
    controls._scale = 1.8;
    controls._panOffset.set(2, 0.5, 1);
    stopPanZoomInertia(controls);
    expect(controls._panOffset.x).toBe(0);
    expect(controls._scale).toBe(1);
    expect(controls._sphericalDelta.theta).toBeGreaterThan(0);
    stopOrbitInertia(controls);
    expect(controls._sphericalDelta.theta).toBe(0);
    expect(controls._sphericalDelta.phi).toBe(0);
    expect(controls._panOffset.x).toBe(0);
    expect(controls._panOffset.y).toBe(0);
    expect(controls._panOffset.z).toBe(0);
    expect(controls._scale).toBe(1);
  });
});

describe('hanger tooltip while the camera moves', () => {
  it('hides during orbit / tween and allows a hover only after settle', () => {
    expect(hangerTooltipWhileCameraBusy(true)).toBeFalse();
    expect(hangerTooltipWhileCameraBusy(false)).toBeTrue();
  });

  it('re-raycasts only after settle and clears when the pointer is in a gap', () => {
    expect(hoverSlugAfterCameraSettle(true, 'look-obi-organza')).toBeNull();
    expect(hoverSlugAfterCameraSettle(false, 'look-obi-organza')).toBe('look-obi-organza');
    expect(hoverSlugAfterCameraSettle(false, null)).toBeNull();
  });
});
