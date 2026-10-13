/** Per-call OrbitControls factor at 60 fps. 0.08 banked leftover and coasted for seconds. */
export const ORBIT_DAMPING_FACTOR = 0.32;
/** Hard stop so `change` → rAF cannot keep inertia alive. */
export const ORBIT_DAMPING_MAX_MS = 420;
/** Leftover spherical delta after a flick — ~4.5°, not a slingshot to the ±70° wall. */
export const ORBIT_INERTIA_MAX_RAD = 0.08;
export const ORBIT_DAMPING_REF_DT = 1 / 60;
export const ORBIT_DAMPING_MAX_DT = 1 / 30;

export function clampFrameDelta(dtSec: number, maxDt = ORBIT_DAMPING_MAX_DT): number {
  return Math.min(Math.max(dtSec, 0), maxDt);
}

/** Scale the 60 fps factor so one `update()` equals that much time, not one wall-clock stall. */
export function dampingFactorForDelta(
  dtSec: number,
  factor = ORBIT_DAMPING_FACTOR,
  refDt = ORBIT_DAMPING_REF_DT,
): number {
  const dt = clampFrameDelta(dtSec);
  const frames = dt / refDt;
  return 1 - Math.pow(1 - factor, frames);
}

export function clampSphericalDelta(
  theta: number,
  phi: number,
  maxRad = ORBIT_INERTIA_MAX_RAD,
): { theta: number; phi: number } {
  const mag = Math.hypot(theta, phi);
  if (mag <= maxRad || mag === 0) return { theta, phi };
  const scale = maxRad / mag;
  return { theta: theta * scale, phi: phi * scale };
}

export function orbitDampingExpired(now: number, until: number): boolean {
  return until <= 0 || now >= until;
}

export function hangerTooltipWhileCameraBusy(cameraBusy: boolean): boolean {
  return !cameraBusy;
}

/** OrbitControls r186 keeps leftover velocity on `_sphericalDelta`. */
export interface OrbitInertiaControls {
  dampingFactor: number;
  enableDamping: boolean;
  update(deltaTime?: number | null): boolean;
  _sphericalDelta?: { theta: number; phi: number; set: (radius: number, phi?: number, theta?: number) => void };
}

export function capOrbitInertia(
  controls: OrbitInertiaControls,
  maxRad = ORBIT_INERTIA_MAX_RAD,
): void {
  const delta = controls._sphericalDelta;
  if (!delta) return;
  const next = clampSphericalDelta(delta.theta, delta.phi, maxRad);
  delta.theta = next.theta;
  delta.phi = next.phi;
}

export function stopOrbitInertia(controls: OrbitInertiaControls): void {
  controls._sphericalDelta?.set(0, 0, 0);
}
