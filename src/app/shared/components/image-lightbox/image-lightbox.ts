import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'lc-image-lightbox',
  standalone: true,
  template: `
    <div
      class="lb"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="alt() || 'Imagem ampliada'"
      [style.--lb-dismiss]="dismissProgress()"
    >
      <div class="lb__scrim" (click)="closed.emit()"></div>

      <div class="lb__chrome">
        <p class="lb__title">{{ alt() }}</p>
        <div class="lb__actions">
          <button type="button" class="lb__btn lb__btn--zoom" aria-label="Diminuir zoom" (click)="zoomOut()">
            −
          </button>
          <button type="button" class="lb__btn lb__btn--zoom" aria-label="Aumentar zoom" (click)="zoomIn()">
            +
          </button>
          <button type="button" class="lb__btn lb__btn--zoom" aria-label="Resetar zoom" (click)="resetView()">
            1×
          </button>
          <button type="button" class="lb__btn lb__btn--close" aria-label="Fechar" (click)="closed.emit()">
            ✕
          </button>
        </div>
      </div>

      <div
        #stage
        class="lb__stage"
        (wheel)="onWheel($event)"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (dblclick)="onDblClick($event)"
      >
        <img
          #img
          class="lb__img"
          [src]="src()"
          [alt]="alt()"
          [style.transform]="transform()"
          draggable="false"
          (load)="onImageLoad()"
        />
      </div>

      <p class="lb__hint lb__hint--desktop">Scroll ou +/− para zoom · arraste para mover · Esc para fechar</p>
      <p class="lb__hint lb__hint--mobile">Toque duplo para zoom · pinça para ampliar · arraste para fechar</p>
    </div>
  `,
  styles: `
    .lb {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: grid;
      grid-template-rows: auto 1fr auto;
      color: var(--lc-white);
      animation: lb-in 0.22s var(--lc-ease-drape, ease) both;
      overscroll-behavior: none;
      touch-action: none;
    }

    .lb__scrim {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--lc-void) 88%, transparent);
      backdrop-filter: blur(6px);
      opacity: calc(1 - var(--lb-dismiss, 0) * 0.55);
      transition: opacity 0.12s ease;
    }

    .lb__chrome,
    .lb__stage,
    .lb__hint {
      position: relative;
      z-index: 1;
    }

    .lb__chrome {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      pointer-events: none;
    }

    .lb__title {
      margin: 0;
      font-family: var(--lc-font-display);
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      opacity: 0.72;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lb__actions {
      display: flex;
      gap: 8px;
      pointer-events: auto;
      flex-shrink: 0;
    }

    .lb__btn {
      width: 40px;
      height: 40px;
      border: 1px solid color-mix(in srgb, var(--lc-white) 28%, transparent);
      background: color-mix(in srgb, var(--lc-void) 45%, transparent);
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .lb__btn:hover {
      background: color-mix(in srgb, var(--lc-void) 70%, transparent);
      border-color: color-mix(in srgb, var(--lc-white) 55%, transparent);
    }

    .lb__btn--close {
      font-size: 14px;
      letter-spacing: 0;
    }

    .lb__stage {
      display: grid;
      place-items: center;
      overflow: hidden;
      cursor: grab;
      touch-action: none;
      user-select: none;
      min-height: 0;
    }

    .lb__stage:active {
      cursor: grabbing;
    }

    .lb__img {
      max-width: min(92vw, 1100px);
      max-height: min(78vh, 920px);
      width: auto;
      height: auto;
      object-fit: contain;
      transform-origin: center center;
      will-change: transform;
      pointer-events: none;
      box-shadow: 0 24px 80px color-mix(in srgb, #000 45%, transparent);
    }

    .lb__hint {
      margin: 0;
      padding: 12px 20px 18px;
      text-align: center;
      font-family: var(--lc-font-body);
      font-size: 12px;
      letter-spacing: 0.04em;
      opacity: 0.55;
      pointer-events: none;
    }

    .lb__hint--mobile {
      display: none;
    }

    @keyframes lb-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (max-width: 767px) {
      .lb__chrome {
        padding:
          max(10px, env(safe-area-inset-top, 0px))
          max(12px, env(safe-area-inset-right, 0px))
          10px
          max(12px, env(safe-area-inset-left, 0px));
      }

      .lb__title {
        display: none;
      }

      .lb__btn--zoom {
        display: none;
      }

      .lb__btn--close {
        width: 48px;
        height: 48px;
        font-size: 16px;
      }

      .lb__img {
        max-width: 100vw;
        max-height: min(88dvh, calc(100dvh - 96px));
      }

      .lb__hint {
        padding:
          10px 16px
          max(16px, env(safe-area-inset-bottom, 0px));
        font-size: 11px;
        line-height: 1.45;
      }

      .lb__hint--desktop {
        display: none;
      }

      .lb__hint--mobile {
        display: block;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .lb {
        animation: none;
      }

      .lb__scrim {
        transition: none;
      }
    }
  `,
})
export class ImageLightbox {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly imgRef = viewChild<ElementRef<HTMLImageElement>>('img');

  readonly src = input.required<string>();
  readonly alt = input('');
  readonly closed = output<void>();

  private readonly scale = signal(1);
  private readonly tx = signal(0);
  private readonly ty = signal(0);
  readonly dismissProgress = signal(0);

  private dragging = false;
  private moved = false;
  private lastX = 0;
  private lastY = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; scale: number } | null = null;
  private pinchMid: { x: number; y: number } | null = null;
  private lastTap: { time: number; x: number; y: number } | null = null;
  private baseSize = { w: 0, h: 0 };

  readonly transform = computed(
    () => `translate3d(${this.tx()}px, ${this.ty()}px, 0) scale(${this.scale()})`,
  );

  constructor() {
    effect(() => {
      this.src();
      this.resetView();
    });

    const body = this.document.body;
    const html = this.document.documentElement;
    const scrollY = window.scrollY;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    this.destroyRef.onDestroy(() => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomOut();
    }
    if (event.key === '0') {
      event.preventDefault();
      this.resetView();
    }
  }

  onImageLoad(): void {
    const img = this.imgRef()?.nativeElement;
    if (!img) return;
    this.baseSize = { w: img.clientWidth, h: img.clientHeight };
    this.clampPan();
  }

  zoomIn(): void {
    this.setScale(this.scale() * 1.25, { clampPan: true });
  }

  zoomOut(): void {
    this.setScale(this.scale() / 1.25, { clampPan: true });
  }

  resetView(): void {
    this.scale.set(1);
    this.tx.set(0);
    this.ty.set(0);
    this.dismissProgress.set(0);
    this.pointers.clear();
    this.pinch = null;
    this.pinchMid = null;
    this.dragging = false;
    this.moved = false;
    this.lastTap = null;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.setScale(this.scale() * factor, { clampPan: true });
  }

  onDblClick(event: MouseEvent): void {
    event.preventDefault();
    this.toggleZoomAt(event.clientX, event.clientY);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    if (this.pointers.size === 1) {
      this.dragging = true;
      this.moved = false;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
      return;
    }

    this.dragging = false;
    this.pinch = { dist: this.pointerDistance(), scale: this.scale() };
    this.pinchMid = this.pointerMidpoint();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2 && this.pinch) {
      const dist = this.pointerDistance();
      const mid = this.pointerMidpoint();

      if (this.pinchMid) {
        this.tx.update((v) => v + (mid.x - this.pinchMid!.x));
        this.ty.update((v) => v + (mid.y - this.pinchMid!.y));
      }

      if (this.pinch.dist > 0 && dist > 0) {
        this.setScale(this.pinch.scale * (dist / this.pinch.dist));
      }

      this.pinchMid = mid;
      this.moved = true;
      this.clampPan();
      return;
    }

    if (!this.dragging) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      this.moved = true;
    }

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    if (this.scale() <= 1.01) {
      const pullY = event.clientY - this.pointerStartY;
      if (pullY > 0) {
        this.ty.set(pullY * 0.72);
        this.dismissProgress.set(Math.min(1, pullY / 160));
        return;
      }
      this.dismissProgress.set(0);
      this.ty.set(0);
      return;
    }

    this.tx.update((v) => v + dx);
    this.ty.update((v) => v + dy);
    this.clampPan();
  }

  onPointerUp(event: PointerEvent): void {
    const wasSinglePointer = this.pointers.size === 1;
    const endX = event.clientX;
    const endY = event.clientY;
    this.pointers.delete(event.pointerId);

    if (this.pointers.size >= 2) {
      this.pinch = { dist: this.pointerDistance(), scale: this.scale() };
      this.pinchMid = this.pointerMidpoint();
      return;
    }

    this.pinch = null;
    this.pinchMid = null;

    const remaining = this.pointers.values().next().value as { x: number; y: number } | undefined;
    if (remaining) {
      this.dragging = true;
      this.lastX = remaining.x;
      this.lastY = remaining.y;
      return;
    }

    this.dragging = false;

    if (this.scale() <= 1.01 && this.ty() > 72) {
      this.closed.emit();
      return;
    }

    if (this.scale() <= 1.01) {
      this.ty.set(0);
      this.dismissProgress.set(0);
    } else {
      this.clampPan();
    }

    if (wasSinglePointer && !this.moved) {
      this.tryDoubleTap(endX, endY);
    }
  }

  private tryDoubleTap(x: number, y: number): void {
    const now = Date.now();
    const last = this.lastTap;

    if (last && now - last.time < 320 && Math.hypot(x - last.x, y - last.y) < 40) {
      this.lastTap = null;
      this.toggleZoomAt(x, y);
      return;
    }

    this.lastTap = { time: now, x, y };
  }

  private toggleZoomAt(clientX: number, clientY: number): void {
    if (this.scale() > 1.05) {
      this.resetView();
      return;
    }
    this.zoomAt(clientX, clientY, 2.4);
  }

  private zoomAt(clientX: number, clientY: number, targetScale: number): void {
    const stage = this.stageRef()?.nativeElement.getBoundingClientRect();
    if (!stage) {
      this.setScale(targetScale, { clampPan: true });
      return;
    }

    const cx = clientX - stage.left - stage.width / 2;
    const cy = clientY - stage.top - stage.height / 2;
    const ratio = targetScale / this.scale();

    this.tx.update((v) => v - cx * (ratio - 1));
    this.ty.update((v) => v - cy * (ratio - 1));
    this.setScale(targetScale, { clampPan: true });
  }

  private pointerDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  }

  private pointerMidpoint(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) {
      return { x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0 };
    }
    return {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
  }

  private clampPan(): void {
    const stage = this.stageRef()?.nativeElement;
    const img = this.imgRef()?.nativeElement;
    if (!stage || !img || this.baseSize.w === 0) return;

    const scale = this.scale();
    if (scale <= 1) {
      this.tx.set(0);
      if (this.dismissProgress() === 0) {
        this.ty.set(0);
      }
      return;
    }

    const maxX = Math.max(0, (this.baseSize.w * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (this.baseSize.h * scale - stage.clientHeight) / 2);

    this.tx.update((v) => Math.min(maxX, Math.max(-maxX, v)));
    this.ty.update((v) => Math.min(maxY, Math.max(-maxY, v)));
  }

  private setScale(next: number, opts: { clampPan?: boolean } = {}): void {
    const clamped = Math.min(5, Math.max(1, next));
    this.scale.set(clamped);
    if (clamped === 1) {
      this.tx.set(0);
      if (this.dismissProgress() === 0) {
        this.ty.set(0);
      }
      return;
    }
    if (opts.clampPan) {
      this.clampPan();
    }
  }
}
