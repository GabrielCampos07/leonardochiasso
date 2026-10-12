import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makePlasterTexture, makeWoodFloorTexture } from './atelier-materials';
import {
  CAMERA_AZIMUTH_LIMIT,
  CAMERA_MIN_Y,
  CAMERA_POLAR_MAX,
  CAMERA_POLAR_MIN,
  CAMERA_TWEEN_MS,
  CameraFocusMode,
  CameraPose,
  OVERVIEW_FOCUS_ID,
  computeEyeLevelFit,
  computeVitrineFit,
  easeInOutCubic,
  isCompactAtelierViewport,
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
  createJewelryVitrine,
  layoutTrays,
  vitrineWidth,
} from './jewelry-vitrine';
import { disposeObject3D, disposeRenderer } from './dispose';
import { applyHangerData, applyPhotoAspect, HANGER_LIFT, HANGER_USER_DATA } from './garment-hanger';
import { loadTextureSafe, makeFallbackTexture } from './texture-loader';
import { replaceHanger } from './mapping';
import type { SceneHanger, SceneLayout } from './types';
import { isWebGLAvailable, tryCreate } from './webgl-support';

export type HangerPickHandler = (slug: string) => void;
export type HangerHoverHandler = (
  slug: string | null,
  pointer?: { x: number; y: number },
) => void;
export type FocusChangeHandler = (id: string) => void;
export type FirstFrameHandler = () => void;

export interface SceneEngineOptions {
  reducedMotion?: boolean;
}

const DRAG_SLOP_SQ = 36;
const CLEAR = 0xefe8dc;

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
  private readonly fitSize = new Vector3();
  private readonly fitCenter = new Vector3();
  private readonly bounds = new Box3();

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
  private firstFrameSent = false;
  private hasLayout = false;
  private resizeObserver: ResizeObserver | null = null;
  private tween: {
    fromPos: Vector3;
    toPos: Vector3;
    fromTarget: Vector3;
    toTarget: Vector3;
    start: number;
    duration: number;
  } | null = null;

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    this.pendingHover = event;
    if (this.hoverQueued) return;
    this.hoverQueued = true;
    requestAnimationFrame(() => {
      this.hoverQueued = false;
      if (this.disposed || !this.pendingHover) return;
      this.handlePointer(this.pendingHover, false);
      this.pendingHover = null;
    });
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    if (dx * dx + dy * dy > DRAG_SLOP_SQ) return;
    this.handlePointer(event, true);
  };
  private readonly onPointerLeave = () => this.setHover(null);
  private readonly onControlsStart = () => {
    this.interacting = true;
    this.dampingFrames = this.reducedMotion ? 0 : 24;
    this.requestRender();
  };
  private readonly onControlsEnd = () => {
    this.interacting = false;
    this.dampingFrames = this.reducedMotion ? 0 : 24;
    this.restoreFrontView();
    this.requestRender();
  };
  private readonly onControlsChange = () => this.requestRender();

  constructor(canvas: HTMLCanvasElement, options: SceneEngineOptions = {}) {
    this.canvas = canvas;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.scene.background = new Color(CLEAR);
    this.scene.fog = new Fog(CLEAR, 22, 48);

    this.camera = new PerspectiveCamera(38, 1, 0.1, 80);
    this.camera.position.set(0, 1.15, 3.2);

    this.renderer = new WebGLRenderer({ canvas, antialias: !this.reducedMotion, alpha: false });
    this.renderer.setPixelRatio(this.reducedMotion ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(CLEAR, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

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

    this.scene.add(new AmbientLight(0xfff3e4, 0.32));
    this.scene.add(new HemisphereLight(0xfff4e8, 0x4a3d32, 0.38));

    const key = new DirectionalLight(0xffe2c4, 1.35);
    key.position.set(3.1, 6.2, 4.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 2.2;
    key.shadow.bias = -0.00025;
    this.scene.add(key);

    const fill = new DirectionalLight(0xd8c8b4, 0.28);
    fill.position.set(-3.4, 2.4, 1.6);
    this.scene.add(fill);

    const floor = new Mesh(
      new BoxGeometry(96, 0.1, 64),
      new MeshStandardMaterial({
        color: 0xffffff,
        map: makeWoodFloorTexture(),
        roughness: 0.88,
        metalness: 0,
      }),
    );
    floor.position.y = FLOOR_Y - 0.05;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new Mesh(
      new PlaneGeometry(110, 18),
      new MeshStandardMaterial({
        color: 0xffffff,
        map: makePlasterTexture(),
        roughness: 0.92,
        metalness: 0,
      }),
    );
    wall.position.set(10, 6.4, -2.4);
    wall.receiveShadow = true;
    this.scene.add(wall);

    this.racksRoot.name = 'racks';
    this.scene.add(this.racksRoot);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
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

  start(): void {
    this.requestRender();
  }

  focusedRackId(): string {
    return this.focusedId;
  }

  setLayout(layout: SceneLayout): void {
    this.layout = layout;
    while (this.racksRoot.children.length) {
      const child = this.racksRoot.children[0]!;
      this.racksRoot.remove(child);
      disposeObject3D(child);
    }

    let cursor = 0;
    const gap = 1.35;
    for (const rack of layout.racks) {
      const width = rack.kind === 'vitrine' ? vitrineWidth(rack.hangers.length) : rackWidth(rack.hangers.length);
      const x = cursor + width / 2;
      const group = rack.kind === 'vitrine' ? createJewelryVitrine(rack, x) : createCollectionRack(rack, x);
      this.racksRoot.add(group);
      cursor += width + gap;
      for (const hanger of rack.hangers) {
        void this.loadHangerTexture(hanger.slug, hanger.imageUrl, hanger.name);
      }
    }

    this.hasLayout = true;
    this.firstFrameSent = false;
    const first = layout.racks[0]?.id;
    if (first) this.focusRack(first, true);
    else this.focusOverview(true);
    this.requestRender();
  }

  focusRack(id: string, immediate = this.reducedMotion): void {
    if (id === OVERVIEW_FOCUS_ID) {
      this.focusOverview(immediate);
      return;
    }
    const group = this.racksRoot.getObjectByName(`rack:${id}`);
    if (!group) return;
    this.focusedId = id;
    const unit = this.layout.racks.find((r) => r.id === id);
    const mode: CameraFocusMode = unit?.kind === 'vitrine' ? 'vitrine' : 'rack';
    this.applyOrbitLimits(mode);
    this.moveCamera(this.poseFor(group as Group, mode), immediate);
    this.onFocusCb?.(id);
  }

  focusOverview(immediate = this.reducedMotion): void {
    this.focusedId = OVERVIEW_FOCUS_ID;
    this.applyOrbitLimits('overview');
    this.moveCamera(this.poseFor(this.racksRoot, 'overview'), immediate);
    this.onFocusCb?.(OVERVIEW_FOCUS_ID);
  }

  updateHanger(next: SceneHanger): void {
    this.layout = replaceHanger(this.layout, next);
    const group = this.findHangerGroup(next.slug);
    if (!group) return;
    const prev = group.userData['data'] as SceneHanger | undefined;
    if (next.kind === 'jewelry') applyTrayData(group, next);
    else applyHangerData(group, next);
    if (prev?.imageUrl !== next.imageUrl) {
      void this.loadHangerTexture(next.slug, next.imageUrl, next.name);
    }
    if (prev && prev.rackId !== next.rackId) {
      this.moveHanger(group, next);
    }
    this.requestRender();
  }

  resize(): void {
    if (this.disposed) return;
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.racksRoot.children.length) {
      if (this.focusedId === OVERVIEW_FOCUS_ID) this.focusOverview(true);
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
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('end', this.onControlsEnd);
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.dispose();
    disposeObject3D(this.scene);
    disposeRenderer(this.renderer);
    this.onClickCb = null;
    this.onHoverCb = null;
    this.onFocusCb = null;
    this.onFirstFrameCb = null;
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
      this.controls.minDistance = 1.8;
      this.controls.maxDistance = 12;
    }
  }

  private poseFor(object: Object3D, mode: CameraFocusMode): CameraPose {
    this.bounds.makeEmpty();
    this.bounds.expandByObject(object);
    if (this.bounds.isEmpty()) {
      return { position: { x: 0, y: 1.15, z: 3.2 }, target: { x: 0, y: 0.35, z: 0 }, distance: 3.2 };
    }
    this.bounds.getSize(this.fitSize);
    this.bounds.getCenter(this.fitCenter);
    const box = {
      minX: this.bounds.min.x,
      maxX: this.bounds.max.x,
      minY: this.bounds.min.y,
      maxY: this.bounds.max.y,
      minZ: this.bounds.min.z,
      maxZ: this.bounds.max.z,
    };
    const compact = isCompactAtelierViewport();
    if (mode === 'vitrine') return computeVitrineFit(box, this.camera.aspect, this.camera.fov, compact);
    return computeEyeLevelFit(box, this.camera.aspect, this.camera.fov, mode, compact);
  }

  private restoreFrontView(): void {
    if (this.focusedId === OVERVIEW_FOCUS_ID) {
      this.focusOverview(this.reducedMotion);
      return;
    }
    this.focusRack(this.focusedId, this.reducedMotion);
  }

  private moveCamera(pose: CameraPose, immediate: boolean): void {
    const toPos = new Vector3(pose.position.x, pose.position.y, pose.position.z);
    const toTarget = new Vector3(pose.target.x, pose.target.y, pose.target.z);
    if (immediate) {
      this.tween = null;
      this.camera.position.copy(toPos);
      this.controls.target.copy(toTarget);
      this.camera.near = Math.max(0.05, pose.distance / 80);
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
      duration: CAMERA_TWEEN_MS,
    };
    this.requestRender();
  }

  private requestRender(): void {
    if (this.renderQueued || this.disposed) return;
    this.renderQueued = true;
    this.raf = requestAnimationFrame(() => {
      this.renderQueued = false;
      if (this.disposed) return;
      const animating = this.stepTween() || this.stepLift();
      if (!this.reducedMotion) this.controls.update();
      this.clampCamera();
      this.faceLabels();
      this.renderer.render(this.scene, this.camera);
      if (this.hasLayout && !this.firstFrameSent) {
        this.firstFrameSent = true;
        this.onFirstFrameCb?.();
      }
      if (animating || (!this.reducedMotion && (this.interacting || this.dampingFrames > 0))) {
        if (!this.interacting && this.dampingFrames > 0) this.dampingFrames -= 1;
        this.requestRender();
      }
    });
  }

  private clampCamera(): void {
    if (this.camera.position.y < CAMERA_MIN_Y) this.camera.position.y = CAMERA_MIN_Y;
    if (this.controls.target.y < FLOOR_Y + 0.12) this.controls.target.y = FLOOR_Y + 0.12;
    this.camera.up.set(0, 1, 0);
  }

  /** Keep plates and name tags facing the lens so they do not overlap when orbiting. */
  private faceLabels(): void {
    this.racksRoot.traverse((obj) => {
      if (obj.name === 'plate' || obj.name === 'label' || obj.name === 'badge') {
        obj.lookAt(this.camera.position);
      }
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
    const rack = this.layout.racks.find((r) => r.id === next.rackId);
    if (rack?.kind === 'vitrine') {
      layoutTrays(hangersRoot, rack.hangers, vitrineWidth(rack.hangers.length));
    } else if (rack) {
      const barTop = rackBarTop(rackRowCount(rack.hangers.length));
      layoutHangers(hangersRoot, rack.hangers, rackWidth(rack.hangers.length), barTop);
    }
  }

  private findHangerGroup(slug: string): Group | null {
    return (this.racksRoot.getObjectByName(`hanger:${slug}`) as Group | undefined) ?? null;
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

  private async loadHangerTexture(slug: string, url: string | null, name?: string): Promise<void> {
    const label = name ?? this.hangerName(slug);
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!group || !garment || !(garment.material instanceof MeshStandardMaterial)) return;
    const previous = garment.material.map;
    const apply = (texture: Texture) => {
      const live = this.findHangerGroup(slug);
      const liveGarment = live?.getObjectByName('garment') as Mesh | undefined;
      if (!live || !liveGarment || !(liveGarment.material instanceof MeshStandardMaterial)) return;
      liveGarment.material.map = texture;
      liveGarment.material.needsUpdate = true;
      this.applyPiecePhoto(live, texture);
      if (previous && previous !== texture) previous.dispose();
      this.requestRender();
    };
    if (!url) {
      apply(makeFallbackTexture('#c8c2b8', label));
      return;
    }
    const texture = await loadTextureSafe(url);
    if (this.disposed) {
      texture?.dispose();
      return;
    }
    apply(texture ?? makeFallbackTexture('#c8c2b8', label));
  }

  private handlePointer(event: PointerEvent, isClick: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.racksRoot.children, true);
    const slug = hits.find(
      (h) => !h.object.userData?.['ignorePick'] && h.object.userData?.['kind'] === HANGER_USER_DATA,
    )?.object.userData?.['slug'] as string | undefined;
    if (isClick) {
      if (slug) this.onClickCb?.(slug);
      return;
    }
    this.setHover(slug ?? null, { x: event.clientX, y: event.clientY });
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
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !(garment.material instanceof MeshStandardMaterial)) return;
    garment.material.emissive.setHex(on ? 0x2a241c : 0x000000);
    garment.material.emissiveIntensity = on ? 0.12 : 0;
  }
}

export function createSceneEngine(
  canvas: HTMLCanvasElement,
  options: SceneEngineOptions = {},
): SceneEngine | null {
  if (!isWebGLAvailable()) return null;
  return tryCreate(() => new SceneEngine(canvas, options));
}

export { OVERVIEW_FOCUS_ID } from './camera-guide';
