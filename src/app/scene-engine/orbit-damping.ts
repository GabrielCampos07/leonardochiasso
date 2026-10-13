/** Per-call OrbitControls factor at 60 fps. 0.08 banked leftover and coasted for seconds. */
export const ORBIT_DAMPING_FACTOR = 0.32;
/** Hard stop so `change` → rAF cannot keep inertia alive. */
export const ORBIT_DAMPING_MAX_MS = 420;
/** Leftover spherical delta after a flick — ~4.5°, not a slingshot to the ±70° wall. */
export const ORBIT_INERTIA_MAX_RAD = 0.08;
/** Leftover pan after a floor / two-finger drag. */
export const ORBIT_PAN_MAX = 0.05;
/** Per-frame dolly scale around 1 — inertial wheel must not explode. */
export const ORBIT_SCALE_MIN = 0.98;
export const ORBIT_SCALE_MAX = 1.02;
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

export function clampPanOffset(
  x: number,
  y: number,
  z: number,
  max = ORBIT_PAN_MAX,
): { x: number; y: number; z: number } {
  const mag = Math.hypot(x, y, z);
  if (mag <= max || mag === 0) return { x, y, z };
  const scale = max / mag;
  return { x: x * scale, y: y * scale, z: z * scale };
}

export function clampDollyScale(scale: number): number {
  if (!Number.isFinite(scale) || scale === 0) return 1;
  return Math.min(ORBIT_SCALE_MAX, Math.max(ORBIT_SCALE_MIN, scale));
}

export function orbitDampingExpired(now: number, until: number): boolean {
  return until <= 0 || now >= until;
}

export function hangerTooltipWhileCameraBusy(cameraBusy: boolean): boolean {
  return !cameraBusy;
}

/** Off while leftover inertia dies; back on at settle and on the next pointerdown / wheel. */
export function shouldEnableOrbitZoom(
  phase: 'release' | 'settle' | 'pointerdown' | 'wheel',
): boolean {
  return phase !== 'release';
}

/** Cap leftover only after release. Live drag must keep the full rotate delta (wall orbit). */
export function shouldCapOrbitInertia(liveDrag: boolean): boolean {
  return !liveDrag;
}

/** Resize must not restore the boot / focus pose after the user has orbited. */
export function shouldRefitOnResize(input: {
  userOrbited: boolean;
  interacting: boolean;
  settling: boolean;
}): boolean {
  return !input.userOrbited && !input.interacting && !input.settling;
}

/** After settle: current pick or clear. Never keep a slug from a moving camera. */
export function hoverSlugAfterCameraSettle(cameraBusy: boolean, slug: string | null): string | null {
  if (cameraBusy) return null;
  return slug;
}

/** OrbitControls r186 leftover rotate / pan / dolly. */
export interface OrbitInertiaControls {
  dampingFactor: number;
  enableDamping: boolean;
  enableZoom?: boolean;
  update(deltaTime?: number | null): boolean;
  _sphericalDelta?: { theta: number; phi: number; set: (radius: number, phi?: number, theta?: number) => void };
  _panOffset?: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
  _scale?: number;
}

export function capOrbitInertia(
  controls: OrbitInertiaControls,
  maxRad = ORBIT_INERTIA_MAX_RAD,
): void {
  const delta = controls._sphericalDelta;
  if (delta) {
    const next = clampSphericalDelta(delta.theta, delta.phi, maxRad);
    delta.theta = next.theta;
    delta.phi = next.phi;
  }
  const pan = controls._panOffset;
  if (pan) {
    const next = clampPanOffset(pan.x, pan.y, pan.z);
    pan.x = next.x;
    pan.y = next.y;
    pan.z = next.z;
  }
  if (typeof controls._scale === 'number') {
    controls._scale = clampDollyScale(controls._scale);
  }
}

export function stopPanZoomInertia(controls: OrbitInertiaControls): void {
  controls._panOffset?.set(0, 0, 0);
  if (typeof controls._scale === 'number') controls._scale = 1;
}

export function stopOrbitInertia(controls: OrbitInertiaControls): void {
  controls._sphericalDelta?.set(0, 0, 0);
  stopPanZoomInertia(controls);
}
