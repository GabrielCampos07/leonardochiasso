import {
  AmbientLight,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  LoadingManager,
  MOUSE,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TOUCH,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAtelierLoadingManager, loadGlb } from '../atelier-assets';
import { OVERVIEW_FOCUS_ID, easeInOutCubic } from '../camera-guide';
import { disposeRenderer } from '../dispose';
import type {
  AtelierEngine,
  DraftAnchorHandler,
  EmptyUnitHandler,
  FirstFrameHandler,
  FocusChangeHandler,
  HangerHoverHandler,
  HangerPickHandler,
  LoadProgressHandler,
  PanChangeHandler,
  SceneCompleteHandler,
} from '../engine-contract';
import { insertUnitBeforeUncollected, removeUnitFromLayout } from '../mapping';
import { HIDDEN_ON_SITE_SUFFIX } from '../hanger-price';
import { makePhotoMaterial, applyPhotoMap } from '../photo-material';
import { hangerTextureUrls, type HangerTextureQuality } from '../photo-url';
import { EMPTY_RACK_PAN, type RackPanProgress } from '../rack-pan';
import {
  applyCanvasHostCss,
  atelierPixelRatio,
  forceNonPassiveCanvasListeners,
  hostDrawingSize,
  type SceneEngineOptions,
} from '../canvas-host';
import { isSharedTexture, photoTextureCache } from '../texture-cache';
import {
  TEXTURE_BITMAP_FULL_H,
  TEXTURE_BITMAP_FULL_W,
  loadTextureCandidates,
  makeFallbackTexture,
  makePlaceholderTexture,
  makeUnavailableTexture,
} from '../texture-loader';
import type { SceneHanger, SceneLayout, SceneRack, SceneUnitKind } from '../types';
import { DRAFT_UNIT_ID } from '../unit-layout';
import { isWebGLAvailable, tryCreate } from '../webgl-support';
import { SKETCHFAB_KIT } from './stockroom-kit-sketchfab';
import { placeMatrix, type KitBuilder, type PlaceOptions, type StockroomKit } from './stockroom-kit';
import {
  STOCKROOM_AZIMUTH_DEFAULT,
  STOCKROOM_AZIMUTH_LIMIT,
  STOCKROOM_AZIMUTH_SHELF,
  STOCKROOM_CAMERA_DISTANCE,
  STOCKROOM_FRUSTUM_HALF,
  STOCKROOM_MIN_PHOTO_PX,
  STOCKROOM_POLAR_DEFAULT,
  STOCKROOM_POLAR_MAX,
  STOCKROOM_POLAR_PIECE,
  STOCKROOM_POLAR_MIN,
  STOCKROOM_POLAR_SHELF,
  STOCKROOM_SIDE_INSET,
  STOCKROOM_TWEEN_MS,
  STOCKROOM_WINDOW_TOP_PX,
  clampStockroomTarget,
  fitOrthoBox,
  lerpPose,
  offsetDirection,
  stockroomInsetsPx,
  stockroomZoomLimits,
  uprightScreenPx,
  viewBasis,
  type StockroomInsets,
  type StockroomPose,
} from './stockroom-camera';
import {
  areaTint,
  boxBadge,
  boxPhotoTint,
  makeBadgeTexture,
  makeSignTexture,
  type BoxBadgeKind,
} from './stockroom-labels';
import {
  AREA_BACK_INSET,
  SIGN_H,
  SIGN_TILT,
  bayWindowBox,
  clampBayWindow,
  planStockroom,
  signY,
  slotFocusBox,
  slotsInWindow,
  type StockroomArea,
  type StockroomPlan,
  type StockroomUnitInput,
} from './stockroom-layout';

export { placeMatrix } from './stockroom-kit';

export interface StockroomEngineOptions extends SceneEngineOptions {
  /** Models and bay geometry (default `SKETCHFAB_KIT`). */
  kit?: StockroomKit;
  /** First camera: the first collection's bays (default) or the whole room. */
  initialFocus?: 'first' | 'overview';
}

/** Collection name pinned above its bays, in canvas-local CSS px (bottom-centre anchor). */
export interface StockroomAreaLabel {
  id: string;
  name: string;
  count: number;
  unpublished: boolean;
  draft: boolean;
  focused: boolean;
  x: number;
  y: number;
}

/** Caption over a piece photo, in canvas-local CSS px (photo rect). */
export interface StockroomPieceLabel {
  slug: string;
  name: string;
  price: string;
  badge: BoxBadgeKind;
  badgeText: string;
  hover: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StockroomOverlay {
  width: number;
  height: number;
  areas: StockroomAreaLabel[];
  pieces: StockroomPieceLabel[];
}

export type StockroomOverlayHandler = (overlay: StockroomOverlay) => void;

/** Photos shorter than this on screen keep their painted 3D badge and get no HTML caption. */
export const STOCKROOM_CAPTION_MIN_PX = 90;
const HOVER_OUTLINE = 0x2563eb;
/** Bay windows hug the piece fronts, so they need less fit padding than whole-room views. */
const WINDOW_FIT_PAD = 1.04;
/** A wider window may cost this much zoom (≈ photo size) and still count as "fits". */
const WINDOW_ZOOM_SLACK = 0.97;
/** Thin ring on a mouse hover that is not the Shift+→ overlay target. */
export const STOCKROOM_HOVER_OUTLINE_PAD = 0.07;
/** Wider ring on the captioned overlay piece Shift+←/→ will move. */
export const STOCKROOM_SHIFT_TARGET_OUTLINE_PAD = 0.16;

export function outlinePadForHover(captioned: boolean): number {
  return captioned ? STOCKROOM_SHIFT_TARGET_OUTLINE_PAD : STOCKROOM_HOVER_OUTLINE_PAD;
}

const CLEAR = 0xd9d2c7;
const SHARED = 'stockroomShared';
const TAP_MAX_PX = 6;
const TAP_MAX_MS = 650;
const ARCHIVE_MS = 500;
const POP_MS = 420;
const PHOTO_CONCURRENCY = 6;
const NON_PASSIVE: AddEventListenerOptions = { passive: false };

interface BoxNode {
  group: Group;
  photo: Mesh<PlaneGeometry, MeshBasicMaterial>;
  badge: Mesh<PlaneGeometry, MeshBasicMaterial>;
  outline: Mesh<PlaneGeometry, MeshBasicMaterial>;
  hanger: SceneHanger;
  areaId: string;
}

interface PhotoEntry {
  texture: Texture;
  quality: HangerTextureQuality;
  key: string;
}

interface Tween {
  from: StockroomPose;
  to: StockroomPose;
  start: number;
  duration: number;
  done?: () => void;
}

interface Anim {
  start: number;
  duration: number;
  step: (t: number) => void;
  done?: () => void;
}

type Focus = { kind: 'overview' } | { kind: 'area'; id: string } | { kind: 'piece'; slug: string };

function photoKey(hanger: Pick<SceneHanger, 'imageUrl' | 'thumbUrl'>): string {
  return `${hanger.thumbUrl ?? ''}|${hanger.imageUrl ?? ''}`;
}

/** Free geometries / materials / textures we own. Shared template GPU data and cached photos stay. */
function disposeOwned(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (!child.geometry?.userData?.[SHARED]) child.geometry?.dispose();
    const materials = (Array.isArray(child.material) ? child.material : [child.material]) as Material[];
    for (const material of materials) {
      if (!material || material.userData?.[SHARED]) continue;
      const map = (material as MeshBasicMaterial).map;
      if (map && !isSharedTexture(map)) map.dispose();
      material.dispose();
    }
  });
}

/**
 * Stockroom admin scene for `/admin/3d`: hangers on wall rails (Sketchfab CC-BY
 * models over a Kenney CC0 shell; the kit decides the models). One floor area per collection, one piece per product with its photo large and a
 * stock badge, orthographic top-down iso camera with clamped rotation.
 */
export class StockroomEngine implements AtelierEngine {
  readonly kit: StockroomKit;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly reducedMotion: boolean;
  private readonly manager: LoadingManager;
  private readonly roomRoot = new Group();
  private readonly areasRoot = new Group();
  private readonly keyLight: DirectionalLight;
  private readonly templates = new Map<string, { root: Group; bbox: Box3 }>();
  private readonly sharedGpu = new Map<string, BufferGeometry | Material>();
  private readonly builder: KitBuilder;
  private readonly assetsReady: Promise<void>;
  private readonly areaNodes = new Map<string, Group>();
  private readonly boxes = new Map<string, BoxNode>();
  private readonly photos = new Map<string, PhotoEntry>();
  private readonly photoPending = new Set<string>();
  /** slug → photo key that failed, so rebuilds do not refetch a dead URL. */
  private readonly photoFailed = new Map<string, string>();
  private readonly anims = new Set<Anim>();
  private readonly photoGeometry: PlaneGeometry;
  private readonly badgeGeometry: PlaneGeometry;
  private readonly outlineGeometry: PlaneGeometry;
  private readonly shiftOutlineGeometry: PlaneGeometry;
  private readonly initialFocus: 'first' | 'overview';
  /** areaId → first bay of the framed window. */
  private readonly bayStart = new Map<string, number>();
  private readonly restoreAddEventListener: (() => void) | null;
  private resizeObserver: ResizeObserver | null = null;

  private layout: SceneLayout = { racks: [] };
  private draft: { kind: SceneUnitKind; name: string } | null = null;
  private plan: StockroomPlan;
  private focus: Focus = { kind: 'overview' };
  private focusedId = OVERVIEW_FOCUS_ID;
  private insets: StockroomInsets = stockroomInsetsPx(720);
  private overviewZoom = 1;
  private defaultFocusPending = true;
  private overlayKey = '';
  private lastOverlay: StockroomOverlay = { width: 0, height: 0, areas: [], pieces: [] };
  private tween: Tween | null = null;
  private userMoved = false;
  private needsRender = true;
  private raf = 0;
  private started = false;
  private built = false;
  private assetsLoaded = false;
  private firstFrameSent = false;
  private sceneCompleteSent = false;
  private disposed = false;
  private photoActive = 0;
  private readonly photoQueue: Array<{ slug: string; quality: HangerTextureQuality }> = [];
  private down: { x: number; y: number; t: number; id: number } | null = null;
  private hoverSlug: string | null = null;
  private hoverQueued: { x: number; y: number } | null = null;
  private lastSize = { width: 0, height: 0 };

  private onClickCb: HangerPickHandler | null = null;
  private onHoverCb: HangerHoverHandler | null = null;
  private onFocusCb: FocusChangeHandler | null = null;
  private onFirstFrameCb: FirstFrameHandler | null = null;
  private onSceneCompleteCb: SceneCompleteHandler | null = null;
  private onProgressCb: LoadProgressHandler | null = null;
  private onDraftAnchorCb: DraftAnchorHandler | null = null;
  private onEmptyUnitCb: EmptyUnitHandler | null = null;
  private onPanCb: PanChangeHandler | null = null;
  private onOverlayCb: StockroomOverlayHandler | null = null;

  constructor(canvas: HTMLCanvasElement, options: StockroomEngineOptions = {}) {
    this.kit = options.kit ?? SKETCHFAB_KIT;
    this.initialFocus = options.initialFocus ?? 'first';
    this.plan = planStockroom([], this.kit.bay);
    this.photoGeometry = new PlaneGeometry(this.kit.photo.w, this.kit.photo.h);
    this.badgeGeometry = new PlaneGeometry(this.kit.photo.w, this.kit.badge.h);
    this.outlineGeometry = new PlaneGeometry(
      this.kit.photo.w + STOCKROOM_HOVER_OUTLINE_PAD,
      this.kit.photo.h + STOCKROOM_HOVER_OUTLINE_PAD,
    );
    this.shiftOutlineGeometry = new PlaneGeometry(
      this.kit.photo.w + STOCKROOM_SHIFT_TARGET_OUTLINE_PAD,
      this.kit.photo.h + STOCKROOM_SHIFT_TARGET_OUTLINE_PAD,
    );
    this.builder = {
      bbox: (id) => this.templates.get(id)?.bbox ?? null,
      clone: (id, tint) => this.cloneAsset(id, tint),
      place: (id, pos, opts) => this.placeAsset(id, pos, opts),
      instance: (id, matrices, castShadow) => this.instanceAsset(id, matrices, castShadow),
      shared: (key, make) => this.sharedResource(key, make),
    };
    this.canvas = canvas;
    this.host = options.host ?? canvas.parentElement ?? canvas;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.manager = createAtelierLoadingManager((loaded, total) => this.onProgressCb?.(loaded, total));

    this.scene.background = new Color(CLEAR);
    const half = STOCKROOM_FRUSTUM_HALF;
    this.camera = new OrthographicCamera(-half, half, half, -half, 0.1, 200);

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(atelierPixelRatio(this.reducedMotion));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(CLEAR, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    this.restoreAddEventListener = forceNonPassiveCanvasListeners(canvas);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !this.reducedMotion;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = false;
    this.controls.zoomToCursor = true;
    this.controls.minPolarAngle = STOCKROOM_POLAR_MIN;
    this.controls.maxPolarAngle = STOCKROOM_POLAR_MAX;
    this.controls.minAzimuthAngle = -STOCKROOM_AZIMUTH_LIMIT;
    this.controls.maxAzimuthAngle = STOCKROOM_AZIMUTH_LIMIT;
    this.controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    this.controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('change', this.onControlsChange);
    this.applyPose({
      polar: STOCKROOM_POLAR_DEFAULT,
      azimuth: STOCKROOM_AZIMUTH_DEFAULT,
      target: new Vector3(),
      zoom: 1,
    });

    this.scene.add(new AmbientLight(0xfff8ee, 0.75));
    this.scene.add(new HemisphereLight(0xfffaf2, 0xb8ab98, 0.85));
    const key = new DirectionalLight(0xfff2de, 1.55);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.keyLight = key;
    this.scene.add(key, key.target);

    this.roomRoot.name = 'stockroom-room';
    this.areasRoot.name = 'stockroom-areas';
    this.scene.add(this.roomRoot, this.areasRoot);
    this.photoGeometry.userData[SHARED] = true;
    this.badgeGeometry.userData[SHARED] = true;
    this.outlineGeometry.userData[SHARED] = true;
    this.shiftOutlineGeometry.userData[SHARED] = true;

    this.assetsReady = this.loadAssets();

    canvas.addEventListener('pointerdown', this.onPointerDown, NON_PASSIVE);
    canvas.addEventListener('pointermove', this.onPointerMove, NON_PASSIVE);
    canvas.addEventListener('pointerup', this.onPointerUp, NON_PASSIVE);
    canvas.addEventListener('pointerleave', this.onPointerLeave, NON_PASSIVE);
    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host);
    }
    applyCanvasHostCss(canvas);
    this.resize();
  }

  onClick(handler: HangerPickHandler): void {
    this.onClickCb = handler;
  }

  onHover(handler: HangerHoverHandler): void {
    this.onHoverCb = handler;
  }

  onFocusChange(handler: FocusChangeHandler): void {
    this.onFocusCb = handler;
  }

  onFirstFrame(handler: FirstFrameHandler): void {
    this.onFirstFrameCb = handler;
  }

  onSceneComplete(handler: SceneCompleteHandler): void {
    this.onSceneCompleteCb = handler;
  }

  onLoadProgress(handler: LoadProgressHandler): void {
    this.onProgressCb = handler;
  }

  onDraftAnchor(handler: DraftAnchorHandler): void {
    this.onDraftAnchorCb = handler;
  }

  onEmptyUnit(handler: EmptyUnitHandler): void {
    this.onEmptyUnitCb = handler;
  }

  onPanChange(handler: PanChangeHandler): void {
    this.onPanCb = handler;
  }

  /** Fires after a render whenever the HTML labels (collection names, piece captions) move. */
  onOverlay(handler: StockroomOverlayHandler | null): void {
    this.onOverlayCb = handler;
    this.overlayKey = '';
    this.requestRender();
  }

  /** Page the focused collection's bay window when it has more bays than fit legibly. */
  panRack(delta: -1 | 1): boolean {
    const step = this.bayStep(delta);
    if (!step) return false;
    this.bayStart.set(step.area.id, step.start);
    this.userMoved = false;
    const pose = this.areaPose(step.area.id);
    if (pose) this.moveTo(pose, this.reducedMotion);
    this.onPanCb?.();
    return true;
  }

  canPan(delta: -1 | 1): boolean {
    return this.bayStep(delta) !== null;
  }

  rackPanState(): RackPanProgress {
    const area = this.focusedArea();
    if (!area || !area.slots.length) return { ...EMPTY_RACK_PAN };
    const win = this.bayWindow(area);
    if (win.count >= area.bayX.length) return { ...EMPTY_RACK_PAN };
    const slots = slotsInWindow(area, win.start, win.count);
    const total = area.slots.length;
    const first = slots.length ? slots[0]!.index + 1 : 0;
    const last = slots.length ? slots[slots.length - 1]!.index + 1 : 0;
    return {
      first,
      last,
      total,
      label: `${first}–${last} de ${total}`,
      canPrev: win.start > 0,
      canNext: win.start + win.count < area.bayX.length,
      showChrome: true,
    };
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Read-only state for specs and screenshots. */
  focusedRackId(): string {
    return this.focusedId;
  }

  areaIds(): string[] {
    return this.plan.areas.map((a) => a.id);
  }

  cameraZoom(): number {
    return this.camera.zoom;
  }

  isCameraTweening(): boolean {
    return this.tween !== null;
  }

  /** Client-space centre of a box's photo, or null when it is not mounted. */
  boxScreenPoint(slug: string): { x: number; y: number } | null {
    const node = this.boxes.get(slug);
    if (!node) return null;
    this.camera.updateMatrixWorld(true);
    node.photo.updateMatrixWorld(true);
    const p = node.photo.getWorldPosition(new Vector3()).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  /** Badge kind painted on a piece (`draft` / `soldout` / `stock`), or null when it is not mounted. */
  areaUnpublished(id: string): boolean {
    return this.areaNodes.get(id)?.getObjectByName('sign')?.userData['unpublished'] === true;
  }

  pieceBadge(slug: string): string | null {
    return (this.boxes.get(slug)?.badge.userData['badge'] as string | undefined) ?? null;
  }

  /** Canvas-local CSS px rect of a piece photo, or null when it is not mounted. */
  pieceScreenRect(slug: string): { x: number; y: number; w: number; h: number; edge: number } | null {
    const node = this.boxes.get(slug);
    if (!node) return null;
    this.camera.updateMatrixWorld(true);
    const top = node.photo.localToWorld(new Vector3(-this.kit.photo.w / 2, this.kit.photo.h / 2, 0));
    const bottom = node.photo.localToWorld(new Vector3(-this.kit.photo.w / 2, -this.kit.photo.h / 2, 0));
    const a = this.project(top.x, top.y, top.z);
    const b = this.project(bottom.x, bottom.y, bottom.z);
    return { ...this.photoRect(node), edge: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  /** Latest overlay frame (also pushed through `onOverlay`). */
  overlay(): StockroomOverlay {
    return this.lastOverlay;
  }

  /** Bays framed for a collection right now: `[start, start + count)`. */
  areaBayWindow(id: string): { start: number; count: number; total: number } | null {
    const area = this.plan.areas.find((a) => a.id === id);
    if (!area) return null;
    return { ...this.bayWindow(area), total: area.bayX.length };
  }

  isHoverOutlined(slug: string): boolean {
    return this.boxes.get(slug)?.outline.visible === true;
  }

  /** Client-space point on an area's rug, in front of its bays. */
  areaScreenPoint(id: string): { x: number; y: number } | null {
    const area = this.plan.areas.find((a) => a.id === id);
    if (!area) return null;
    this.camera.updateMatrixWorld(true);
    const p = new Vector3(area.x, 0.02, area.z + area.depth / 2 - 0.3).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  setLayout(layout: SceneLayout): void {
    this.layout = { racks: layout.racks.map((r) => ({ ...r, hangers: [...r.hangers] })) };
    if (this.focusedId !== OVERVIEW_FOCUS_ID && !this.layout.racks.some((r) => r.id === this.focusedId)) {
      this.focus = { kind: 'overview' };
      this.userMoved = false;
      this.setFocusedId(OVERVIEW_FOCUS_ID);
      this.defaultFocusPending = true;
    }
    void this.assetsReady.then(() => {
      if (this.disposed) return;
      const first = !this.built;
      this.rebuild();
      this.applyDefaultFocus();
      this.refocus(first || this.reducedMotion);
    });
  }

  /** First build (or the focused collection vanished): land on the first collection, not the room. */
  private applyDefaultFocus(): void {
    if (!this.defaultFocusPending) return;
    this.defaultFocusPending = false;
    if (this.initialFocus !== 'first' || this.focus.kind !== 'overview') return;
    const first = this.plan.areas.find((a) => a.id !== DRAFT_UNIT_ID);
    if (!first) return;
    this.focus = { kind: 'area', id: first.id };
    this.userMoved = false;
    this.setFocusedId(first.id);
    this.upgradeArea(first.id);
  }

  resize(): void {
    if (this.disposed) return;
    const size = hostDrawingSize(this.host);
    if (!size) return;
    const changed = size.width !== this.lastSize.width || size.height !== this.lastSize.height;
    this.lastSize = size;
    this.renderer.setPixelRatio(atelierPixelRatio(this.reducedMotion));
    this.renderer.setSize(size.width, size.height, false);
    applyCanvasHostCss(this.canvas);
    this.applyFrustum();
    this.insets = stockroomInsetsPx(size.height);
    if (changed && this.built && !this.userMoved) this.refocus(true);
    this.requestRender();
  }

  /** The nav lives outside the canvas, so only the fixed label / floor bands are kept free. */
  refitToChrome(): void {
    if (this.disposed) return;
    this.insets = stockroomInsetsPx(this.lastSize.height || this.host.clientHeight);
    if (this.built && !this.userMoved) this.refocus(true);
  }

  focusOverview(immediate = this.reducedMotion): void {
    this.focus = { kind: 'overview' };
    this.userMoved = false;
    this.setFocusedId(OVERVIEW_FOCUS_ID);
    if (!this.built) return;
    this.moveTo(this.overviewPose(), immediate);
  }

  focusRack(id: string, immediate = this.reducedMotion): void {
    if (id === OVERVIEW_FOCUS_ID) {
      this.focusOverview(immediate);
      return;
    }
    if (this.built && !this.plan.areas.some((a) => a.id === id)) return;
    this.focus = { kind: 'area', id };
    this.userMoved = false;
    this.setFocusedId(id);
    if (!this.built) return;
    const pose = this.areaPose(id);
    if (pose) this.moveTo(pose, immediate);
    this.upgradeArea(id);
  }

  focusHanger(slug: string, immediate = this.reducedMotion): boolean {
    const area = this.plan.areas.find((a) => a.slots.some((s) => s.slug === slug));
    if (!area || !this.built) return false;
    this.focus = { kind: 'piece', slug };
    this.userMoved = false;
    const slot = area.slots.find((s) => s.slug === slug)!;
    const win = this.bayWindow(area);
    if (slot.bay < win.start || slot.bay >= win.start + win.count) this.bayStart.set(area.id, slot.bay);
    this.setFocusedId(area.id);
    const pose = this.piecePose(slug);
    if (pose) this.moveTo(pose, immediate);
    this.upgradeArea(area.id);
    return true;
  }

  showDraft(kind: SceneUnitKind, name: string, immediate = this.reducedMotion): { x: number; y: number } {
    this.draft = { kind, name };
    if (!this.built) return { x: 24, y: 24 };
    this.rebuild();
    this.focus = { kind: 'area', id: DRAFT_UNIT_ID };
    this.userMoved = false;
    this.setFocusedId(DRAFT_UNIT_ID);
    const pose = this.areaPose(DRAFT_UNIT_ID);
    if (!pose) return { x: 24, y: 24 };
    const anchor = this.draftAnchor(pose);
    this.moveTo(pose, immediate, () => this.onDraftAnchorCb?.(this.draftAnchor(this.currentPose())));
    return anchor;
  }

  setDraftName(name: string): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, name };
    const sign = this.areaNodes.get(DRAFT_UNIT_ID)?.getObjectByName('sign') as Mesh | undefined;
    if (sign) {
      const material = sign.material as MeshBasicMaterial;
      material.map?.dispose();
      const plane = sign.geometry as PlaneGeometry;
      material.map = makeSignTexture(name, 0, true, plane.parameters.width / plane.parameters.height);
      material.needsUpdate = true;
    }
    this.requestRender();
  }

  clearDraft(immediate = this.reducedMotion): void {
    if (!this.draft) return;
    this.draft = null;
    this.onDraftAnchorCb?.(null);
    this.rebuild();
    this.focusOverview(immediate);
  }

  commitDraft(unit: SceneRack, immediate = this.reducedMotion): void {
    this.draft = null;
    this.layout = insertUnitBeforeUncollected(this.layout, { ...unit, hangers: [...unit.hangers] });
    this.onDraftAnchorCb?.(null);
    this.rebuild();
    this.focusRack(unit.id, immediate);
  }

  addHanger(next: SceneHanger, immediate = this.reducedMotion): void {
    this.layout = upsertHanger(this.layout, next);
    this.rebuild();
    this.refocus(immediate);
    const node = this.boxes.get(next.slug);
    if (node && !immediate) {
      node.group.scale.setScalar(0.001);
      this.animate(POP_MS, (t) => node.group.scale.setScalar(Math.max(0.001, easeOutBackSoft(t))));
    }
  }

  updateHanger(next: SceneHanger): void {
    const prev = this.boxes.get(next.slug);
    this.layout = upsertHanger(this.layout, next);
    if (prev && prev.hanger.rackId === next.rackId) {
      prev.hanger = next;
      this.paintBox(prev);
      if (this.photos.get(next.slug)?.key !== photoKey(next)) {
        this.dropPhoto(next.slug);
        this.queuePhoto(next.slug, this.isFocusedArea(prev.areaId) ? 'full' : 'thumb');
      }
      this.requestRender();
      return;
    }
    this.rebuild();
    this.refocus(this.reducedMotion);
  }

  reorderHangers(rackId: string, slugs: readonly string[]): boolean {
    const rack = this.layout.racks.find((r) => r.id === rackId);
    if (!rack || rack.hangers.length !== slugs.length) return false;
    const bySlug = new Map(rack.hangers.map((h) => [h.slug, h]));
    const hangers = slugs.map((slug) => bySlug.get(slug)).filter((h): h is NonNullable<typeof h> => Boolean(h));
    if (hangers.length !== rack.hangers.length) return false;
    this.layout = {
      racks: this.layout.racks.map((r) => (r.id === rackId ? { ...r, hangers } : r)),
    };
    if (!this.assetsLoaded || this.disposed) return true;
    this.plan = planStockroom(this.units(), this.kit.bay);
    const area = this.plan.areas.find((a) => a.id === rackId);
    if (!area) {
      this.rebuild();
      return true;
    }
    for (const slot of area.slots) {
      const node = this.boxes.get(slot.slug);
      if (!node) continue;
      node.group.position.set(slot.x, slot.y, slot.z);
      node.group.updateMatrixWorld(true);
    }
    this.requestRender();
    return true;
  }

  removeHanger(slug: string, immediate = this.reducedMotion): void {
    const node = this.boxes.get(slug);
    const finish = () => {
      if (this.disposed) return;
      this.layout = {
        racks: this.layout.racks.map((r) => ({ ...r, hangers: r.hangers.filter((h) => h.slug !== slug) })),
      };
      this.dropPhoto(slug);
      this.rebuild();
      this.refocus(this.reducedMotion);
    };
    if (!node || immediate) {
      finish();
      return;
    }
    this.animate(ARCHIVE_MS, (t) => {
      node.group.scale.setScalar(Math.max(0.001, 1 - easeInOutCubic(t)));
      node.group.position.y += 0.012;
    }, finish);
  }

  sinkUnit(id: string, immediate = this.reducedMotion): void {
    const group = this.areaNodes.get(id);
    const finish = () => {
      if (this.disposed) return;
      this.layout = removeUnitFromLayout(this.layout, id);
      this.rebuild();
      this.focusOverview(immediate);
    };
    if (!group || immediate) {
      finish();
      return;
    }
    this.animate(ARCHIVE_MS, (t) => {
      const k = easeInOutCubic(t);
      group.position.y = -this.kit.bay.height * k;
      group.scale.y = Math.max(0.001, 1 - k);
    }, finish);
  }

  restoreUnit(unit: SceneRack): void {
    this.layout = insertUnitBeforeUncollected(this.layout, { ...unit, hangers: [...unit.hangers] });
    this.rebuild();
    this.refocus(this.reducedMotion);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown, NON_PASSIVE);
    this.canvas.removeEventListener('pointermove', this.onPointerMove, NON_PASSIVE);
    this.canvas.removeEventListener('pointerup', this.onPointerUp, NON_PASSIVE);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave, NON_PASSIVE);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.dispose();
    this.restoreAddEventListener?.();
    this.clearAreas();
    disposeOwned(this.roomRoot);
    for (const { texture } of this.photos.values()) photoTextureCache.release(texture);
    this.photos.clear();
    this.photoQueue.length = 0;
    this.anims.clear();
    for (const { root } of this.templates.values()) {
      root.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        child.geometry.dispose();
        for (const m of (Array.isArray(child.material) ? child.material : [child.material]) as Material[]) {
          for (const value of Object.values(m)) if (value instanceof Texture) value.dispose();
          m.dispose();
        }
      });
    }
    this.photoGeometry.dispose();
    this.badgeGeometry.dispose();
    this.outlineGeometry.dispose();
    this.shiftOutlineGeometry.dispose();
    for (const resource of this.sharedGpu.values()) resource.dispose();
    this.sharedGpu.clear();
    photoTextureCache.clear();
    disposeRenderer(this.renderer);
    this.onClickCb = null;
    this.onHoverCb = null;
    this.onFocusCb = null;
    this.onFirstFrameCb = null;
    this.onSceneCompleteCb = null;
    this.onProgressCb = null;
    this.onDraftAnchorCb = null;
    this.onEmptyUnitCb = null;
    this.onPanCb = null;
    this.onOverlayCb = null;
  }

  // ---------------------------------------------------------------- assets

  private async loadAssets(): Promise<void> {
    const assets = this.kit.assets;
    const ids = Object.keys(assets);
    const roots = await Promise.all(ids.map((id) => loadGlb(assets[id], this.manager)));
    ids.forEach((id, i) => {
      const root = roots[i];
      if (!root) return;
      root.updateMatrixWorld(true);
      root.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        child.geometry.userData[SHARED] = true;
        for (const m of (Array.isArray(child.material) ? child.material : [child.material]) as Material[]) {
          m.userData[SHARED] = true;
        }
      });
      this.templates.set(id, { root, bbox: new Box3().setFromObject(root) });
    });
    this.assetsLoaded = true;
  }

  /** Clone a template; materials stay shared unless `tint` asks for an owned copy. */
  private cloneAsset(id: string, tint?: number): Group | null {
    const template = this.templates.get(id);
    if (!template) return null;
    const clone = template.root.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (tint === undefined) return;
      const material = (child.material as Material).clone() as MeshStandardMaterial;
      delete material.userData[SHARED];
      material.color?.setHex(tint);
      child.material = material;
    });
    return clone;
  }

  /** Clone held by a positioned / turned group; the clone itself carries the fit matrix. */
  private placeAsset(id: string, pos: Vector3, opts: PlaceOptions = {}): Object3D | null {
    const template = this.templates.get(id);
    const prop = template ? this.cloneAsset(id, opts.tint) : null;
    if (!template || !prop) return null;
    const holder = new Group();
    holder.add(prop);
    prop.matrixAutoUpdate = false;
    const uniform = opts.scale === undefined ? undefined : new Vector3(opts.scale, opts.scale, opts.scale);
    prop.matrix.copy(placeMatrix(template.bbox, new Vector3(), opts.size ?? null, 0, uniform));
    holder.position.copy(pos);
    holder.rotation.y = opts.rotY ?? 0;
    return holder;
  }

  private sharedResource<T extends BufferGeometry | Material>(key: string, make: () => T): T {
    let resource = this.sharedGpu.get(key) as T | undefined;
    if (!resource) {
      resource = make();
      resource.userData[SHARED] = true;
      this.sharedGpu.set(key, resource);
    }
    return resource;
  }

  /** One InstancedMesh per template mesh — floor tiles and wall runs. */
  private instanceAsset(id: string, matrices: Matrix4[], castShadow = true): Group {
    const group = new Group();
    const template = this.templates.get(id);
    if (!template || !matrices.length) return group;
    template.root.updateMatrixWorld(true);
    const rootInverse = template.root.matrixWorld.clone().invert();
    template.root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const local = rootInverse.clone().multiply(child.matrixWorld);
      const mesh = new InstancedMesh(child.geometry, child.material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m.clone().multiply(local)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.castShadow = castShadow;
      group.add(mesh);
    });
    return group;
  }

  // ---------------------------------------------------------------- build

  private units(): StockroomUnitInput[] {
    const units: StockroomUnitInput[] = this.layout.racks.map((r) => ({ id: r.id, name: r.name, hangers: r.hangers }));
    if (this.draft) units.push({ id: DRAFT_UNIT_ID, name: this.draft.name, hangers: [] });
    return units;
  }

  private rebuild(): void {
    if (!this.assetsLoaded || this.disposed) return;
    this.plan = planStockroom(this.units(), this.kit.bay);
    this.buildRoom();
    this.clearAreas();
    const racks = new Map(this.layout.racks.map((r) => [r.id, r]));
    for (const area of this.plan.areas) {
      const group = this.buildArea(area, racks.get(area.id) ?? null);
      this.areaNodes.set(area.id, group);
      this.areasRoot.add(group);
    }
    for (const slug of [...this.photos.keys()]) {
      if (!this.boxes.has(slug)) this.dropPhoto(slug);
    }
    this.overviewZoom = this.overviewPose().zoom;
    const limits = stockroomZoomLimits(this.overviewZoom);
    this.controls.minZoom = limits.min;
    this.controls.maxZoom = limits.max;
    this.fitShadowCamera();
    this.built = true;
    for (const node of this.boxes.values()) {
      const slug = node.hanger.slug;
      if (this.photos.has(slug)) continue;
      if (this.photoFailed.get(slug) === photoKey(node.hanger)) {
        applyPhotoMap(node.photo.material, makeUnavailableTexture(node.hanger.name));
        this.paintBox(node);
        continue;
      }
      this.queuePhoto(slug, 'thumb');
    }
    if (this.focusedId !== OVERVIEW_FOCUS_ID) this.upgradeArea(this.focusedId);
    this.requestRender();
    this.maybeSceneComplete();
  }

  private clearAreas(): void {
    for (const group of this.areaNodes.values()) {
      this.areasRoot.remove(group);
      disposeOwned(group);
    }
    this.areaNodes.clear();
    this.boxes.clear();
    this.hoverSlug = null;
  }

  private buildRoom(): void {
    for (const child of [...this.roomRoot.children]) {
      this.roomRoot.remove(child);
      disposeOwned(child);
    }
    this.kit.buildRoom(this.builder, this.plan, this.roomRoot);
  }

  private buildArea(area: StockroomArea, rack: SceneRack | null): Group {
    const group = new Group();
    group.name = `area:${area.id}`;
    group.userData['areaId'] = area.id;
    const isDraft = area.id === DRAFT_UNIT_ID;
    const bay = this.kit.bay;

    const rugBox = this.templates.get('rug')?.bbox;
    const rug = this.cloneAsset('rug', isDraft ? 0xefe9df : areaTint(area.index));
    if (rug && rugBox) {
      rug.matrixAutoUpdate = false;
      rug.matrix.copy(
        placeMatrix(rugBox, new Vector3(area.x, 0.004, area.z), new Vector3(area.width - 0.08, 0.02, area.depth - 0.08)),
      );
      rug.traverse((c) => {
        c.castShadow = false;
      });
      group.add(rug);
    }

    for (const bx of area.bayX) this.kit.buildBay(this.builder, area, bx, group);

    const pieces = rack?.hangers.length ?? 0;
    const signW = Math.min(area.width - 0.16, Math.max(2.2, area.bayX.length * bay.width));
    const sign = new Mesh(
      new PlaneGeometry(signW, SIGN_H),
      makePhotoMaterial(makeSignTexture(area.name, pieces, isDraft, signW / SIGN_H, rack?.unpublished === true)),
    );
    sign.name = 'sign';
    sign.userData['unpublished'] = rack?.unpublished === true;
    // The name is an HTML label (see `onOverlay`) so it stays upright and sharp; the mesh keeps the state.
    sign.visible = false;
    sign.position.set(area.x, signY(bay), area.z - area.depth / 2 + AREA_BACK_INSET + bay.depth * 0.4);
    sign.rotation.x = SIGN_TILT;
    group.add(sign);

    const hangers = new Map((rack?.hangers ?? []).map((h) => [h.slug, h]));
    for (const slot of area.slots) {
      const hanger = hangers.get(slot.slug);
      if (!hanger) continue;
      const node = this.buildPiece(hanger, area.id);
      node.group.position.set(slot.x, slot.y, slot.z);
      group.add(node.group);
      this.boxes.set(hanger.slug, node);
    }
    return group;
  }

  private buildPiece(hanger: SceneHanger, areaId: string): BoxNode {
    const group = new Group();
    group.name = `box:${hanger.slug}`;
    group.userData['slug'] = hanger.slug;
    this.kit.buildPiece(this.builder, group);
    const { photo: photoSpec, badge: badgeSpec } = this.kit;
    const entry = this.photos.get(hanger.slug);
    const photo = new Mesh(
      this.photoGeometry,
      makePhotoMaterial(entry?.texture ?? makePlaceholderTexture(), { polygonOffset: -1 }),
    );
    photo.position.set(0, 0, photoSpec.z);
    group.add(photo);
    const badge = new Mesh(this.badgeGeometry, makePhotoMaterial(null, { polygonOffset: -2 }));
    badge.position.set(0, -photoSpec.h / 2 + badgeSpec.h / 2, badgeSpec.z);
    group.add(badge);
    const outline = new Mesh(
      this.outlineGeometry,
      this.sharedResource('hoverOutline', () =>
        makePhotoMaterial(null, { color: HOVER_OUTLINE, polygonOffset: -0.5 }),
      ),
    );
    outline.position.set(0, 0, photoSpec.z - 0.001);
    outline.visible = false;
    outline.raycast = () => undefined;
    group.add(outline);
    const node: BoxNode = { group, photo, badge, outline, hanger, areaId };
    this.paintBox(node);
    return node;
  }

  private paintBox(node: BoxNode): void {
    const badge = boxBadge(node.hanger);
    const material = node.badge.material;
    material.map?.dispose();
    material.map = makeBadgeTexture(badge);
    material.needsUpdate = true;
    node.badge.userData['badge'] = badge.kind;
    node.photo.material.color.setHex(boxPhotoTint(badge));
  }

  // ---------------------------------------------------------------- photos

  private isFocusedArea(id: string): boolean {
    return this.focusedId === id;
  }

  private queuePhoto(slug: string, quality: HangerTextureQuality): void {
    const job = `${slug}:${quality}`;
    if (this.photoPending.has(job)) return;
    this.photoPending.add(job);
    if (quality === 'full') this.photoQueue.unshift({ slug, quality });
    else this.photoQueue.push({ slug, quality });
    this.pumpPhotos();
  }

  private pumpPhotos(): void {
    while (this.photoActive < PHOTO_CONCURRENCY && this.photoQueue.length) {
      const job = this.photoQueue.shift()!;
      this.photoActive += 1;
      void this.loadPhoto(job.slug, job.quality).finally(() => {
        this.photoActive -= 1;
        this.photoPending.delete(`${job.slug}:${job.quality}`);
        if (this.disposed) return;
        this.pumpPhotos();
        this.maybeSceneComplete();
      });
    }
  }

  private async loadPhoto(slug: string, quality: HangerTextureQuality): Promise<void> {
    const node = this.boxes.get(slug);
    if (!node) return;
    const urls = hangerTextureUrls(node.hanger, quality);
    if (!urls.length) {
      if (quality === 'thumb' && !this.photos.has(slug)) {
        const fallback = makeFallbackTexture(undefined, node.hanger.name);
        applyPhotoMap(node.photo.material, fallback);
        this.paintBox(node);
        this.requestRender();
      }
      return;
    }
    const key = photoKey(node.hanger);
    const texture = await loadTextureCandidates(
      urls,
      quality === 'full' ? { maxW: TEXTURE_BITMAP_FULL_W, maxH: TEXTURE_BITMAP_FULL_H } : {},
    );
    if (this.disposed) {
      photoTextureCache.release(texture);
      return;
    }
    const live = this.boxes.get(slug);
    if (!texture) {
      if (live && quality === 'thumb' && !this.photos.has(slug)) {
        this.photoFailed.set(slug, key);
        applyPhotoMap(live.photo.material, makeUnavailableTexture(live.hanger.name));
        this.paintBox(live);
        this.requestRender();
      }
      return;
    }
    const current = this.photos.get(slug);
    if (!live || photoKey(live.hanger) !== key || (current?.quality === 'full' && quality === 'thumb')) {
      photoTextureCache.release(texture);
      return;
    }
    if (current && current.texture !== texture) photoTextureCache.release(current.texture);
    this.photos.set(slug, { texture, quality, key });
    applyPhotoMap(live.photo.material, texture);
    this.paintBox(live);
    this.requestRender();
  }

  private dropPhoto(slug: string): void {
    const entry = this.photos.get(slug);
    if (!entry) return;
    this.photos.delete(slug);
    photoTextureCache.release(entry.texture);
  }

  private upgradeArea(id: string): void {
    const area = this.plan.areas.find((a) => a.id === id);
    if (!area) return;
    for (const slot of area.slots) {
      if (this.photos.get(slot.slug)?.quality !== 'full') this.queuePhoto(slot.slug, 'full');
    }
  }

  private maybeSceneComplete(): void {
    if (this.sceneCompleteSent || !this.firstFrameSent) return;
    const thumbsPending = [...this.photoPending].some((job) => job.endsWith(':thumb'));
    if (thumbsPending) return;
    this.sceneCompleteSent = true;
    this.onSceneCompleteCb?.();
  }

  // ---------------------------------------------------------------- camera

  private aspect(): number {
    const { width, height } = this.lastSize;
    return width > 0 && height > 0 ? width / height : 16 / 10;
  }

  private applyFrustum(): void {
    const half = STOCKROOM_FRUSTUM_HALF;
    const aspect = this.aspect();
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  }

  private fitPose(
    min: [number, number, number],
    max: [number, number, number],
    polar = STOCKROOM_POLAR_DEFAULT,
    pad?: number,
    azimuth = STOCKROOM_AZIMUTH_DEFAULT,
    insets = this.insets,
  ): StockroomPose {
    const box = new Box3(new Vector3(...min), new Vector3(...max));
    const { zoom, target } = fitOrthoBox(box, polar, azimuth, this.aspect(), insets, pad);
    return { polar, azimuth, target, zoom };
  }

  private overviewPose(): StockroomPose {
    const b = this.plan.bounds;
    return this.fitPose([b.minX, 0, b.minZ], [b.maxX, this.kit.bay.height, b.maxZ]);
  }

  private areaPose(id: string): StockroomPose | null {
    const area = this.plan.areas.find((a) => a.id === id);
    if (!area) return null;
    const win = this.bayWindow(area);
    return this.scrollAlign(area, win.start, this.windowPose(area, win.start, win.count));
  }

  /**
   * Bay height limits the zoom, so the screen is wider than the window. Slide the
   * view (like a scroll position) so the window sits at the left and the next bays
   * fill the rest, without running past the collection's last bay.
   */
  private scrollAlign(area: StockroomArea, start: number, pose: StockroomPose): StockroomPose {
    const { right } = viewBasis(pose.polar, pose.azimuth);
    const bay = this.kit.bay;
    const y = (Math.min(...bay.levelY) + Math.max(...bay.levelY)) / 2;
    const z = area.bayFrontZ;
    const r = (x: number) => new Vector3(x, y, z).dot(right);
    const half = ((STOCKROOM_FRUSTUM_HALF * this.aspect()) / pose.zoom) * (1 - 2 * STOCKROOM_SIDE_INSET);
    const centred = pose.target.dot(right);
    const left = r(area.bayX[start]! - bay.width / 2 - 0.08) + half;
    const end = r(area.bayX[area.bayX.length - 1]! + bay.width / 2 + 0.08) - half;
    const c = Math.max(centred, Math.min(left, end));
    if (Math.abs(c - centred) < 1e-6) return pose;
    return { ...pose, target: pose.target.clone().addScaledVector(right, c - centred) };
  }

  private windowPose(area: StockroomArea, start: number, count: number): StockroomPose {
    const box = bayWindowBox(area, start, count, this.kit.bay);
    const insets = stockroomInsetsPx(this.lastSize.height || 720, STOCKROOM_WINDOW_TOP_PX);
    return this.fitPose(box.min, box.max, STOCKROOM_POLAR_SHELF, WINDOW_FIT_PAD, STOCKROOM_AZIMUTH_SHELF, insets);
  }

  /**
   * Widest run of bays that still frames at (about) the single-bay zoom — bay
   * height limits that zoom, so extra bays come free until the width runs out —
   * or that keeps photos at least `STOCKROOM_MIN_PHOTO_PX` tall.
   */
  private windowSize(area: StockroomArea): number {
    const viewportH = this.lastSize.height || 720;
    const single = this.windowPose(area, 0, 1).zoom;
    for (let count = area.bayX.length; count > 1; count -= 1) {
      const pose = this.windowPose(area, 0, count);
      if (pose.zoom >= single * WINDOW_ZOOM_SLACK) return count;
      if (uprightScreenPx(this.kit.photo.h, pose.polar, pose.zoom, viewportH) >= STOCKROOM_MIN_PHOTO_PX) return count;
    }
    return 1;
  }

  private bayWindow(area: StockroomArea): { start: number; count: number } {
    return clampBayWindow(area, this.bayStart.get(area.id) ?? 0, this.windowSize(area));
  }

  private focusedArea(): StockroomArea | null {
    if (this.focus.kind !== 'area') return null;
    const id = this.focus.id;
    return this.plan.areas.find((a) => a.id === id) ?? null;
  }

  private bayStep(delta: -1 | 1): { area: StockroomArea; start: number } | null {
    const area = this.focusedArea();
    if (!area) return null;
    const win = this.bayWindow(area);
    const next = clampBayWindow(area, win.start + delta * win.count, win.count);
    return next.start === win.start ? null : { area, start: next.start };
  }

  private piecePose(slug: string): StockroomPose | null {
    for (const area of this.plan.areas) {
      const slot = area.slots.find((s) => s.slug === slug);
      if (slot) {
        const box = slotFocusBox(slot, this.kit.bay);
        return this.fitPose(box.min, box.max, STOCKROOM_POLAR_PIECE);
      }
    }
    return null;
  }

  /** Re-frame after layout / size changes. A camera the user moved stays put. */
  private refocus(immediate: boolean): void {
    if (!this.built) return;
    let pose: StockroomPose | null = null;
    if (this.focus.kind === 'area') pose = this.areaPose(this.focus.id);
    else if (this.focus.kind === 'piece') pose = this.piecePose(this.focus.slug);
    if (this.userMoved && (pose || this.focus.kind === 'overview')) return;
    if (!pose) {
      if (this.focus.kind !== 'overview') {
        this.focus = { kind: 'overview' };
        this.setFocusedId(OVERVIEW_FOCUS_ID);
      }
      pose = this.overviewPose();
    }
    this.moveTo(pose, immediate);
  }

  private currentPose(): StockroomPose {
    return {
      polar: this.controls.getPolarAngle(),
      azimuth: this.controls.getAzimuthalAngle(),
      target: this.controls.target.clone(),
      zoom: this.camera.zoom,
    };
  }

  private applyPose(pose: StockroomPose): void {
    this.controls.target.copy(pose.target);
    this.camera.position
      .copy(pose.target)
      .addScaledVector(offsetDirection(pose.polar, pose.azimuth), STOCKROOM_CAMERA_DISTANCE);
    this.camera.zoom = pose.zoom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(pose.target);
    this.needsRender = true;
  }

  private moveTo(pose: StockroomPose, immediate: boolean, done?: () => void): void {
    if (immediate || !this.started) {
      this.tween = null;
      this.applyPose(pose);
      this.controls.update();
      done?.();
      this.requestRender();
      return;
    }
    this.tween = { from: this.currentPose(), to: pose, start: performance.now(), duration: STOCKROOM_TWEEN_MS, done };
    this.controls.enabled = false;
    this.requestRender();
  }

  private draftAnchor(pose: StockroomPose): { x: number; y: number } {
    const area = this.plan.areas.find((a) => a.id === DRAFT_UNIT_ID);
    const rect = this.canvas.getBoundingClientRect();
    if (!area) return { x: rect.left + 24, y: rect.top + 24 };
    const probe = this.camera.clone();
    probe.position.copy(pose.target).addScaledVector(offsetDirection(pose.polar, pose.azimuth), STOCKROOM_CAMERA_DISTANCE);
    probe.zoom = pose.zoom;
    probe.lookAt(pose.target);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld(true);
    const p = new Vector3(area.x + area.width / 2, this.kit.bay.height, area.z - area.depth / 2).project(probe);
    return {
      x: rect.left + ((p.x + 1) / 2) * rect.width + 16,
      y: rect.top + ((1 - p.y) / 2) * rect.height,
    };
  }

  private fitShadowCamera(): void {
    const { room } = this.plan;
    const cx = (room.minX + room.maxX) / 2;
    const cz = (room.minZ + room.maxZ) / 2;
    const span = Math.max(room.maxX - room.minX, room.maxZ - room.minZ) * 0.75 + 2;
    const light = this.keyLight;
    light.position.set(cx + span * 0.35, 18, cz + span * 0.55);
    light.target.position.set(cx, 0, cz);
    light.target.updateMatrixWorld();
    const cam = light.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 1;
    cam.far = 60;
    cam.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }

  private setFocusedId(id: string): void {
    if (this.focusedId === id) return;
    this.focusedId = id;
    this.requestRender();
    this.onFocusCb?.(id);
  }

  // ---------------------------------------------------------------- overlay

  private project(x: number, y: number, z: number): { x: number; y: number } {
    const p = new Vector3(x, y, z).project(this.camera);
    return { x: ((p.x + 1) / 2) * this.lastSize.width, y: ((1 - p.y) / 2) * this.lastSize.height };
  }

  /** Canvas-local photo rect; the camera matrices must be current. */
  private photoRect(node: BoxNode): { x: number; y: number; w: number; h: number } {
    const { w, h } = this.kit.photo;
    node.photo.updateMatrixWorld(true);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const corner = new Vector3();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      corner.set((sx * w) / 2, (sy * h) / 2, 0);
      node.photo.localToWorld(corner);
      const p = this.project(corner.x, corner.y, corner.z);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  private pieceIsCaptioned(node: BoxNode): boolean {
    return this.photoRect(node).h >= STOCKROOM_CAPTION_MIN_PX;
  }

  /**
   * Collection names above their bays and captions over legible photos. With a
   * collection focused only its own label is emitted: the page shows that name
   * outside the canvas, since the shelves run past the top edge and no in-canvas
   * spot clears them. Captioned pieces hide the painted 3D badge (the HTML one is sharper).
   */
  private computeOverlay(): StockroomOverlay {
    const { width, height } = this.lastSize;
    this.camera.updateMatrixWorld(true);
    const focused = this.plan.areas.find((a) => a.id === this.focusedId) ?? null;
    const racks = new Map(this.layout.racks.map((r) => [r.id, r]));
    const bay = this.kit.bay;
    const labelY = Math.min(bay.height + 0.04, Math.max(...bay.levelY) + bay.piece.h / 2 + 0.1);
    const areas: StockroomAreaLabel[] = [];
    const visibleAreas = new Set<string>();
    for (const area of this.plan.areas) {
      if (focused && area.row > focused.row) continue;
      if (!this.areaNodes.get(area.id)?.visible) continue;
      visibleAreas.add(area.id);
      const isFocused = area.id === this.focusedId;
      if (focused && !isFocused) continue;
      let cx = area.x;
      if (isFocused) {
        const win = this.bayWindow(area);
        cx = (area.bayX[win.start]! + area.bayX[win.start + win.count - 1]!) / 2;
      }
      const p = this.project(cx, labelY, area.bayFrontZ - bay.pieceInset);
      const offscreen = p.x < -160 || p.x > width + 160 || p.y < -40 || p.y > height + 40;
      if (offscreen && !isFocused) continue;
      const rack = racks.get(area.id);
      const draft = area.id === DRAFT_UNIT_ID;
      areas.push({
        id: area.id,
        name: draft ? (this.draft?.name ?? area.name) : area.name,
        count: rack?.hangers.length ?? 0,
        unpublished: rack?.unpublished === true,
        draft,
        focused: isFocused,
        x: Math.round(width > 440 ? Math.min(width - 220, Math.max(220, p.x)) : width / 2),
        y: Math.round(Math.min(height - 8, Math.max(52, p.y - 6))),
      });
    }
    const pieces: StockroomPieceLabel[] = [];
    for (const node of this.boxes.values()) {
      let captioned = false;
      if (visibleAreas.has(node.areaId) && node.group.visible) {
        const r = this.photoRect(node);
        const onScreen = r.x + r.w > 0 && r.x < width && r.y + r.h > 0 && r.y < height;
        if (onScreen && r.h >= STOCKROOM_CAPTION_MIN_PX) {
          captioned = true;
          const badge = boxBadge(node.hanger);
          pieces.push({
            slug: node.hanger.slug,
            name: node.hanger.name,
            price: compactPrice(node.hanger.priceLabel),
            badge: badge.kind,
            badgeText: badge.text,
            hover: node.hanger.slug === this.hoverSlug,
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.w),
            h: Math.round(r.h),
          });
        }
      }
      node.badge.visible = !captioned;
    }
    return { width, height, areas, pieces };
  }

  private emitOverlay(overlay: StockroomOverlay): void {
    this.lastOverlay = overlay;
    if (!this.onOverlayCb) return;
    const key = JSON.stringify(overlay);
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    this.onOverlayCb(overlay);
  }

  // ---------------------------------------------------------------- loop

  private requestRender(): void {
    this.needsRender = true;
  }

  private animate(duration: number, step: (t: number) => void, done?: () => void): void {
    this.anims.add({ start: performance.now(), duration, step, done });
    this.requestRender();
  }

  private readonly tick = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    this.controls.update();
    if (this.tween) {
      const t = Math.min(1, (now - this.tween.start) / this.tween.duration);
      this.applyPose(lerpPose(this.tween.from, this.tween.to, easeInOutCubic(t)));
      if (t >= 1) {
        const done = this.tween.done;
        this.tween = null;
        this.controls.enabled = true;
        this.controls.update();
        done?.();
      }
    }
    for (const anim of [...this.anims]) {
      const t = Math.min(1, (now - anim.start) / anim.duration);
      anim.step(t);
      this.needsRender = true;
      if (t >= 1) {
        this.anims.delete(anim);
        anim.done?.();
      }
    }
    if (this.hoverQueued) {
      const { x, y } = this.hoverQueued;
      this.hoverQueued = null;
      this.updateHover(x, y);
    }
    if (!this.needsRender) return;
    this.needsRender = false;
    const overlay = this.built ? this.computeOverlay() : null;
    this.renderer.render(this.scene, this.camera);
    if (overlay) this.emitOverlay(overlay);
    if (this.built && !this.firstFrameSent) {
      this.firstFrameSent = true;
      this.onFirstFrameCb?.();
      this.maybeSceneComplete();
    }
  };

  // ---------------------------------------------------------------- input

  private readonly onControlsStart = (): void => {
    this.userMoved = true;
    if (this.tween) {
      this.tween = null;
      this.controls.enabled = true;
    }
  };

  private readonly onControlsChange = (): void => {
    const target = this.controls.target;
    const before = target.clone();
    clampStockroomTarget(target, this.plan.room);
    const dx = target.x - before.x;
    const dy = target.y - before.y;
    const dz = target.z - before.z;
    if (dx || dy || dz) this.camera.position.add(new Vector3(dx, dy, dz));
    this.needsRender = true;
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      this.down = null;
      return;
    }
    this.down = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons) {
      if (this.hoverSlug) this.setHover(null);
      return;
    }
    this.hoverQueued = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const down = this.down;
    this.down = null;
    if (!down || down.id !== event.pointerId || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (moved > TAP_MAX_PX || performance.now() - down.t > TAP_MAX_MS) return;
    this.tap(event.clientX, event.clientY);
  };

  private readonly onPointerLeave = (): void => {
    this.hoverQueued = null;
    this.setHover(null);
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
  };

  private pick(clientX: number, clientY: number): { slug: string | null; areaId: string | null } {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return { slug: null, areaId: null };
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.areasRoot.children, true);
    for (const hit of hits) {
      if (!shownInScene(hit.object)) continue;
      let node: Object3D | null = hit.object;
      let areaId: string | null = null;
      while (node) {
        const slug = node.userData['slug'] as string | undefined;
        if (slug) return { slug, areaId: null };
        areaId ??= (node.userData['areaId'] as string | undefined) ?? null;
        node = node.parent;
      }
      if (areaId) return { slug: null, areaId };
    }
    return { slug: null, areaId: null };
  }

  private tap(clientX: number, clientY: number): void {
    const { slug, areaId } = this.pick(clientX, clientY);
    if (slug) {
      this.setHover(null);
      this.onClickCb?.(slug);
      return;
    }
    if (!areaId || areaId === DRAFT_UNIT_ID) return;
    const rack = this.layout.racks.find((r) => r.id === areaId);
    if (this.focusedId === areaId && rack && rack.hangers.length === 0) {
      this.onEmptyUnitCb?.(areaId);
      return;
    }
    if (this.focusedId !== areaId || this.userMoved) this.focusRack(areaId);
  }

  private updateHover(clientX: number, clientY: number): void {
    const { slug, areaId } = this.pick(clientX, clientY);
    this.canvas.style.cursor = slug || areaId ? 'pointer' : '';
    if (slug !== this.hoverSlug) this.setHover(slug);
    if (slug) this.onHoverCb?.(slug, { x: clientX, y: clientY });
  }

  private setHover(slug: string | null): void {
    const prev = this.hoverSlug ? this.boxes.get(this.hoverSlug) : null;
    if (prev) {
      prev.group.scale.setScalar(1);
      prev.outline.visible = false;
    }
    this.hoverSlug = slug;
    const next = slug ? this.boxes.get(slug) : null;
    if (next) {
      next.group.scale.setScalar(1.06);
      next.outline.geometry =
        outlinePadForHover(this.pieceIsCaptioned(next)) === STOCKROOM_SHIFT_TARGET_OUTLINE_PAD
          ? this.shiftOutlineGeometry
          : this.outlineGeometry;
      next.outline.visible = true;
    }
    if (!slug) this.onHoverCb?.(null);
    this.requestRender();
  }
}

/** Raycasts ignore `visible`, so hidden meshes (signs, hover outlines) would block picks. */
function shownInScene(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

/** Replace in place (keeps box order); append when new or moved to another collection. */
export function upsertHanger(layout: SceneLayout, next: SceneHanger): SceneLayout {
  const home = layout.racks.find((r) => r.hangers.some((h) => h.slug === next.slug));
  if (home && home.id === next.rackId) {
    return {
      racks: layout.racks.map((r) =>
        r.id === home.id ? { ...r, hangers: r.hangers.map((h) => (h.slug === next.slug ? next : h)) } : r,
      ),
    };
  }
  const racks = layout.racks.map((r) => ({ ...r, hangers: r.hangers.filter((h) => h.slug !== next.slug) }));
  const target = racks.find((r) => r.id === next.rackId);
  if (target) target.hangers = [...target.hangers, next];
  return { racks };
}

/**
 * "R$ 7.200,00 (oculto no site)" → "R$ 7.200": the suffix is the same on every
 * piece (site-wide prices-on-request), and whole-real prices fit a narrow caption.
 */
export function compactPrice(label: string | null | undefined): string {
  let text = (label ?? '').trim();
  if (text.endsWith(HIDDEN_ON_SITE_SUFFIX.trim())) text = text.slice(0, -HIDDEN_ON_SITE_SUFFIX.trim().length).trim();
  return text.replace(/,00$/, '');
}

function easeOutBackSoft(t: number): number {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function createStockroomEngine(
  canvas: HTMLCanvasElement,
  options: StockroomEngineOptions = {},
): StockroomEngine | null {
  if (!isWebGLAvailable()) return null;
  return tryCreate(() => new StockroomEngine(canvas, options));
}
