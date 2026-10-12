import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCollectionRack, layoutHangers, rackWidth } from './collection-rack';
import { disposeObject3D, disposeRenderer } from './dispose';
import { applyHangerData, HANGER_USER_DATA } from './garment-hanger';
import { loadTextureSafe, makeFallbackTexture } from './texture-loader';
import { replaceHanger } from './mapping';
import type { SceneHanger, SceneLayout } from './types';
import { isWebGLAvailable, tryCreate } from './webgl-support';

export type HangerPickHandler = (slug: string) => void;
export type HangerHoverHandler = (slug: string | null) => void;

export interface SceneEngineOptions {
  reducedMotion?: boolean;
}

const FIT_MARGIN = 1.32;
const DRAG_SLOP_SQ = 36;

/**
 * Framework-agnostic WebGL scene: renderer, orbit camera, lights,
 * click/hover *raycast* (no readPixels), texture load + CORS fallback,
 * fit-to-bbox camera, render-on-demand, resize, full dispose.
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
  private layout: SceneLayout = { racks: [] };
  private onClickCb: HangerPickHandler | null = null;
  private onHoverCb: HangerHoverHandler | null = null;
  private resizeObserver: ResizeObserver | null = null;

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
    this.requestRender();
  };
  private readonly onControlsChange = () => this.requestRender();

  constructor(canvas: HTMLCanvasElement, options: SceneEngineOptions = {}) {
    this.canvas = canvas;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.scene.background = new Color(0xf4f1ea);

    this.camera = new PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(0, 1.4, 6.2);

    this.renderer = new WebGLRenderer({ canvas, antialias: !this.reducedMotion, alpha: false });
    this.renderer.setPixelRatio(this.reducedMotion ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0xf4f1ea, 1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !this.reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 28;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0.5, 0);
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('end', this.onControlsEnd);
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.update();

    this.scene.add(new AmbientLight(0xffffff, 0.55));
    const hemi = new HemisphereLight(0xf7f3ea, 0x3a322c, 0.45);
    this.scene.add(hemi);
    const key = new DirectionalLight(0xfff6ea, 1.05);
    key.position.set(2.4, 5.2, 3.2);
    this.scene.add(key);
    const fill = new DirectionalLight(0xdde6f0, 0.35);
    fill.position.set(-3, 2, -2);
    this.scene.add(fill);

    const floor = new Mesh(
      new PlaneGeometry(40, 24),
      new MeshStandardMaterial({ color: 0xe7e2d8, roughness: 0.95, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.7;
    floor.receiveShadow = false;
    this.scene.add(floor);

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

  start(): void {
    this.requestRender();
  }

  setLayout(layout: SceneLayout): void {
    this.layout = layout;
    while (this.racksRoot.children.length) {
      const child = this.racksRoot.children[0]!;
      this.racksRoot.remove(child);
      disposeObject3D(child);
    }

    let cursor = 0;
    const gap = 1.15;
    for (const rack of layout.racks) {
      const width = rackWidth(rack.hangers.length);
      const x = cursor + width / 2;
      const group = createCollectionRack(rack, x);
      this.racksRoot.add(group);
      cursor += width + gap;
      for (const hanger of rack.hangers) {
        void this.loadHangerTexture(hanger.slug, hanger.imageUrl, hanger.name);
      }
    }

    this.fitCameraToRacks();
    this.requestRender();
  }

  updateHanger(next: SceneHanger): void {
    this.layout = replaceHanger(this.layout, next);
    const group = this.findHangerGroup(next.slug);
    if (!group) return;
    const prev = group.userData['data'] as SceneHanger | undefined;
    applyHangerData(group, next);
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
    if (this.racksRoot.children.length) this.fitCameraToRacks();
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
  }

  private fitCameraToRacks(): void {
    this.bounds.makeEmpty();
    this.bounds.expandByObject(this.racksRoot);
    if (this.bounds.isEmpty()) return;

    this.bounds.getSize(this.fitSize);
    this.bounds.getCenter(this.fitCenter);
    const pad = Math.max(this.fitSize.x, this.fitSize.y, 1) * 0.14 + 0.45;
    this.bounds.expandByScalar(pad);
    this.bounds.getSize(this.fitSize);
    this.bounds.getCenter(this.fitCenter);

    const fov = this.camera.fov * (Math.PI / 180);
    const fitH = this.fitSize.y / (2 * Math.tan(fov / 2));
    const fitW = this.fitSize.x / (2 * Math.tan(fov / 2) * Math.max(this.camera.aspect, 0.2));
    const dist = Math.max(fitH, fitW, this.controls.minDistance + 0.4) * FIT_MARGIN;

    this.controls.target.copy(this.fitCenter);
    this.camera.position.set(this.fitCenter.x, this.fitCenter.y + this.fitSize.y * 0.06, this.fitCenter.z + dist);
    this.camera.near = Math.max(0.05, dist / 80);
    this.camera.far = Math.max(80, dist * 10);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private requestRender(): void {
    if (this.renderQueued || this.disposed) return;
    this.renderQueued = true;
    this.raf = requestAnimationFrame(() => {
      this.renderQueued = false;
      if (this.disposed) return;
      if (!this.reducedMotion) this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (!this.reducedMotion && (this.interacting || this.dampingFrames > 0)) {
        if (!this.interacting && this.dampingFrames > 0) this.dampingFrames -= 1;
        this.requestRender();
      }
    });
  }

  private moveHanger(group: Group, next: SceneHanger): void {
    const dest = this.racksRoot.children.find((c) => c.userData['rackId'] === next.rackId);
    if (!dest) return;
    const hangersRoot = dest.getObjectByName('hangers') as Group | undefined;
    if (!hangersRoot) return;
    hangersRoot.add(group);
    const rack = this.layout.racks.find((r) => r.id === next.rackId);
    if (rack) {
      layoutHangers(hangersRoot, rack.hangers, rackWidth(rack.hangers.length));
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

  private async loadHangerTexture(slug: string, url: string | null, name?: string): Promise<void> {
    const label = name ?? this.hangerName(slug);
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !(garment.material instanceof MeshStandardMaterial)) return;
    const previous = garment.material.map;
    if (!url) {
      garment.material.map = makeFallbackTexture('#c8c2b8', label);
      garment.material.needsUpdate = true;
      if (previous && previous !== garment.material.map) previous.dispose();
      this.requestRender();
      return;
    }
    const texture = await loadTextureSafe(url);
    if (this.disposed) {
      texture?.dispose();
      return;
    }
    const still = this.findHangerGroup(slug)?.getObjectByName('garment') as Mesh | undefined;
    if (!still || !(still.material instanceof MeshStandardMaterial)) {
      texture?.dispose();
      return;
    }
    still.material.map = texture ?? makeFallbackTexture('#c8c2b8', label);
    still.material.needsUpdate = true;
    if (previous && previous !== still.material.map) previous.dispose();
    this.requestRender();
  }

  private handlePointer(event: PointerEvent, isClick: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.racksRoot.children, true);
    const slug = hits.find((h) => h.object.userData?.['kind'] === HANGER_USER_DATA)?.object.userData?.[
      'slug'
    ] as string | undefined;
    if (isClick) {
      if (slug) this.onClickCb?.(slug);
      return;
    }
    this.setHover(slug ?? null);
    this.canvas.style.cursor = slug ? 'pointer' : 'grab';
  }

  private setHover(slug: string | null): void {
    if (this.hoverSlug === slug) return;
    if (this.hoverSlug) this.tintHanger(this.hoverSlug, false);
    this.hoverSlug = slug;
    if (slug) this.tintHanger(slug, true);
    this.onHoverCb?.(slug);
    this.requestRender();
  }

  private tintHanger(slug: string, on: boolean): void {
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !(garment.material instanceof MeshStandardMaterial)) return;
    garment.material.emissive.setHex(on ? 0x2a241c : 0x000000);
    garment.material.emissiveIntensity = on ? 0.18 : 0;
  }
}

export function createSceneEngine(
  canvas: HTMLCanvasElement,
  options: SceneEngineOptions = {},
): SceneEngine | null {
  if (!isWebGLAvailable()) return null;
  return tryCreate(() => new SceneEngine(canvas, options));
}
