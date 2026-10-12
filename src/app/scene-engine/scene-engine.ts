import {
  AmbientLight,
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
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCollectionRack, layoutHangers, rackWidth } from './collection-rack';
import { disposeObject3D, disposeRenderer } from './dispose';
import { applyHangerData, HANGER_USER_DATA } from './garment-hanger';
import { loadTextureSafe, makeFallbackTexture } from './texture-loader';
import { replaceHanger } from './mapping';
import type { SceneHanger, SceneLayout } from './types';

export type HangerPickHandler = (slug: string) => void;
export type HangerHoverHandler = (slug: string | null) => void;

export interface SceneEngineOptions {
  reducedMotion?: boolean;
}

/**
 * Framework-agnostic WebGL scene: renderer, orbit camera, lights,
 * click/hover raycast, texture load + CORS fallback, resize, full dispose.
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

  private raf = 0;
  private disposed = false;
  private hoverSlug: string | null = null;
  private layout: SceneLayout = { racks: [] };
  private onClickCb: HangerPickHandler | null = null;
  private onHoverCb: HangerHoverHandler | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private readonly onPointerMove = (event: PointerEvent) => this.handlePointer(event, false);
  private readonly onPointerUp = (event: PointerEvent) => this.handlePointer(event, true);
  private readonly onPointerLeave = () => this.setHover(null);

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
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 16;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0.5, 0);
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
    if (this.disposed) return;
    const tick = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(tick);
      if (!this.reducedMotion) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(tick);
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
        void this.loadHangerTexture(hanger.slug, hanger.imageUrl);
      }
    }

    const total = Math.max(cursor - gap, 2);
    this.controls.target.set(total / 2, 0.45, 0);
    this.camera.position.set(total / 2, this.reducedMotion ? 1.6 : 1.45, Math.max(5.4, total * 0.42 + 4.2));
    this.controls.update();
  }

  updateHanger(next: SceneHanger): void {
    this.layout = replaceHanger(this.layout, next);
    const group = this.findHangerGroup(next.slug);
    if (!group) return;
    const prev = group.userData['data'] as SceneHanger | undefined;
    applyHangerData(group, next);
    if (prev?.imageUrl !== next.imageUrl) {
      void this.loadHangerTexture(next.slug, next.imageUrl);
    }
    if (prev && prev.rackId !== next.rackId) {
      this.moveHanger(group, next);
    }
  }

  resize(): void {
    if (this.disposed) return;
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    disposeObject3D(this.scene);
    disposeRenderer(this.renderer);
    this.onClickCb = null;
    this.onHoverCb = null;
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

  private async loadHangerTexture(slug: string, url: string | null): Promise<void> {
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !(garment.material instanceof MeshStandardMaterial)) return;
    const previous = garment.material.map;
    if (!url) {
      garment.material.map = makeFallbackTexture();
      garment.material.needsUpdate = true;
      if (previous && previous !== garment.material.map) previous.dispose();
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
    still.material.map = texture ?? makeFallbackTexture();
    still.material.needsUpdate = true;
    if (previous && previous !== still.material.map) previous.dispose();
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
  }

  private tintHanger(slug: string, on: boolean): void {
    const group = this.findHangerGroup(slug);
    const garment = group?.getObjectByName('garment') as Mesh | undefined;
    if (!garment || !(garment.material instanceof MeshStandardMaterial)) return;
    garment.material.emissive.setHex(on ? 0x2a241c : 0x000000);
    garment.material.emissiveIntensity = on ? 0.18 : 0;
  }
}
