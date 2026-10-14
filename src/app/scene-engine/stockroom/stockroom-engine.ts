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
import { OVERVIEW_FOCUS_ID, easeInOutCubic, measureAtelierChrome } from '../camera-guide';
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
import { CC0_KIT } from './stockroom-kit-cc0';
import { placeMatrix, type KitBuilder, type PlaceOptions, type StockroomKit } from './stockroom-kit';
import {
  STOCKROOM_AZIMUTH_DEFAULT,
  STOCKROOM_AZIMUTH_LIMIT,
  STOCKROOM_CAMERA_DISTANCE,
  STOCKROOM_FRUSTUM_HALF,
  STOCKROOM_POLAR_AREA,
  STOCKROOM_POLAR_DEFAULT,
  STOCKROOM_POLAR_MAX,
  STOCKROOM_POLAR_PIECE,
  STOCKROOM_POLAR_MIN,
  STOCKROOM_TWEEN_MS,
  clampStockroomTarget,
  fitOrthoBox,
  lerpPose,
  offsetDirection,
  stockroomZoomLimits,
  type StockroomInsets,
  type StockroomPose,
} from './stockroom-camera';
import { areaTint, boxBadge, boxPhotoTint, makeBadgeTexture, makeSignTexture } from './stockroom-labels';
import {
  AREA_BACK_INSET,
  SIGN_H,
  SIGN_TILT,
  areaFocusBox,
  planStockroom,
  signY,
  slotFocusBox,
  type StockroomArea,
  type StockroomPlan,
  type StockroomUnitInput,
} from './stockroom-layout';

export { placeMatrix } from './stockroom-kit';

export interface StockroomEngineOptions extends SceneEngineOptions {
  /** Option A (`CC0_KIT`, default) or option B (`SKETCHFAB_KIT`). */
  kit?: StockroomKit;
}

const CLEAR = 0xd9d2c7;
const SHARED = 'stockroomShared';
const TAP_MAX_PX = 6;
const TAP_MAX_MS = 650;
const ARCHIVE_MS = 500;
const POP_MS = 420;
const PHOTO_CONCURRENCY = 6;
const CUTAWAY_MS = 260;
const NON_PASSIVE: AddEventListenerOptions = { passive: false };

interface BoxNode {
  group: Group;
  photo: Mesh<PlaneGeometry, MeshBasicMaterial>;
  badge: Mesh<PlaneGeometry, MeshBasicMaterial>;
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
 * Stockroom admin scene for options A (`?cc0=1`, Kenney boxes on bookcases) and
 * B (`?sketchfab=1`, hangers on wall rails) — the kit decides the models. One
 * floor area per collection, one piece per product with its photo large and a
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
  private readonly restoreAddEventListener: (() => void) | null;
  private resizeObserver: ResizeObserver | null = null;

  private layout: SceneLayout = { racks: [] };
  private draft: { kind: SceneUnitKind; name: string } | null = null;
  private plan: StockroomPlan;
  private focus: Focus = { kind: 'overview' };
  private focusedId = OVERVIEW_FOCUS_ID;
  private insets: StockroomInsets = { top: 0.1, bottom: 0.18 };
  private overviewZoom = 1;
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

  constructor(canvas: HTMLCanvasElement, options: StockroomEngineOptions = {}) {
    this.kit = options.kit ?? CC0_KIT;
    this.plan = planStockroom([], undefined, this.kit.bay);
    this.photoGeometry = new PlaneGeometry(this.kit.photo.w, this.kit.photo.h);
    this.badgeGeometry = new PlaneGeometry(this.kit.photo.w, this.kit.badge.h);
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

  onPanChange(_handler: PanChangeHandler): void {
    /* Areas are framed whole; there is no per-rack pan window. */
  }

  panRack(_delta: -1 | 1): boolean {
    return false;
  }

  canPan(_delta: -1 | 1): boolean {
    return false;
  }

  rackPanState(): RackPanProgress {
    return { ...EMPTY_RACK_PAN };
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
    }
    void this.assetsReady.then(() => {
      if (this.disposed) return;
      const first = !this.built;
      this.rebuild();
      this.refocus(first || this.reducedMotion);
    });
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
    if (changed && this.built && !this.userMoved) this.refocus(true);
    this.requestRender();
  }

  refitToChrome(): void {
    if (this.disposed) return;
    this.insets = measureAtelierChrome(this.host);
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
    this.plan = planStockroom(this.units(), undefined, this.kit.bay);
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
    this.applyCutaway(true);
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
    const node: BoxNode = { group, photo, badge, hanger, areaId };
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
  ): StockroomPose {
    const box = new Box3(new Vector3(...min), new Vector3(...max));
    const azimuth = STOCKROOM_AZIMUTH_DEFAULT;
    const { zoom, target } = fitOrthoBox(box, polar, azimuth, this.aspect(), this.insets);
    return { polar, azimuth, target, zoom };
  }

  private overviewPose(): StockroomPose {
    const b = this.plan.bounds;
    return this.fitPose([b.minX, 0, b.minZ], [b.maxX, this.kit.bay.height, b.maxZ]);
  }

  private areaPose(id: string): StockroomPose | null {
    const area = this.plan.areas.find((a) => a.id === id);
    if (!area) return null;
    const box = areaFocusBox(area, this.kit.bay);
    return this.fitPose(box.min, box.max, STOCKROOM_POLAR_AREA);
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
    this.applyCutaway(false);
    this.onFocusCb?.(id);
  }

  /** Signs of rows in front of the focused area fade out so they never cover its shelves. */
  private applyCutaway(immediate: boolean): void {
    const focused = this.plan.areas.find((a) => a.id === this.focusedId);
    for (const area of this.plan.areas) {
      const sign = this.areaNodes.get(area.id)?.getObjectByName('sign') as Mesh | undefined;
      if (!sign) continue;
      const material = sign.material as MeshBasicMaterial;
      const to = focused && area.row > focused.row ? 0 : 1;
      const from = sign.visible ? material.opacity : 0;
      if (Math.abs(from - to) < 1e-3 && sign.visible === (to > 0)) continue;
      const set = (opacity: number) => {
        material.opacity = opacity;
        material.transparent = opacity < 1;
        sign.visible = opacity > 0.001;
        material.needsUpdate = true;
      };
      if (immediate || this.reducedMotion) {
        set(to);
        continue;
      }
      sign.visible = true;
      this.animate(CUTAWAY_MS, (t) => set(from + (to - from) * easeInOutCubic(t)));
    }
    this.requestRender();
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
    this.renderer.render(this.scene, this.camera);
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
    if (prev) prev.group.scale.setScalar(1);
    this.hoverSlug = slug;
    const next = slug ? this.boxes.get(slug) : null;
    if (next) next.group.scale.setScalar(1.06);
    if (!slug) this.onHoverCb?.(null);
    this.requestRender();
  }
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
