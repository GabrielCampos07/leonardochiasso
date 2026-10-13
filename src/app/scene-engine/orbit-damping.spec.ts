import { CAMERA_AZIMUTH_LIMIT, clampOrbitSpherical } from './camera-guide';
import {
  ORBIT_DAMPING_FACTOR,
  ORBIT_DAMPING_MAX_MS,
  ORBIT_INERTIA_MAX_RAD,
  capOrbitInertia,
  clampFrameDelta,
  clampSphericalDelta,
  dampingFactorForDelta,
  hangerTooltipWhileCameraBusy,
  orbitDampingExpired,
  stopOrbitInertia,
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

  it('caps leftover velocity so a flick cannot coast to a strong oblique view', () => {
    const capped = clampSphericalDelta(2.2, 0.8);
    expect(Math.hypot(capped.theta, capped.phi)).toBeCloseTo(ORBIT_INERTIA_MAX_RAD, 5);
    expect(clampSphericalDelta(0.01, 0.01)).toEqual({ theta: 0.01, phi: 0.01 });
    const locked = clampOrbitSpherical(CAMERA_AZIMUTH_LIMIT + capped.theta, 0.4);
    expect(locked.theta).toBe(CAMERA_AZIMUTH_LIMIT);
  });

  it('expires the settle window and can zero OrbitControls leftover', () => {
    expect(orbitDampingExpired(1000, 0)).toBeTrue();
    expect(orbitDampingExpired(1000, 1000)).toBeTrue();
    expect(orbitDampingExpired(999, 1000)).toBeFalse();
    const controls = { dampingFactor: 0.32, enableDamping: true, update: () => true, _sphericalDelta: { theta: 1, phi: 0.4, set(r: number) { this.theta = r; this.phi = r; } } };
    capOrbitInertia(controls);
    expect(Math.hypot(controls._sphericalDelta.theta, controls._sphericalDelta.phi)).toBeCloseTo(ORBIT_INERTIA_MAX_RAD, 5);
    stopOrbitInertia(controls);
    expect(controls._sphericalDelta.theta).toBe(0);
    expect(controls._sphericalDelta.phi).toBe(0);
  });
});

describe('hanger tooltip while the camera moves', () => {
  it('hides during orbit / tween and allows a hover only after settle', () => {
    expect(hangerTooltipWhileCameraBusy(true)).toBeFalse();
    expect(hangerTooltipWhileCameraBusy(false)).toBeTrue();
  });
});
