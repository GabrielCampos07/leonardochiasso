import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Fog,
  Group,
  HemisphereLight,
  LoadingManager,
  Material,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  Spherical,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ATELIER_ASSETS,
  cloneGlb,
  createAtelierLoadingManager,
  loadColorTexture,
  loadGlb,
  loadHdri,
  type LoadProgressHandler,
} from './atelier-assets';
import { ATELIER_CLEAR, ATELIER_EXPOSURE, ATELIER_FOG, detectAtelierLiteMode } from './atelier-look';
import { createAtelierPlant, plantOffsets } from './atelier-plants';
import { createAtelierRoom, placeRackRugs } from './atelier-room';
import { createDressForm, MANNEQUIN_GROUP, mannequinOffset } from './featured-mannequin';
import { applyPhotoMap, isPhotoMaterial } from './photo-material';
import {
  CAMERA_AZIMUTH_LIMIT,
  CAMERA_MIN_Y,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  CAMERA_TWEEN_MS,
  CREATE_TWEEN_MS,
  CameraFocusMode,
  CameraPose,
  OVERVIEW_FOCUS_ID,
  clampOrbitSpherical,
  computeEyeLevelFit,
  computeVitrineFit,
  easeInOutCubic,
  easeOutBack,
  isCompactAtelierViewport,
  measureAtelierChrome,
  pieceFocusBox,
} from './camera-guide';
import {
  FLOOR_Y,
  createCollectionRack,
  layoutHangers,
  rackBarTop,
  rackRowCount,
  rackWidth,
} from './collection-rack';
import {
  applyTrayData,
  applyTrayPhoto,
  createJewelryTray,
  createJewelryVitrine,
  layoutTrays,
  vitrineWidth,
} from './jewelry-vitrine';
import { createDraftOutline, lightPlate, setDraftPlateName, setGroupOpacity } from './draft-unit';
import { disposeObject3D, disposeOwnedTexture, disposeRenderer } from './dispose';
import { applyHangerData, applyPhotoAspect, createGarmentHanger, HANGER_LIFT, HANGER_USER_DATA, SOLD_OUT_BADGE_H } from './garment-hanger';
import { hangerSlugFromHits, isPointerClick, resolveHangerClick } from './hanger-pick';
import { COLLECTION_COVER_FALLBACK_HEX } from '../core/collection-cover';
import { isTextureLive, loadTextureCandidates, makeFallbackTexture, photoTextureCache } from './texture-loader';
import { TextureLoadQueue, hangerPhotoPriority } from './texture-queue';
import {
  findHanger,
  racksForFirstFrame,
  removeHangerFromLayout,
  removeUnitFromLayout,
  replaceHanger,
} from './mapping';
import { DRAFT_UNIT_ID, UNIT_GAP, nextDraftSlot, unitWidth } from './unit-layout';
import { hangerTextureUrls } from './photo-url';
import { soldOutBadgeScale } from './sold-out-scale';
import type { SceneHanger, SceneLayout, SceneRack, SceneUnitKind } from './types';
import { isWebGLAvailable, tryCreate } from './webgl-support';

export type HangerPickHandler = (slug: string) => void;
export type HangerHoverHandler = (
  slug: string | null,
  pointer?: { x: number; y: number },
) => void;
export type FocusChangeHandler = (id: string) => void;
export type FirstFrameHandler = () => void;
export type SceneCompleteHandler = () => void;
export type LoadProgressCb = LoadProgressHandler;
export type DraftAnchorHandler = (point: { x: number; y: number } | null) => void;
export type EmptyUnitHandler = (rackId: string) => void;

export interface SceneEngineOptions {
  reducedMotion?: boolean;
  host?: HTMLElement;
  lite?: boolean;
}

export function atelierPixelRatio(
  reducedMotion: boolean,
  dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
): number {
  return reducedMotion ? 1 : Math.min(dpr || 1, 2);
}

/** Keep the drawing buffer CSS at 100% so setSize never locks a px height. */
export function applyCanvasHostCss(canvas: HTMLCanvasElement): void {
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
}

/**
 * Current host box on both grow and shrink. Prefer the laid-out rect; fall back
 * to clientWidth/Height when the rect is collapsed (jsdom / detached nodes).
 */
export function hostDrawingSize(host: HTMLElement): { width: number; height: number } | null {
  const rect = typeof host.getBoundingClientRect === 'function' ? host.getBoundingClientRect() : null;
  const width = Math.max(0, Math.round(rect?.width || host.clientWidth));
  const height = Math.max(0, Math.round(rect?.height || host.clientHeight));
  if (width < 1 || height < 1) return null;
  return { width, height };
}

const CLEAR = ATELIER_CLEAR;
const NON_PASSIVE: AddEventListenerOptions = { passive: false };
/** Piece leave / unit sink: 400–600 ms. Cut instantly when reduced motion. */
export const ARCHIVE_TWEEN_MS = 500;
const ARCHIVE_HANGER_LIFT = 0.36;
const ARCHIVE_SINK_DELTA = -2.4;

const NON_PASSIVE_TYPES = new Set([
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'wheel',
]);

/** OrbitControls calls preventDefault; Chrome defaults touch/wheel to passive. */
export function forceNonPassiveCanvasListeners(canvas: HTMLCanvasElement): () => void {
  const original = canvas.addEventListener.bind(canvas);
  canvas.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (NON_PASSIVE_TYPES.has(type)) {
      const next: AddEventListenerOptions =
        typeof options === 'object' && options
          ? { ...options, passive: false }
          : { capture: options === true, passive: false };
      return original(type, listener, next);
    }
    return original(type, listener, options);
  }) as HTMLCanvasElement['addEventListener'];
  return () => {
    canvas.addEventListener = original;
  };
}

/**
 * Framework-agnostic WebGL atelier: eye-level first rack, guided focus tween,
 * warm light + soft shadows, raycast hover (no readPixels), render-on-demand.
 */
export class SceneEngine {
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly racksRoot = new Group();
  private readonly reducedMotion: boolean;
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly fitSize = new Vector3();
  private readonly fitCenter = new Vector3();
  private readonly bounds = new Box3();
  private readonly orbitOffset = new Vector3();
  private readonly orbitSpherical = new Spherical();

  private raf = 0;
  private renderQueued = false;
  private hoverQueued = false;
  private pendingHover: PointerEvent | null = null;
  private pointerDown = { x: 0, y: 0 };
  private interacting = false;
  private dampingFrames = 0;
  private disposed = false;
  private hoverSlug: string | null = null;
  private lift = 0;
  private liftTarget = 0;
  private focusedId: string = OVERVIEW_FOCUS_ID;
  private layout: SceneLayout = { racks: [] };
  private onClickCb: HangerPickHandler | null = null;
  private onHoverCb: HangerHoverHandler | null = null;
  private onFocusCb: FocusChangeHandler | null = null;
  private onFirstFrameCb: FirstFrameHandler | null = null;
  private onSceneCompleteCb: SceneCompleteHandler | null = null;
  private onDraftAnchorCb: DraftAnchorHandler | null = null;
  private onEmptyUnitCb: EmptyUnitHandler | null = null;
  private firstFrameSent = false;
  private sceneCompleteSent = false;
  private expectedPhotos = 0;
  private finishedPhotos = 0;
  private readonly texQueue = new TextureLoadQueue();
  private readonly loadedPhotos = new Set<string>();
  private shadowsArmed = false;
  private keyLight: DirectionalLight | null = null;
  private hasLayout = false;
  private deferredSlots: Array<{ id: string; rack: SceneRack; x: number }> = [];
  private idleHandle = 0;
  private idleRic = 0;
  private capturedPointerId: number | null = null;
  private pointerDownSlug: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private contextLost = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastPixelRatio = 0;
  private tween: {
    fromPos: Vector3;
    toPos: Vector3;
    fromTarget: Vector3;
    toTarget: Vector3;
    start: number;
    duration: number;
  } | null = null;
  private draft: Group | null = null;
  private draftKind: SceneUnitKind = 'rack';
  private draftX = 0;
  private draftFade: { start: number; duration: number; dir: 1 | -1 } | null = null;
  private rises: Array<{ group: Group; start: number; duration: number; fromY: number; toY: number }> =
    [];
  private plateGlow: { mesh: Mesh; start: number; duration: number } | null = null;
  private hangerExit: {
    group: Group;
    rackId: string;
    start: number;
    duration: number;
    fromY: number;
    toY: number;
  } | null = null;
  private sink: {
    group: Group;
    start: number;
    duration: number;
    fromY: number;
    toY: number;
  } | null = null;
  private readonly projectScratch = new Vector3();
  private restoreAddEventListener: (() => void) | null = null;
  private readonly lite: boolean;
  private readonly manager: LoadingManager;
  private onProgressCb: LoadProgressHandler | null = null;
  private room: Group | null = null;
  private propsRoot: Group | null = null;
  private hdri: Texture | null = null;
  private pmrem: PMREMGenerator | null = null;
  private propsArmed = false;
  private mannequinSrc: Group | null = null;
  private plantSrc: Group | null = null;

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
    this.pointerDownSlug = this.pickHangerSlug(event);
    try {
      this.canvas.setPointerCapture(event.pointerId);
      this.capturedPointerId = event.pointerId;
    } catch {
      this.capturedPointerId = event.pointerId;
    }
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    this.pendingHover = event;
    if (this.hoverQueued) return;
    this.hoverQueued = true;
    requestAnimationFrame(() => {
      this.hoverQueued = false;
      if (this.disposed || !this.pendingHover) return;
      this.handlePointer(this.pendingHover);
      this.pendingHover = null;
    });
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    this.releasePointer(event.pointerId);
    const slug = resolveHangerClick({
      pointerDownSlug: this.pointerDownSlug,
      pointerUpSlug: this.pickHangerSlug(event),
      hoverSlug: this.hoverSlug,
      dx,
      dy,
    });
    this.pointerDownSlug = null;
    if (slug) this.onClickCb?.(slug);
    else if (isPointerClick(dx, dy)) {
      const emptyId = this.emptyUnitIdFromHits(this.raycastPointer(event));
      if (emptyId) this.onEmptyUnitCb?.(emptyId);
    }
    this.endOrbit();
  };
  private readonly onPointerCancel = (event: PointerEvent) => {
    this.pointerDownSlug = null;
    this.releasePointer(event.pointerId);
    this.endOrbit();
  };
  private readonly onLostPointerCapture = () => {
    this.capturedPointerId = null;
    this.endOrbit();
  };
  private readonly onWindowBlur = () => this.endOrbit();
  private readonly onPointerLeave = () => this.setHover(null);
  private readonly noopTouch = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  private readonly onControlsStart = () => {
    this.interacting = true;
    this.dampingFrames = this.reducedMotion ? 0 : 24;
    this.requestRender();
  };
  private readonly onControlsEnd = () => this.endOrbit();
  private readonly onControlsChange = () => this.requestRender();
  private readonly onHostResize = () => this.resize();
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    if (this.disposed) return;
    this.contextLost = true;
  };
  private readonly onContextRestored = () => {
    if (this.disposed) return;
    this.contextLost = false;
    this.restoreAfterContext();
  };

  constructor(canvas: HTMLCanvasElement, options: SceneEngineOptions = {}) {
    this.canvas = canvas;
    this.host = options.host ?? canvas.parentElement ?? canvas;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.lite =
      options.lite ??
      detectAtelierLiteMode({
        reducedMotion: this.reducedMotion,
        width: typeof window === 'undefined' ? 1280 : window.innerWidth,
      });
    this.manager = createAtelierLoadingManager((loaded, total) => this.onProgressCb?.(loaded, total));
    this.scene.background = new Color(CLEAR);
    this.scene.fog = new Fog(ATELIER_FOG, this.lite ? 32 : 28, this.lite ? 70 : 64);

    this.camera = new PerspectiveCamera(38, 1, 0.1, 80);
    this.camera.position.set(0, 1.15, 3.2);

    this.renderer = new WebGLRenderer({ canvas, antialias: !this.lite, alpha: false });
    this.renderer.setPixelRatio(atelierPixelRatio(this.reducedMotion));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = this.lite ? NoToneMapping : ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.lite ? 1 : ATELIER_EXPOSURE;
    this.renderer.setClearColor(CLEAR, 1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.restoreAddEventListener = forceNonPassiveCanvasListeners(canvas);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !this.reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.screenSpacePanning = false;
    this.applyOrbitLimits('rack');
    this.controls.target.set(0, 0.35, 0);
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('end', this.onControlsEnd);
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.update();

    this.scene.add(new AmbientLight(0xfff6ea, this.lite ? 0.62 : 0.48));
    this.scene.add(new HemisphereLight(0xfff8f0, 0xc4b4a0, this.lite ? 0.55 : 0.46));

    const key = new DirectionalLight(0xfff0dc, this.lite ? 1.08 : 1.02);
    key.position.set(3.1, 6.2, 4.4);
    key.castShadow = false;
    key.shadow.mapSize.set(this.lite ? 256 : 1024, this.lite ? 256 : 1024);
    this.keyLight = key;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 3.2;
    key.shadow.bias = -0.00022;
    this.scene.add(key);

    const fill = new DirectionalLight(0xf4eadc, this.lite ? 0.42 : 0.34);
    fill.position.set(-3.4, 2.4, 1.6);
    this.scene.add(fill);

    const bounce = new DirectionalLight(0xfff4e8, this.lite ? 0.2 : 0.16);
    bounce.position.set(0.4, 1.1, 5.2);
    this.scene.add(bounce);

    this.room = createAtelierRoom(this.lite);
    this.scene.add(this.room);
    this.propsRoot = new Group();
    this.propsRoot.name = 'atelier-props';
    this.scene.add(this.propsRoot);

    this.racksRoot.name = 'racks';
    this.scene.add(this.racksRoot);
    void this.loadRoomTextures();
    if (!this.lite) void this.loadHdriEnv();

    canvas.addEventListener('pointerdown', this.onPointerDown, NON_PASSIVE);
    canvas.addEventListener('pointermove', this.onPointerMove, NON_PASSIVE);
    canvas.addEventListener('pointerup', this.onPointerUp, NON_PASSIVE);
    canvas.addEventListener('pointercancel', this.onPointerCancel, NON_PASSIVE);
    canvas.addEventListener('lostpointercapture', this.onLostPointerCapture, NON_PASSIVE);
    canvas.addEventListener('pointerleave', this.onPointerLeave, NON_PASSIVE);
    canvas.addEventListener('touchstart', this.noopTouch, NON_PASSIVE);
    canvas.addEventListener('touchmove', this.noopTouch, NON_PASSIVE);
    canvas.addEventListener('wheel', this.noopTouch, NON_PASSIVE);
    window.addEventListener('blur', this.onWindowBlur);

    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
    window.addEventListener('resize', this.onHostResize);
    window.visualViewport?.addEventListener('resize', this.onHostResize);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
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

  isLite(): boolean {
    return this.lite;
  }

  onDraftAnchor(handler: DraftAnchorHandler): void {
    this.onDraftAnchorCb = handler;
  }

  onEmptyUnit(handler: EmptyUnitHandler): void {
    this.onEmptyUnitCb = handler;
  }

  start(): void {
    this.requestRender();
  }

  focusedRackId(): string {
    return this.focusedId;
  }

  setLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.cancelDeferredRacks();
    this.removeDraft(true);
    while (this.racksRoot.children.length) {
      const child = this.racksRoot.children[0]!;
      this.racksRoot.remove(child);
      disposeObject3D(child);
    }

    const slots = this.computeRackSlots(layout);
    const firstId = layout.racks[0]?.id ?? OVERVIEW_FOCUS_ID;
    const split = racksForFirstFrame(slots, firstId);
    this.deferredSlots = split.deferred;
    for (const slot of split.immediate) this.mountRack(slot);

    this.hasLayout = true;
    this.firstFrameSent = false;
    this.sceneCompleteSent = false;
    this.propsArmed = false;
    this.clearDeferredProps();
    this.fitRoomToLayout();
    this.expectedPhotos = layout.racks.reduce((n, r) => n + r.hangers.length, 0);
    this.finishedPhotos = 0;
    this.loadedPhotos.clear();
    this.texQueue.clear();
    if (firstId !== OVERVIEW_FOCUS_ID) this.focusRack(firstId, true);
    else this.focusOverview(true);
    this.requestRender();
    this.enqueueHangerTextures();
    this.scheduleDeferredRacks();
    this.maybeSceneComplete();
  }

  focusRack(id: string, immediate = this.reducedMotion): void {
    if (id === OVERVIEW_FOCUS_ID) {
      this.focusOverview(immediate);
      return;
    }
    if (id === DRAFT_UNIT_ID) {
      this.focusDraft(immediate);
      return;
    }
    this.ensureRackMounted(id);
    const group = this.racksRoot.getObjectByName(`rack:${id}`);
    if (!group) return;
    this.focusedId = id;
    const unit = this.layout.racks.find((r) => r.id === id);
    const mode: CameraFocusMode = unit?.kind === 'vitrine' ? 'vitrine' : 'rack';
    this.applyOrbitLimits(mode);
    this.moveCamera(this.poseFor(group as Group, mode), immediate);
    this.onFocusCb?.(id);
    this.layoutDeferredProps();
    if (this.hasLayout) this.enqueueHangerTextures();
  }

  /** Tight frame on a single hanger — used for Esgotado close-ups. */
  focusHanger(slug: string, immediate = this.reducedMotion): boolean {
    const hanger = findHanger(this.layout, slug);
    if (hanger) this.ensureRackMounted(hanger.rackId);
    const group = this.findHangerGroup(slug);
    if (!group) return false;
    if (hanger) {
      this.focusedId = hanger.rackId;
      this.applyOrbitLimits('rack');
    }
    group.updateWorldMatrix(true, true);
    const garment = group.getObjectByName('garment');
    const label = group.getObjectByName('label');
    const labelBack = group.getObjectByName('labelBack');
    const badge = group.getObjectByName('badge');
    if (badge) badge.scale.set(1, 1, 1);
    this.bounds.makeEmpty();
    if (garment) this.bounds.expandByObject(garment);
    if (label) this.bounds.expandByObject(label);
    if (labelBack) this.bounds.expandByObject(labelBack);
    if (badge?.visible) this.bounds.expandByObject(badge);
    if (this.bounds.isEmpty()) this.bounds.expandByObject(group);
    const siblings = hanger ? this.layout.racks.find((rack) => rack.id === hanger.rackId)?.hangers ?? [] : [];
    const index = siblings.findIndex((item) => item.slug === slug);
    const box = pieceFocusBox(
      {
        minX: this.bounds.min.x,
        maxX: this.bounds.max.x,
        minY: this.bounds.min.y,
        maxY: this.bounds.max.y,
        minZ: this.bounds.min.z,
        maxZ: this.bounds.max.z,
      },
      index,
      siblings.length,
    );
    this.moveCamera(
      computeEyeLevelFit(
        box,
        this.camera.aspect,
        this.camera.fov,
        'piece',
        isCompactAtelierViewport(),
        measureAtelierChrome(this.host),
      ),
      immediate,
    );
    this.layoutDeferredProps();
    if (hanger) this.onFocusCb?.(hanger.rackId);
    return true;
  }

  focusOverview(immediate = this.reducedMotion): void {
    this.flushDeferredRacks();
    this.focusedId = OVERVIEW_FOCUS_ID;
    this.applyOrbitLimits('overview');
    this.moveCamera(this.poseFor(this.racksRoot, 'overview'), immediate);
    this.onFocusCb?.(OVERVIEW_FOCUS_ID);
    if (this.hasLayout) this.enqueueHangerTextures();
  }

  addHanger(next: SceneHanger, immediate = this.reducedMotion): void {
    this.layout = replaceHanger(this.layout, next);
    this.ensureRackMounted(next.rackId);
    const dest = this.racksRoot.getObjectByName(`rack:${next.rackId}`) as Group | undefined;
    const hangersRoot = dest?.getObjectByName('hangers') as Group | undefined;
    if (!dest || !hangersRoot) {
      this.remountUnit(next.rackId);
      return;
    }
    let group = this.findHangerGroup(next.slug);
    const created = !group;
    if (!group) {
      group = next.kind === 'jewelry' ? createJewelryTray(next) : createGarmentHanger(next);
      hangersRoot.add(group);
    } else if (next.kind === 'jewelry') {
      applyTrayData(group, next);
    } else {
      applyHangerData(group, next);
    }
    const rack = this.layout.racks.find((r) => r.id === next.rackId);
    if (rack?.kind === 'vitrine') {
      layoutTrays(hangersRoot, rack.hangers, vitrineWidth(rack.hangers.length));
    } else if (rack) {
      const barTop = rackBarTop(rackRowCount(rack.hangers.length));
      layoutHangers(hangersRoot, rack.hangers, rackWidth(rack.hangers.length), barTop);
    }
    if (created && !immediate) {
      const restY = Number(group.userData['restY'] ?? group.position.y);
      group.position.y = restY - 0.42;
      this.rises.push({
        group,
        start: performance.now(),
        duration: CREATE_TWEEN_MS,
        fromY: restY - 0.42,
        toY: restY,
      });
    }
    this.loadedPhotos.delete(next.slug);
    this.texQueue.enqueue({
      id: next.slug,
      priority: 0,
      run: () => this.loadHangerTexture(next),
    });
    this.requestRender();
  }

  unitScreenPoint(id: string): { x: number; y: number } | null {
    const group = this.racksRoot.getObjectByName(`rack:${id}`);
    if (!group) return null;
    const plate = group.getObjectByName('plate');
    if (plate) plate.getWorldPosition(this.projectScratch);
    else group.getWorldPosition(this.projectScratch);
    this.projectScratch.y += 0.15;
    return this.worldToClient(this.projectScratch);
  }

  removeHanger(slug: string, immediate = this.reducedMotion): void {
    const prev = findHanger(this.layout, slug);
    this.layout = removeHangerFromLayout(this.layout, slug);
    const group = this.findHangerGroup(slug);
    this.rises = this.rises.filter((rise) => rise.group !== group);
    if (!prev) return;
    if (this.hoverSlug === slug) this.setHover(null);
    if (immediate || !group) {
      this.remountUnit(prev.rackId);
      return;
    }
    this.hangerExit = {
      group,
      rackId: prev.rackId,
      start: performance.now(),
      duration: ARCHIVE_TWEEN_MS,
      fromY: group.position.y,
      toY: group.position.y + ARCHIVE_HANGER_LIFT,
    };
    this.requestRender();
  }

  sinkUnit(id: string, immediate = this.reducedMotion): void {
    this.ensureRackMounted(id);
    const group = this.racksRoot.getObjectByName(`rack:${id}`) as Group | undefined;
    this.layout = removeUnitFromLayout(this.layout, id);
    if (this.focusedId === id) this.focusedId = OVERVIEW_FOCUS_ID;
    this.rises = this.rises.filter((rise) => rise.group !== group);
    if (immediate || !group) {
      this.forgetUnitPhotos(id);
      if (group) {
        group.removeFromParent();
        disposeObject3D(group);
      }
      this.requestRender();
      return;
    }
    this.sink = {
      group,
      start: performance.now(),
      duration: ARCHIVE_TWEEN_MS,
      fromY: group.position.y,
      toY: group.position.y + ARCHIVE_SINK_DELTA,
    };
    this.requestRender();
  }

  restoreUnit(unit: SceneRack): void {
    if (this.layout.racks.some((r) => r.id === unit.id)) return;
    this.layout = { racks: [...this.layout.racks, unit] };
    for (const hanger of unit.hangers) this.loadedPhotos.delete(hanger.slug);
    const slot = this.computeRackSlots(this.layout).find((s) => s.id === unit.id);
    if (slot) this.mountRack(slot);
    this.enqueueHangerTextures();
    this.requestRender();
  }

  updateHanger(next: SceneHanger): void {
    this.layout = replaceHanger(this.layout, next);
    const group = this.findHangerGroup(next.slug);
    if (!group) {
      this.addHanger(next, true);
      return;
    }
    const prev = group.userData['data'] as SceneHanger | undefined;
    if (next.kind === 'jewelry') applyTrayData(group, next);
    else applyHangerData(group, next);
    if (prev?.imageUrl !== next.imageUrl || prev?.thumbUrl !== next.thumbUrl) {
      this.loadedPhotos.delete(next.slug);
      this.texQueue.enqueue({
        id: next.slug,
        priority: 0,
        run: () => this.loadHangerTexture(next),
      });
    }
    if (prev && prev.rackId !== next.rackId) {
      this.moveHanger(group, next);
    }
    this.requestRender();
  }

  showDraft(kind: SceneUnitKind, name: string, immediate = this.reducedMotion): { x: number; y: number } {
    this.flushDeferredRacks();
    this.removeDraft(true);
    const slot = nextDraftSlot(this.layout.racks, kind);
    this.draftKind = kind;
    this.draftX = slot.x;
    this.draft = createDraftOutline(kind, name, slot.x);
    this.racksRoot.add(this.draft);
    if (!immediate) {
      setGroupOpacity(this.draft, 0);
      this.draftFade = { start: performance.now(), duration: CREATE_TWEEN_MS, dir: 1 };
    }
    this.focusedId = DRAFT_UNIT_ID;
    this.focusDraft(immediate);
    this.requestRender();
    return this.draftScreenPoint() ?? { x: 24, y: 24 };
  }

  setDraftName(name: string): void {
    if (!this.draft) return;
    setDraftPlateName(this.draft, name);
    this.requestRender();
  }

  clearDraft(immediate = this.reducedMotion): void {
    if (!this.draft) {
      this.onDraftAnchorCb?.(null);
      return;
    }
    if (immediate) {
      this.removeDraft(true);
      this.onDraftAnchorCb?.(null);
      this.requestRender();
      return;
    }
    this.draftFade = { start: performance.now(), duration: CREATE_TWEEN_MS, dir: -1 };
    this.requestRender();
  }

  commitDraft(unit: SceneRack, immediate = this.reducedMotion): void {
    this.removeDraft(true);
    const group =
      unit.kind === 'vitrine' ? createJewelryVitrine(unit, this.draftX) : createCollectionRack(unit, this.draftX);
    this.racksRoot.add(group);
    this.layout = { racks: [...this.layout.racks, unit] };
    this.focusedId = unit.id;
    const mode: CameraFocusMode = unit.kind === 'vitrine' ? 'vitrine' : 'rack';
    this.applyOrbitLimits(mode);
    this.moveCamera(this.poseFor(group, mode), immediate, CREATE_TWEEN_MS);
    this.onFocusCb?.(unit.id);
    if (!immediate) {
      group.position.y = -1.15;
      this.rises.push({ group, start: performance.now(), duration: CREATE_TWEEN_MS, fromY: -1.15, toY: 0 });
      const plate = group.getObjectByName('plate') as Mesh | undefined;
      if (plate) {
        lightPlate(plate, 0.95);
        this.plateGlow = { mesh: plate, start: performance.now(), duration: CREATE_TWEEN_MS };
      }
    }
    this.onDraftAnchorCb?.(null);
    this.requestRender();
  }

  draftScreenPoint(): { x: number; y: number } | null {
    if (!this.draft) return null;
    const plate = this.draft.getObjectByName('plate');
    if (plate) plate.getWorldPosition(this.projectScratch);
    else this.projectScratch.set(this.draftX, 0.6, 0.2);
    this.projectScratch.x += unitWidth(this.draftKind, 0) * 0.42;
    return this.worldToClient(this.projectScratch);
  }

  resize(): void {
    if (this.disposed || this.contextLost) return;
    const size = hostDrawingSize(this.host);
    if (!size) return;
    const ratio = atelierPixelRatio(this.reducedMotion);
    const changed =
      this.lastWidth !== size.width ||
      this.lastHeight !== size.height ||
      this.lastPixelRatio !== ratio;
    this.lastWidth = size.width;
    this.lastHeight = size.height;
    this.lastPixelRatio = ratio;
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(size.width, size.height, false);
    applyCanvasHostCss(this.canvas);
    if (changed && (this.racksRoot.children.length || this.draft)) {
      if (this.focusedId === OVERVIEW_FOCUS_ID) this.focusOverview(true);
      else if (this.focusedId === DRAFT_UNIT_ID) this.focusDraft(true);
      else this.focusRack(this.focusedId, true);
    }
    this.requestRender();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.cancelDeferredRacks();
    this.removeDraft(true);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown, NON_PASSIVE);
    this.canvas.removeEventListener('pointermove', this.onPointerMove, NON_PASSIVE);
    this.canvas.removeEventListener('pointerup', this.onPointerUp, NON_PASSIVE);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel, NON_PASSIVE);
    this.canvas.removeEventListener('lostpointercapture', this.onLostPointerCapture, NON_PASSIVE);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave, NON_PASSIVE);
    this.canvas.removeEventListener('touchstart', this.noopTouch, NON_PASSIVE);
    this.canvas.removeEventListener('touchmove', this.noopTouch, NON_PASSIVE);
    this.canvas.removeEventListener('wheel', this.noopTouch, NON_PASSIVE);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored, false);
    window.removeEventListener('resize', this.onHostResize);
    window.visualViewport?.removeEventListener('resize', this.onHostResize);
    window.removeEventListener('blur', this.onWindowBlur);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('end', this.onControlsEnd);
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.dispose();
    this.restoreAddEventListener?.();
    this.restoreAddEventListener = null;
    disposeObject3D(this.scene);
    disposeRenderer(this.renderer);
    this.onClickCb = null;
    this.onHoverCb = null;
    this.onFocusCb = null;
    this.onFirstFrameCb = null;
    this.onSceneCompleteCb = null;
    this.onDraftAnchorCb = null;
    this.onEmptyUnitCb = null;
    this.texQueue.dispose();
    this.loadedPhotos.clear();
    photoTextureCache.clear();
    this.keyLight = null;
    this.hdri?.dispose();
    this.hdri = null;
    this.pmrem?.dispose();
    this.pmrem = null;
    this.room = null;
    this.propsRoot = null;
    this.onProgressCb = null;
  }

  private restoreAfterContext(): void {
    this.markGpuStateDirty();
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.lastPixelRatio = 0;
    this.resize();
    if (this.hasLayout) {
      this.loadedPhotos.clear();
      this.finishedPhotos = 0;
      this.expectedPhotos = this.layout.racks.reduce((n, r) => n + r.hangers.length, 0);
      this.sceneCompleteSent = false;
      this.enqueueHangerTextures();
    }
    this.requestRender();
  }

  private markGpuStateDirty(): void {
    this.scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!material) continue;
        material.needsUpdate = true;
        const record = material as Material & Record<string, unknown>;
        for (const key of Object.keys(record)) {
          const value = record[key];
          if (value && typeof value === 'object' && 'isTexture' in value) {
            (value as Texture).needsUpdate = true;
          }
        }
      }
    });
  }

  private applyOrbitLimits(mode: CameraFocusMode): void {
    this.controls.minPolarAngle = CAMERA_POLAR_MIN;
    this.controls.maxPolarAngle = CAMERA_POLAR_MAX;
    this.controls.minAzimuthAngle = -CAMERA_AZIMUTH_LIMIT;
    this.controls.maxAzimuthAngle = CAMERA_AZIMUTH_LIMIT;
    if (mode === 'overview') {
      this.controls.minDistance = 3.6;
      this.controls.maxDistance = 16;
    } else if (mode === 'vitrine') {
      this.controls.minDistance = 1.4;
      this.controls.maxDistance = 6;
    } else {
      this.controls.minDistance = 1.2;
      this.controls.maxDistance = 10;
    }
  }

  private poseFor(object: Object3D, mode: CameraFocusMode): CameraPose {
    object.updateWorldMatrix(true, true);
    this.bounds.makeEmpty();
    if (mode === 'rack' && object instanceof Group) {
      const plate = object.getObjectByName('plate');
      const hangers = object.getObjectByName('hangers');
      if (plate) this.bounds.expandByObject(plate);
      if (hangers) this.bounds.expandByObject(hangers);
    }
    if (this.bounds.isEmpty()) this.bounds.expandByObject(object);
    if (this.bounds.isEmpty()) {
      return { position: { x: 0, y: 1.15, z: 3.2 }, target: { x: 0, y: 0.35, z: 0 }, distance: 3.2 };
    }
    this.bounds.getSize(this.fitSize);
    this.bounds.getCenter(this.fitCenter);
    const origin = new Vector3();
    object.getWorldPosition(origin);
    const halfW = Math.max(origin.x - this.bounds.min.x, this.bounds.max.x - origin.x, this.fitSize.x / 2);
    const box = {
      minX: mode === 'rack' ? origin.x - halfW : this.bounds.min.x,
      maxX: mode === 'rack' ? origin.x + halfW : this.bounds.max.x,
      minY: this.bounds.min.y - (mode === 'rack' ? 0.04 : 0),
      maxY: this.bounds.max.y + (mode === 'rack' ? 0.1 : 0),
      minZ: this.bounds.min.z,
      maxZ: this.bounds.max.z,
    };
    const compact = isCompactAtelierViewport();
    const chrome = measureAtelierChrome(this.host);
    if (mode === 'vitrine') return computeVitrineFit(box, this.camera.aspect, this.camera.fov, compact);
    return computeEyeLevelFit(box, this.camera.aspect, this.camera.fov, mode, compact, chrome);
  }

  private restoreFrontView(): void {
    if (this.focusedId === OVERVIEW_FOCUS_ID) {
      this.focusOverview(this.reducedMotion);
      return;
    }
    if (this.focusedId === DRAFT_UNIT_ID) {
      this.focusDraft(this.reducedMotion);
      return;
    }
    this.focusRack(this.focusedId, this.reducedMotion);
  }

  private moveCamera(pose: CameraPose, immediate: boolean, duration = CAMERA_TWEEN_MS): void {
    const toPos = new Vector3(pose.position.x, pose.position.y, pose.position.z);
    const toTarget = new Vector3(pose.target.x, pose.target.y, pose.target.z);
    if (immediate) {
      this.tween = null;
      this.camera.position.copy(toPos);
      this.controls.target.copy(toTarget);
      this.camera.near = Math.max(0.18, pose.distance / 40);
      this.camera.far = Math.max(80, pose.distance * 10);
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.clampCamera();
      this.requestRender();
      return;
    }
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      start: performance.now(),
      duration,
    };
    this.requestRender();
  }

  private requestRender(): void {
    if (this.renderQueued || this.disposed) return;
    this.renderQueued = true;
    this.raf = requestAnimationFrame(() => {
      this.renderQueued = false;
      if (this.disposed || this.contextLost) return;
      const animating =
        this.stepTween() ||
        this.stepLift() ||
        this.stepDraft() ||
        this.stepRise() ||
        this.stepGlow() ||
        this.stepArchive();
      if (!this.tween && !this.reducedMotion) this.controls.update();
      this.clampCamera();
      this.faceLabels();
      this.renderer.render(this.scene, this.camera);
      if (this.draft) this.onDraftAnchorCb?.(this.draftScreenPoint());
      if (this.hasLayout && !this.firstFrameSent) {
        this.firstFrameSent = true;
        this.onFirstFrameCb?.();
        this.armShadows();
        this.scheduleDeferredProps();
      }
      if (animating || this.draft || (!this.reducedMotion && (this.interacting || this.dampingFrames > 0))) {
        if (!this.interacting && this.dampingFrames > 0) this.dampingFrames -= 1;
        this.requestRender();
      }
    });
  }

  private clampCamera(): void {
    this.camera.up.set(0, 1, 0);
    if (this.controls.target.y < FLOOR_Y + 0.12) this.controls.target.y = FLOOR_Y + 0.12;
    this.orbitOffset.copy(this.camera.position).sub(this.controls.target);
    this.orbitSpherical.setFromVector3(this.orbitOffset);
    const locked = clampOrbitSpherical(this.orbitSpherical.theta, this.orbitSpherical.phi);
    this.orbitSpherical.theta = locked.theta;
    this.orbitSpherical.phi = locked.phi;
    this.orbitSpherical.makeSafe();
    this.orbitOffset.setFromSpherical(this.orbitSpherical);
    this.camera.position.copy(this.controls.target).add(this.orbitOffset);
    if (this.camera.position.y < CAMERA_MIN_Y) this.camera.position.y = CAMERA_MIN_Y;
    this.camera.lookAt(this.controls.target);
  }

  private focusDraft(immediate = this.reducedMotion): void {
    if (!this.draft) return;
    this.focusedId = DRAFT_UNIT_ID;
    const mode: CameraFocusMode = this.draftKind === 'vitrine' ? 'vitrine' : 'rack';
    this.applyOrbitLimits(mode);
    this.moveCamera(this.poseFor(this.draft, mode), immediate, CREATE_TWEEN_MS);
    this.onFocusCb?.(DRAFT_UNIT_ID);
  }

  private worldToClient(world: Vector3): { x: number; y: number } {
    this.projectScratch.copy(world).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (this.projectScratch.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-this.projectScratch.y * 0.5 + 0.5) * rect.height,
    };
  }

  private removeDraft(silent = false): void {
    this.draftFade = null;
    if (!this.draft) return;
    this.draft.removeFromParent();
    disposeObject3D(this.draft);
    this.draft = null;
    if (!silent) this.onDraftAnchorCb?.(null);
  }

  private stepDraft(): boolean {
    if (!this.draft || !this.draftFade) return false;
    const t = Math.min(1, (performance.now() - this.draftFade.start) / this.draftFade.duration);
    const e = easeInOutCubic(t);
    const opacity = this.draftFade.dir === 1 ? e : 1 - e;
    setGroupOpacity(this.draft, opacity);
    if (t >= 1) {
      const fadingOut = this.draftFade.dir === -1;
      this.draftFade = null;
      if (fadingOut) this.removeDraft();
      return false;
    }
    return true;
  }

  private stepRise(): boolean {
    if (!this.rises.length) return false;
    const now = performance.now();
    this.rises = this.rises.filter((rise) => {
      const t = Math.min(1, (now - rise.start) / rise.duration);
      const e = easeOutBack(t);
      rise.group.position.y = rise.fromY + (rise.toY - rise.fromY) * e;
      if (t >= 1) {
        rise.group.position.y = rise.toY;
        return false;
      }
      return true;
    });
    return this.rises.length > 0;
  }

  private stepArchive(): boolean {
    let running = false;
    if (this.hangerExit) {
      const t = Math.min(1, (performance.now() - this.hangerExit.start) / this.hangerExit.duration);
      const e = easeInOutCubic(t);
      this.hangerExit.group.position.y =
        this.hangerExit.fromY + (this.hangerExit.toY - this.hangerExit.fromY) * e;
      fadeObjectOpacity(this.hangerExit.group, 1 - e);
      if (t >= 1) {
        const rackId = this.hangerExit.rackId;
        this.hangerExit = null;
        this.remountUnit(rackId);
      } else {
        running = true;
      }
    }
    if (this.sink) {
      const t = Math.min(1, (performance.now() - this.sink.start) / this.sink.duration);
      const e = easeInOutCubic(t);
      this.sink.group.position.y = this.sink.fromY + (this.sink.toY - this.sink.fromY) * e;
      if (t >= 1) {
        const rackId = String(this.sink.group.userData?.['rackId'] ?? '');
        if (rackId) this.forgetUnitPhotos(rackId);
        this.sink.group.removeFromParent();
        disposeObject3D(this.sink.group);
        this.sink = null;
      } else {
        running = true;
      }
    }
    return running;
  }

  private stepGlow(): boolean {
    if (!this.plateGlow) return false;
    const t = Math.min(1, (performance.now() - this.plateGlow.start) / this.plateGlow.duration);
    lightPlate(this.plateGlow.mesh, 0.95 * (1 - easeInOutCubic(t)));
    if (t >= 1) {
      lightPlate(this.plateGlow.mesh, 0);
      this.plateGlow = null;
      return false;
    }
    return true;
  }

  /** Keep plates and name tags facing the lens so they do not overlap when orbiting. */
  private faceLabels(): void {
    const viewportH = this.canvas.clientHeight || this.renderer.domElement.height || 1;
    this.racksRoot.traverse((obj) => {
      if (obj.name === 'plate') {
        obj.quaternion.identity();
        return;
      }
      if (obj.name === 'label' || obj.name === 'labelBack') {
        obj.lookAt(this.camera.position);
        return;
      }
      if (obj.name !== 'badge') return;
      obj.lookAt(this.camera.position);
      const geom = (obj as Mesh).geometry as PlaneGeometry | undefined;
      const badgeH = geom?.parameters?.height || SOLD_OUT_BADGE_H;
      obj.getWorldPosition(this.projectScratch);
      const scale = soldOutBadgeScale(
        this.projectScratch.distanceTo(this.camera.position),
        this.camera.fov,
        viewportH,
        badgeH,
      );
      const capped = isCompactAtelierViewport() ? Math.min(scale, 1.22) : scale;
      obj.scale.set(capped, capped, 1);
    });
  }

  private stepTween(): boolean {
    if (!this.tween) return false;
    const t = Math.min(1, (performance.now() - this.tween.start) / this.tween.duration);
    const e = easeInOutCubic(t);
    this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, e);
    this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, e);
    if (t >= 1) {
      this.tween = null;
      this.controls.update();
      return false;
    }
    return true;
  }

  private stepLift(): boolean {
    if (this.reducedMotion) {
      this.lift = this.liftTarget;
    } else {
      this.lift += (this.liftTarget - this.lift) * 0.22;
      if (Math.abs(this.liftTarget - this.lift) < 0.001) this.lift = this.liftTarget;
    }
    if (this.hoverSlug) {
      const group = this.findHangerGroup(this.hoverSlug);
      const rest = Number(group?.userData['restY'] ?? group?.position.y ?? 0);
      if (group) group.position.y = rest + this.lift;
    }
    return this.lift !== this.liftTarget;
  }

  private moveHanger(group: Group, next: SceneHanger): void {
    const dest = this.racksRoot.children.find((c) => c.userData['rackId'] === next.rackId);
    if (!dest) return;
    const hangersRoot = dest.getObjectByName('hangers') as Group | undefined;
    if (!hangersRoot) return;
    hangersRoot.add(group);
    this.relayoutUnit(next.rackId);
  }

  private relayoutUnit(rackId: string): void {
    const dest = this.racksRoot.getObjectByName(`rack:${rackId}`) as Group | undefined;
    const hangersRoot = dest?.getObjectByName('hangers') as Group | undefined;
    const rack = this.layout.racks.find((r) => r.id === rackId);
    if (!hangersRoot || !rack) return;
    if (rack.kind === 'vitrine') {
      layoutTrays(hangersRoot, rack.hangers, vitrineWidth(rack.hangers.length));
    } else {
      const barTop = rackBarTop(rackRowCount(rack.hangers.length));
      layoutHangers(hangersRoot, rack.hangers, rackWidth(rack.hangers.length), barTop);
    }
  }

  private findHangerGroup(slug: string): Group | null {
    return (this.racksRoot.getObjectByName(`hanger:${slug}`) as Group | undefined) ?? null;
  }

  private hangerPhotoIsLive(slug: string): boolean {
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !isPhotoMaterial(garment.material)) return false;
    return isTextureLive(garment.material.map);
  }

  private hangerName(slug: string): string {
    for (const rack of this.layout.racks) {
      const found = rack.hangers.find((h) => h.slug === slug);
      if (found) return found.name;
    }
    return '';
  }

  private applyPiecePhoto(group: Group | null, texture: Texture): void {
    if (!group) return;
    const data = group.userData['data'] as SceneHanger | undefined;
    if (data?.kind === 'jewelry') {
      applyTrayPhoto(group, texture);
      return;
    }
    const garment = group.getObjectByName('garment') as Mesh | undefined;
    const frame = group.getObjectByName('frame') as Mesh | undefined;
    if (garment) applyPhotoAspect(garment, frame, texture);
  }

  private computeRackSlots(layout: SceneLayout): Array<{ id: string; rack: SceneRack; x: number }> {
    let cursor = 0;
    return layout.racks.map((rack) => {
      const width = unitWidth(rack.kind, rack.hangers.length);
      const x = cursor + width / 2;
      cursor += width + UNIT_GAP;
      return { id: rack.id, rack, x };
    });
  }

  private remountUnit(id: string): void {
    this.forgetUnitPhotos(id);
    const existing = this.racksRoot.getObjectByName(`rack:${id}`);
    const x = existing?.position.x ?? this.computeRackSlots(this.layout).find((s) => s.id === id)?.x;
    if (existing) {
      existing.removeFromParent();
      disposeObject3D(existing);
    }
    const rack = this.layout.racks.find((r) => r.id === id);
    if (!rack || x == null) return;
    this.mountRack({ rack, x });
    this.enqueueHangerTextures();
    this.requestRender();
  }

  /** Rack rebuilds create new meshes; drop the "already loaded" flag so photos rebind. */
  private forgetUnitPhotos(id: string): void {
    const rack = this.layout.racks.find((r) => r.id === id);
    for (const hanger of rack?.hangers ?? []) this.loadedPhotos.delete(hanger.slug);
    const existing = this.racksRoot.getObjectByName(`rack:${id}`);
    existing?.traverse((child) => {
      const slug = String(child.userData?.['slug'] ?? '');
      if (slug) this.loadedPhotos.delete(slug);
    });
  }

  private emptyUnitIdFromHits(hits: Array<{ object: Object3D }>): string | null {
    for (const hit of hits) {
      let obj: Object3D | null = hit.object;
      while (obj) {
        const rackId = String(obj.userData?.['rackId'] ?? '');
        const kind = String(obj.userData?.['kind'] ?? '');
        if (rackId && kind !== 'draft' && kind !== HANGER_USER_DATA) {
          const unit = this.layout.racks.find((r) => r.id === rackId);
          if (unit && unit.hangers.length === 0) return rackId;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  private mountRack(slot: { rack: SceneRack; x: number }): void {
    if (this.racksRoot.getObjectByName(`rack:${slot.rack.id}`)) return;
    const group =
      slot.rack.kind === 'vitrine'
        ? createJewelryVitrine(slot.rack, slot.x)
        : createCollectionRack(slot.rack, slot.x);
    this.racksRoot.add(group);
  }

  private ensureRackMounted(id: string): void {
    const index = this.deferredSlots.findIndex((slot) => slot.id === id);
    if (index < 0) return;
    const [slot] = this.deferredSlots.splice(index, 1);
    if (slot) this.mountRack(slot);
  }

  private scheduleDeferredRacks(): void {
    if (!this.deferredSlots.length) return;
    const pump = (deadline?: IdleDeadline) => {
      if (this.disposed) return;
      const started = performance.now();
      while (this.deferredSlots.length) {
        const remaining = deadline?.timeRemaining?.() ?? 8 - (performance.now() - started);
        if (remaining < 3 && this.racksRoot.children.length > 0) break;
        const next = this.deferredSlots.shift();
        if (next) this.mountRack(next);
      }
      if (this.deferredSlots.length) {
        this.scheduleDeferredRacks();
        return;
      }
      this.enqueueHangerTextures();
      this.requestRender();
      this.maybeSceneComplete();
    };
    if (typeof requestIdleCallback === 'function') {
      this.idleRic = requestIdleCallback((deadline) => pump(deadline), { timeout: 180 });
    } else {
      this.idleHandle = window.setTimeout(() => pump(), 0);
    }
  }

  private flushDeferredRacks(): void {
    this.cancelDeferredRacks(false);
    while (this.deferredSlots.length) {
      const next = this.deferredSlots.shift();
      if (next) this.mountRack(next);
    }
    this.enqueueHangerTextures();
    this.maybeSceneComplete();
  }

  private cancelDeferredRacks(clearQueue = true): void {
    if (this.idleRic && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(this.idleRic);
      this.idleRic = 0;
    }
    if (this.idleHandle) {
      window.clearTimeout(this.idleHandle);
      this.idleHandle = 0;
    }
    if (clearQueue) this.deferredSlots = [];
  }

  private releasePointer(pointerId?: number): void {
    const id = pointerId ?? this.capturedPointerId;
    if (id == null) return;
    try {
      if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    } catch {
      /* already released */
    }
    this.capturedPointerId = null;
  }

  private endOrbit(): void {
    this.interacting = false;
    this.dampingFrames = 0;
    this.controls.enableDamping = false;
    this.controls.update();
    this.clampCamera();
    this.controls.enableDamping = !this.reducedMotion;
    if (!this.tween) this.restoreFrontView();
    this.requestRender();
  }

  private enqueueHangerTextures(): void {
    const focused = this.focusedId;
    const focusedIndex = this.layout.racks.findIndex((r) => r.id === focused);
    this.layout.racks.forEach((rack, rackIndex) => {
      if (!this.racksRoot.getObjectByName(`rack:${rack.id}`)) return;
      rack.hangers.forEach((hanger, hangerIndex) => {
        this.texQueue.enqueue({
          id: hanger.slug,
          priority: hangerPhotoPriority(rack.id, focused, rackIndex, focusedIndex, hangerIndex),
          run: () => this.loadHangerTexture(hanger),
        });
      });
    });
  }

  private armShadows(): void {
    if (this.lite || this.shadowsArmed || this.disposed) return;
    this.shadowsArmed = true;
    this.renderer.shadowMap.enabled = true;
    if (this.keyLight) this.keyLight.castShadow = true;
    this.requestRender();
  }

  private async loadHangerTexture(hanger: SceneHanger | string, url?: string | null, name?: string): Promise<void> {
    const slug = typeof hanger === 'string' ? hanger : hanger.slug;
    if (this.disposed) return;
    if (this.loadedPhotos.has(slug)) {
      if (this.hangerPhotoIsLive(slug)) return;
      this.loadedPhotos.delete(slug);
    }
    const piece = typeof hanger === 'string' ? null : hanger;
    const label = piece?.name ?? name ?? this.hangerName(slug);
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!group || !garment || !isPhotoMaterial(garment.material)) {
      this.markPhotoFinished();
      return;
    }
    const previous = garment.material.map;
    const apply = (texture: Texture) => {
      const live = this.findHangerGroup(slug);
      const liveGarment = live?.getObjectByName('garment') as Mesh | undefined;
      if (!live || !liveGarment || !isPhotoMaterial(liveGarment.material)) return;
      applyPhotoMap(liveGarment.material, texture);
      this.applyPiecePhoto(live, texture);
      if (previous && previous !== texture) disposeOwnedTexture(previous);
      this.requestRender();
    };
    const candidates = hangerTextureUrls(
      piece ?? { imageUrl: url ?? null, thumbUrl: this.findHangerGroup(slug)?.userData?.['data']?.thumbUrl },
    );
    if (!candidates.length) {
      apply(makeFallbackTexture(COLLECTION_COVER_FALLBACK_HEX, label));
      this.loadedPhotos.add(slug);
      this.markPhotoFinished();
      return;
    }
    const texture = await loadTextureCandidates(candidates);
    if (this.disposed) {
      disposeOwnedTexture(texture);
      return;
    }
    apply(texture ?? makeFallbackTexture(COLLECTION_COVER_FALLBACK_HEX, label));
    this.loadedPhotos.add(slug);
    this.markPhotoFinished();
  }

  private markPhotoFinished(): void {
    this.finishedPhotos += 1;
    this.maybeSceneComplete();
  }

  private maybeSceneComplete(): void {
    if (this.sceneCompleteSent || this.disposed) return;
    if (this.deferredSlots.length) return;
    if (this.finishedPhotos < this.expectedPhotos) return;
    this.sceneCompleteSent = true;
    this.onSceneCompleteCb?.();
  }

  /** CPU raycast only — never GPU id-buffer / readPixels (that stalls the compositor). */
  private raycastPointer(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const roots = [this.racksRoot];
    if (this.propsRoot) roots.push(this.propsRoot);
    if (this.room) roots.push(this.room);
    return this.raycaster.intersectObjects(roots, true);
  }

  private pickHangerSlug(event: PointerEvent): string | null {
    return hangerSlugFromHits(this.raycastPointer(event));
  }

  private handlePointer(event: PointerEvent): void {
    const slug = this.pickHangerSlug(event);
    this.setHover(slug, { x: event.clientX, y: event.clientY });
    this.canvas.style.cursor = slug ? 'pointer' : 'grab';
  }

  private setHover(slug: string | null, pointer?: { x: number; y: number }): void {
    const changed = this.hoverSlug !== slug;
    if (changed) {
      if (this.hoverSlug) {
        const prev = this.findHangerGroup(this.hoverSlug);
        const rest = Number(prev?.userData['restY'] ?? prev?.position.y ?? 0);
        if (prev) prev.position.y = rest;
        this.tintHanger(this.hoverSlug, false);
      }
      this.hoverSlug = slug;
      this.lift = 0;
      this.liftTarget = slug && !this.reducedMotion ? HANGER_LIFT : 0;
      if (slug) {
        this.tintHanger(slug, true);
        if (this.reducedMotion) {
          const group = this.findHangerGroup(slug);
          const rest = Number(group?.userData['restY'] ?? group?.position.y ?? 0);
          if (group) group.position.y = rest;
        }
      }
    }
    if (changed || slug) this.onHoverCb?.(slug, pointer);
    if (changed) this.requestRender();
  }

  private tintHanger(slug: string, on: boolean): void {
    const group = this.findHangerGroup(slug);
    const frame = group?.getObjectByName('frame') as Mesh | undefined;
    if (!frame || !(frame.material instanceof MeshStandardMaterial)) return;
    frame.material.emissive.setHex(on ? 0xc4b08a : 0x000000);
    frame.material.emissiveIntensity = on ? 0.16 : 0;
  }

  private fitRoomToLayout(): void {
    if (!this.room) return;
    const slots = this.computeRackSlots(this.layout);
    if (!slots.length) {
      placeRackRugs(this.room, [{ x: 0, width: 2.6 }], this.lite);
      return;
    }
    placeRackRugs(
      this.room,
      slots.map((slot) => ({
        x: slot.x,
        width: unitWidth(slot.rack.kind, slot.rack.hangers.length),
      })),
      this.lite,
    );
  }

  private async loadRoomTextures(): Promise<void> {
    const wallMap = await loadColorTexture(ATELIER_ASSETS.plaster, this.manager, 4, 2);
    if (this.disposed || !this.room) {
      wallMap?.dispose();
      return;
    }
    const wall = this.room.getObjectByName('wall') as Mesh | undefined;
    if (wall?.material instanceof MeshStandardMaterial && wallMap) {
      const prev = wall.material.map;
      wall.material.map = wallMap;
      wall.material.color.setHex(0xf4efe6);
      wall.material.needsUpdate = true;
      disposeOwnedTexture(prev);
    } else {
      wallMap?.dispose();
    }
    this.requestRender();
  }

  private async loadHdriEnv(): Promise<void> {
    const texture = await loadHdri(ATELIER_ASSETS.hdri, this.manager);
    if (this.disposed || this.lite || !texture) {
      texture?.dispose();
      return;
    }
    texture.mapping = EquirectangularReflectionMapping;
    this.hdri = texture;
    this.pmrem = new PMREMGenerator(this.renderer);
    const env = this.pmrem.fromEquirectangular(texture).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.62;
    this.requestRender();
  }

  private scheduleDeferredProps(): void {
    if (this.propsArmed || this.disposed) return;
    this.propsArmed = true;
    const run = () => {
      if (this.disposed) return;
      void this.mountDeferredProps();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 240 });
    } else {
      window.setTimeout(run, 0);
    }
  }

  private async mountDeferredProps(): Promise<void> {
    if (this.disposed || !this.propsRoot) return;
    const [mannequinSrc, plantSrc] = await Promise.all([
      loadGlb(ATELIER_ASSETS.mannequin, this.manager),
      loadGlb(ATELIER_ASSETS.plantPotted, this.manager),
    ]);
    if (this.disposed || !this.propsRoot) return;
    this.mannequinSrc = mannequinSrc;
    this.plantSrc = plantSrc;
    this.layoutDeferredProps();
    this.requestRender();
  }

  private layoutDeferredProps(): void {
    if (!this.propsRoot || this.disposed) return;
    this.clearDeferredProps();
    const focused =
      this.focusedId === OVERVIEW_FOCUS_ID
        ? this.layout.racks
        : this.layout.racks.filter((rack) => rack.id === this.focusedId);
    const units = focused.length ? focused : this.layout.racks.slice(0, 1);

    for (const rack of units) {
      const unit = this.racksRoot.getObjectByName(`rack:${rack.id}`) as Group | undefined;
      if (!unit) continue;
      const width = Number(unit.userData['unitWidth'] ?? unitWidth(rack.kind, rack.hangers.length));
      const offset = mannequinOffset(width, rack.kind, rack.hangers.length);
      if (offset) {
        const form = this.mannequinSrc ? cloneGlb(this.mannequinSrc) : createDressForm(this.lite);
        form.name = `${MANNEQUIN_GROUP}:${rack.id}`;
        form.position.set(unit.position.x + offset.x, FLOOR_Y, offset.z);
        form.rotation.y = offset.rotY;
        if (this.mannequinSrc) this.fitPropToFloor(form, 1.48);
        hardenPropMaterials(form);
        form.userData = { ignorePick: true, kind: 'mannequin' };
        form.traverse((child) => {
          child.userData = { ...child.userData, ignorePick: true, kind: child.userData?.['kind'] ?? 'mannequin' };
        });
        this.propsRoot.add(form);
      }

      for (const [index, plantAt] of plantOffsets(width).entries()) {
        const pot = this.plantSrc ? cloneGlb(this.plantSrc) : createAtelierPlant(this.lite);
        pot.name = `plant:${rack.id}:${index}`;
        pot.position.set(unit.position.x + plantAt.x, FLOOR_Y, plantAt.z);
        if (this.plantSrc) this.fitPropToFloor(pot, 0.92);
        hardenPropMaterials(pot);
        pot.userData = { ignorePick: true, kind: 'plant' };
        pot.traverse((child) => {
          child.userData = { ...child.userData, ignorePick: true, kind: child.userData?.['kind'] ?? 'plant' };
        });
        this.propsRoot.add(pot);
      }
    }
    this.requestRender();
  }

  private fitPropToFloor(object: Group, targetHeight: number): void {
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    if (size.y > 0.05) object.scale.multiplyScalar(targetHeight / size.y);
    const next = new Box3().setFromObject(object);
    object.position.y += FLOOR_Y - next.min.y;
  }

  private clearDeferredProps(): void {
    if (!this.propsRoot) return;
    while (this.propsRoot.children.length) {
      const child = this.propsRoot.children[0]!;
      this.propsRoot.remove(child);
      disposeObject3D(child);
    }
  }
}

function hardenPropMaterials(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat || typeof mat !== 'object') continue;
      const record = mat as MeshStandardMaterial & { transmission?: number };
      record.transparent = false;
      record.opacity = 1;
      record.depthWrite = true;
      record.depthTest = true;
      if (typeof record.transmission === 'number') record.transmission = 0;
    }
  });
}

function fadeObjectOpacity(root: Object3D, opacity: number): void {
  root.traverse((child) => {
    const mat = (child as Mesh).material;
    if (!mat) return;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const item of mats) {
      if (!item || typeof item !== 'object' || !('opacity' in item)) continue;
      const next = item as { transparent: boolean; opacity: number };
      next.transparent = true;
      next.opacity = opacity;
    }
  });
}

export function createSceneEngine(
  canvas: HTMLCanvasElement,
  options: SceneEngineOptions = {},
): SceneEngine | null {
  if (!isWebGLAvailable()) return null;
  return tryCreate(() => new SceneEngine(canvas, options));
}

export { OVERVIEW_FOCUS_ID } from './camera-guide';
