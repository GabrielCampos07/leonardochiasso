import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
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
    >
      <div class="lb__scrim" (click)="closed.emit()"></div>

      <div class="lb__chrome">
        <p class="lb__title">{{ alt() }}</p>
        <div class="lb__actions">
          <button type="button" class="lb__btn" aria-label="Diminuir zoom" (click)="zoomOut()">
            −
          </button>
          <button type="button" class="lb__btn" aria-label="Aumentar zoom" (click)="zoomIn()">
            +
          </button>
          <button type="button" class="lb__btn" aria-label="Resetar zoom" (click)="resetView()">
            1×
          </button>
          <button type="button" class="lb__btn lb__btn--close" aria-label="Fechar" (click)="closed.emit()">
            ✕
          </button>
        </div>
      </div>

      <div
        class="lb__stage"
        (wheel)="onWheel($event)"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (dblclick)="onDblClick($event)"
      >
        <img
          class="lb__img"
          [src]="src()"
          [alt]="alt()"
          [style.transform]="transform()"
          draggable="false"
        />
      </div>

      <p class="lb__hint">Scroll ou +/− para zoom · arraste para mover · Esc para fechar</p>
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
    }

    .lb__scrim {
      position: absolute;
      inset: 0;
      background: color-mix(in srgb, var(--lc-void) 88%, transparent);
      backdrop-filter: blur(6px);
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

    @keyframes lb-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .lb {
        animation: none;
      }
    }
  `,
})
export class ImageLightbox {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly src = input.required<string>();
  readonly alt = input('');
  readonly closed = output<void>();

  private readonly scale = signal(1);
  private readonly tx = signal(0);
  private readonly ty = signal(0);

  private dragging = false;
  private pointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  readonly transform = computed(
    () => `translate3d(${this.tx()}px, ${this.ty()}px, 0) scale(${this.scale()})`,
  );

  constructor() {
    effect(() => {
      // Reset view whenever a new image opens.
      this.src();
      this.resetView();
    });

    const prev = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.destroyRef.onDestroy(() => {
      this.document.body.style.overflow = prev;
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

  zoomIn(): void {
    this.setScale(this.scale() * 1.25);
  }

  zoomOut(): void {
    this.setScale(this.scale() / 1.25);
  }

  resetView(): void {
    this.scale.set(1);
    this.tx.set(0);
    this.ty.set(0);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.setScale(this.scale() * factor);
  }

  onDblClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.scale() > 1.05) {
      this.resetView();
    } else {
      this.setScale(2.2);
    }
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.tx.update((v) => v + dx);
    this.ty.update((v) => v + dy);
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
  }

  private setScale(next: number): void {
    const clamped = Math.min(5, Math.max(1, next));
    this.scale.set(clamped);
    if (clamped === 1) {
      this.tx.set(0);
      this.ty.set(0);
    }
  }
}
