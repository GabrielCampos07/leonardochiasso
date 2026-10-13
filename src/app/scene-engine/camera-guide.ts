import { UNCOLLECTED_RACK_ID } from './types';

export type CameraFocusMode = 'rack' | 'vitrine' | 'overview' | 'piece';

export interface FitBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CameraPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  distance: number;
}

export interface RackNavItem {
  id: string;
  name: string;
  index: number;
}

export const OVERVIEW_FOCUS_ID = 'all';
export const CAMERA_TWEEN_MS = 720;
/** Create / cancel / rise tweens stay inside the 400–700 ms band. */
export const CREATE_TWEEN_MS = 560;
/** Keep the lens above the wood floor (`collection-rack` FLOOR_Y = -0.7). */
export const CAMERA_MIN_Y = -0.45;
export const FIT_PAD_TOP = 0.08;
export const FIT_PAD_BOTTOM = 0.16;
export const FIT_PAD_SIDE = 0.075;
/** Extra pixels of air between the 3D content and overlaid chrome. */
export const CHROME_MARGIN_PX = 20;
/** Expand toward the sibling so its ellipsized name plate stays in the close-up frame. */
export const PIECE_NEIGHBOR_PAD = 0.4;

export interface ChromeInsets {
  /** Fraction of canvas height reserved at the top (header / badges). */
  top: number;
  /** Fraction of canvas height reserved at the bottom (collections bar). */
  bottom: number;
}

export function defaultChromeInsets(compact = false): ChromeInsets {
  return compact ? { top: 0.08, bottom: 0.26 } : { top: 0.05, bottom: 0.18 };
}

export function readSafeAreaInsets(): { top: number; bottom: number } {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return { top: 0, bottom: 0 };
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const top = Number.parseFloat(cs.paddingTop) || 0;
  const bottom = Number.parseFloat(cs.paddingBottom) || 0;
  probe.remove();
  return { top, bottom };
}

/** Canvas rect minus live overlays and safe-area insets. */
export function measureAtelierChrome(host: HTMLElement): ChromeInsets {
  const hostRect = host.getBoundingClientRect();
  const canvas = host.querySelector('canvas');
  const canvasRect = canvas?.getBoundingClientRect();
  const width = Math.max(hostRect.width || host.clientWidth || 0, canvasRect?.width || 0, 1);
  const height = Math.max(hostRect.height || host.clientHeight || 0, canvasRect?.height || 0, 1);
  const compact = isCompactAtelierViewport(width);
  const fallback = defaultChromeInsets(compact);
  const safe = readSafeAreaInsets();
  const frame = canvasRect && canvasRect.height > 1 ? canvasRect : hostRect;
  let top = fallback.top;
  let bottom = fallback.bottom;
  const overlay = host.querySelector('.admin-3d__chrome') as HTMLElement | null;
  if (overlay) {
    const fromTop = overlay.getBoundingClientRect().bottom - frame.top + safe.top;
    if (fromTop > 0 && fromTop < height * 0.4) {
      top = (fromTop + 8) / height;
    }
  } else {
    top = (fallback.top * height + safe.top) / height;
  }
  const guide = host.querySelector('.admin-3d__guide') as HTMLElement | null;
  if (guide) {
    const fromBottom = frame.bottom - guide.getBoundingClientRect().top + safe.bottom;
    if (fromBottom > 0 && fromBottom < height) {
      bottom = (fromBottom + CHROME_MARGIN_PX) / height;
    }
  } else {
    bottom = (fallback.bottom * height + safe.bottom) / height;
  }
  const add = host.querySelector('.admin-3d__add-piece') as HTMLElement | null;
  if (add) {
    const fromBottom = frame.bottom - add.getBoundingClientRect().top + safe.bottom;
    if (fromBottom > 0 && fromBottom < height) {
      bottom = Math.max(bottom, (fromBottom + 8) / height);
    }
  }
  applyAtelierChromeVars(host, { top, bottom }, height);
  return {
    top: Math.min(0.28, Math.max(0.04, top)),
    bottom: Math.min(0.46, Math.max(compact ? 0.2 : 0.14, bottom)),
  };
}

/** Pixel insets for the rail counter / CSS, written onto the scene host. */
export function applyAtelierChromeVars(
  host: HTMLElement,
  chrome: ChromeInsets,
  height = host.getBoundingClientRect().height || host.clientHeight || 1,
): void {
  const h = Math.max(1, height);
  host.style.setProperty('--lc-atelier-chrome-top', `${Math.round(chrome.top * h)}px`);
  host.style.setProperty('--lc-atelier-chrome-bottom', `${Math.round(chrome.bottom * h)}px`);
}

/** Frame the aimed hanger plus enough width for the neighbor's ellipsized plate. */
export function pieceFocusBox(
  bounds: FitBox,
  siblingIndex: number,
  siblingCount: number,
  neighborPad = PIECE_NEIGHBOR_PAD,
): FitBox {
  const towardNeighbor =
    siblingCount > 1 && siblingIndex >= 0 && siblingIndex < siblingCount / 2
      ? 1
      : siblingCount > 1
        ? -1
        : 0;
  return {
    minX: bounds.minX - 0.06 + (towardNeighbor < 0 ? -neighborPad : 0),
    maxX: bounds.maxX + 0.06 + (towardNeighbor > 0 ? neighborPad : 0),
    minY: bounds.minY - 0.05,
    maxY: bounds.maxY + 0.04,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  };
}
/** Side inset so hangers fill ~85% of the viewport width. */
export const FIT_WIDTH_MARGIN = 0.075;
/** Tight side air so a 4-column compact frame fills the phone width. */
export const FIT_WIDTH_MARGIN_COMPACT = 0.055;
/** Sit a compact focused rack higher so the wall does not eat the top 40%. */
export const COMPACT_RACK_RAISE = 0.5;
/** Portrait 8-col Organic needs ~23 units; the old 10 cap cropped the posts. */
export const RACK_MAX_DISTANCE_COMPACT = 26;
export const FIT_HANGER_FILL = 1 - FIT_WIDTH_MARGIN * 2;
/** Ver todas must back up far enough to keep Organic / Sem coleção in frame. */
export const OVERVIEW_MAX_DISTANCE = 48;
export const OVERVIEW_MAX_DISTANCE_COMPACT = 22;
export const OVERVIEW_FILL = 1.02;
export const OVERVIEW_FILL_COMPACT = 1;

/** ±70° around the front of the active unit — enough to orbit, not spin behind. */
export const CAMERA_AZIMUTH_LIMIT = (70 * Math.PI) / 180;
/** 48° above horizontal. */
export const CAMERA_POLAR_MIN = Math.PI / 2 - (48 * Math.PI) / 180;
/** 8° above horizontal. */
export const CAMERA_POLAR_MAX = Math.PI / 2 - (8 * Math.PI) / 180;
/** ~22° above horizontal — closer and lower than the old 34° look-down. */
export const VITRINE_ELEVATION = (22 * Math.PI) / 180;

export function isCompactAtelierViewport(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
): boolean {
  return width <= 768;
}

/** Phone portrait — stack racks instead of a side-by-side aisle. */
export function isPortraitAtelierViewport(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
  height = typeof window === 'undefined' ? 800 : window.innerHeight,
): boolean {
  return isCompactAtelierViewport(width) && height > width;
}

/** World-Y gap between stacked racks in Ver todas (one rack tall + air). */
export const PORTRAIT_STACK_PITCH = 2.42;
/** Pull the stack off the plaster so the wall never covers Organic. */
export const PORTRAIT_STACK_Z = 0.62;
export const PORTRAIT_OVERVIEW_FILL = 1.12;
export const PORTRAIT_OVERVIEW_ELEVATION = 0.035;

/** Same X, first collection on top, last rack standing on the floor. */
export function portraitStackOffset(index: number, count: number): { x: number; y: number; z: number } {
  if (count <= 1) return { x: 0, y: 0, z: PORTRAIT_STACK_Z };
  return { x: 0, y: (count - 1 - index) * PORTRAIT_STACK_PITCH, z: PORTRAIT_STACK_Z };
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Light spring for the new rack / vitrine rising from the floor. */
export function easeOutBack(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function stepRackIndex(current: number, delta: -1 | 1, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}

/** Collections in sortOrder, then "Sem coleção" last — same before and after reload. */
export function rackNavItems(
  racks: ReadonlyArray<{ id: string; name: string; sortOrder?: number }>,
): RackNavItem[] {
  const uncollected = racks.filter((rack) => rack.id === UNCOLLECTED_RACK_ID);
  const collected = racks
    .filter((rack) => rack.id !== UNCOLLECTED_RACK_ID)
    .slice()
    .sort((a, b) => {
      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (order !== 0) return order;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  return [...collected, ...uncollected].map((rack, index) => ({
    id: rack.id,
    name: rack.name,
    index,
  }));
}

/** Distance that fits `width` in the horizontal FOV, with a side margin on each edge. */
export function distanceToFitWidth(
  width: number,
  aspect: number,
  fovDeg: number,
  margin = FIT_WIDTH_MARGIN,
): number {
  const fov = (fovDeg * Math.PI) / 180;
  const visibleW = Math.max(0.4, 1 - margin * 2);
  return Math.max(0.4, width) / (2 * Math.tan(fov / 2) * Math.max(aspect, 0.2) * visibleW);
}

export function poseFromElevation(
  cx: number,
  cy: number,
  cz: number,
  distance: number,
  elevation: number,
): CameraPose {
  const eyeY = Math.max(CAMERA_MIN_Y, cy + Math.sin(elevation) * distance);
  const z = cz + Math.cos(elevation) * distance;
  return {
    position: { x: cx, y: eyeY, z },
    target: { x: cx, y: cy, z: cz },
    distance,
  };
}

/**
 * Fit the active rack so hangers fill ~85% of the *usable* viewport (canvas
 * minus header / collections bar). Height always wins when the sign + name
 * plates would otherwise sit under the bottom chrome.
 */
export function computeEyeLevelFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  mode: CameraFocusMode,
  compact = false,
  chrome?: ChromeInsets,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const cz = (box.minZ + box.maxZ) / 2;

  const pads = chrome ?? defaultChromeInsets(compact);
  const padTop = pads.top;
  const padBottom = pads.bottom;
  const visibleH = Math.max(0.38, 1 - padTop - padBottom);
  const fov = (fovDeg * Math.PI) / 180;
  const fill =
    mode === 'overview' ? (compact ? OVERVIEW_FILL_COMPACT : OVERVIEW_FILL) : mode === 'piece' ? 0.84 : 1;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = distanceToFitWidth(
    width,
    aspect,
    fovDeg,
    compact ? FIT_WIDTH_MARGIN_COMPACT : FIT_WIDTH_MARGIN,
  );
  const fitted = Math.max(fitH, fitW);
  let distance = fitted * fill + depth * (compact ? 0.08 : 0.1);
  if (mode === 'overview') {
    distance = Math.min(
      Math.max(distance, compact ? 2.6 : 3.8),
      compact ? OVERVIEW_MAX_DISTANCE_COMPACT : OVERVIEW_MAX_DISTANCE,
    );
  } else distance = Math.min(Math.max(distance, compact ? 1.55 : 1.35), compact ? RACK_MAX_DISTANCE_COMPACT : 10);

  const viewH = 2 * Math.tan(fov / 2) * distance;
  const bandCenter = pads.bottom + visibleH / 2;
  const bandShift = (0.5 - bandCenter) * viewH;
  let targetY = cy + bandShift - (mode === 'piece' ? 0.08 : 0);
  if (compact && mode === 'rack') {
    const slack = Math.max(0, viewH * visibleH - height);
    targetY -= height * COMPACT_RACK_RAISE + slack * 0.4;
  }
  const elevation = compact ? 0.07 : mode === 'piece' ? 0.3 : 0.22;
  return poseFromElevation(cx, targetY, cz, distance, elevation);
}

/**
 * Look-at Y that sits the fitted box in the usable band (above the collections
 * bar, below the header) instead of the raw viewport center.
 */
export function chromeBandTargetY(cy: number, height: number, chrome: ChromeInsets): number {
  const visibleH = Math.max(0.38, 1 - chrome.top - chrome.bottom);
  const bandCenter = chrome.bottom + visibleH / 2;
  return cy + ((0.5 - bandCenter) / visibleH) * height;
}

/**
 * Portrait Ver todas: fit the vertical stack in the usable band above the
 * bottom bar. Does not clamp to the compact aisle max of 22.
 */
export function computePortraitOverviewFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  chrome?: ChromeInsets,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  const pads = chrome ?? defaultChromeInsets(true);
  const visibleH = Math.max(0.38, 1 - pads.top - pads.bottom);
  const fov = (fovDeg * Math.PI) / 180;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = distanceToFitWidth(width, aspect, fovDeg, FIT_WIDTH_MARGIN_COMPACT);
  let distance = Math.max(fitH * PORTRAIT_OVERVIEW_FILL, fitW) + depth * 0.08;
  distance = Math.min(Math.max(distance, 2.2), OVERVIEW_MAX_DISTANCE);
  const targetY = cy + (chromeBandTargetY(cy, height, pads) - cy) * 0.4;
  return poseFromElevation(cx, targetY, cz, distance, PORTRAIT_OVERVIEW_ELEVATION);
}

/** Closer and a bit lower so tray photos fill the frame without the top shelf covering them. */
export function computeVitrineFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  compact = false,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = box.minY + height * (compact ? 0.4 : 0.38);
  const cz = (box.minZ + box.maxZ) / 2;
  const fov = (fovDeg * Math.PI) / 180;
  const visibleH = compact ? 0.82 : 0.74;
  const fill = 1;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = distanceToFitWidth(width, aspect, fovDeg, FIT_WIDTH_MARGIN);
  const fitted = Math.max(fitH, fitW);
  let distance = Math.max(fitted, compact ? 1.2 : 1.45) * fill + depth * 0.18;
  distance = Math.min(Math.max(distance, compact ? 1.2 : 1.45), compact ? 10 : 6);
  return poseFromElevation(cx, cy, cz, distance, VITRINE_ELEVATION);
}

/** Hard lock: azimuth ±70°, elevation 8–48° above horizontal. No roll. */
export function clampOrbitSpherical(theta: number, phi: number): { theta: number; phi: number } {
  return {
    theta: Math.min(CAMERA_AZIMUTH_LIMIT, Math.max(-CAMERA_AZIMUTH_LIMIT, theta)),
    phi: Math.min(CAMERA_POLAR_MAX, Math.max(CAMERA_POLAR_MIN, phi)),
  };
}

export function photoPlaneSize(
  imageWidth: number,
  imageHeight: number,
  maxW = 0.48,
  maxH = 0.64,
): { width: number; height: number } {
  const aspect = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 3 / 4;
  let height = maxH;
  let width = height * aspect;
  if (width > maxW) {
    width = maxW;
    height = width / aspect;
  }
  return { width, height };
}
