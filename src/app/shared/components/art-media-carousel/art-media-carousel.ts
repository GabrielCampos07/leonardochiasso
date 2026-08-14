import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'lc-art-media-carousel',
  standalone: true,
  host: {
    class: 'amc-host',
  },
  template: `
    <div
      class="amc"
      [class.amc--carousel]="hasCarousel()"
      [class.amc--dragging]="dragging()"
      role="region"
      [attr.aria-label]="alt() || 'Mídia da obra'"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
    >
      <div class="amc__viewport">
        <div
          class="amc__track"
          [class.amc__track--dragging]="dragging()"
          [style.transform]="trackTransform()"
        >
          @if (image()) {
            <div class="amc__slide" data-slide="still">
              <button
                type="button"
                class="amc__still"
                (click)="onStillClick($event)"
                [attr.aria-label]="'Ampliar ' + (alt() || 'imagem')"
              >
                <img [src]="image()" [alt]="alt()" draggable="false" />
              </button>
            </div>
          }
          @if (videoSrc()) {
            <div class="amc__slide amc__slide--video" data-slide="video">
              <video
                #videoEl
                [src]="videoSrc()"
                controls
                playsinline
                preload="metadata"
              >
                Seu navegador não reproduz este vídeo.
              </video>
            </div>
          }
        </div>

        @if (hasCarousel()) {
          <button
            type="button"
            class="amc__nav amc__nav--prev"
            aria-label="Foto anterior"
            [disabled]="slide() === 0"
            (click)="goTo(0); $event.stopPropagation()"
          >
            ‹
          </button>
          <button
            type="button"
            class="amc__nav amc__nav--next"
            aria-label="Ver vídeo"
            [disabled]="slide() === 1"
            (click)="goTo(1); $event.stopPropagation()"
          >
            ›
          </button>
        }
      </div>

      @if (hasCarousel()) {
        <div class="amc__dots" role="tablist" aria-label="Foto ou vídeo">
          <button
            type="button"
            class="amc__dot"
            role="tab"
            [class.amc__dot--active]="slide() === 0"
            [attr.aria-selected]="slide() === 0"
            aria-label="Foto"
            (click)="goTo(0)"
          ></button>
          <button
            type="button"
            class="amc__dot"
            role="tab"
            [class.amc__dot--active]="slide() === 1"
            [attr.aria-selected]="slide() === 1"
            aria-label="Vídeo"
            (click)="goTo(1)"
          ></button>
        </div>
        <p class="amc__hint">{{ slide() === 0 ? 'Arraste para o vídeo' : 'Arraste para a foto' }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: min(100%, 440px);
    }

    @media (min-width: 900px) {
      :host {
        max-width: min(100%, 580px);
      }
    }

    @media (min-width: 1200px) {
      :host {
        max-width: min(100%, 640px);
      }
    }

    .amc {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      user-select: none;
      touch-action: none;
    }

    .amc__viewport {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: color-mix(in srgb, var(--lc-ash) 12%, var(--lc-white));
    }

    .amc--carousel .amc__viewport {
      cursor: grab;
    }

    .amc--carousel.amc--dragging .amc__viewport {
      cursor: grabbing;
    }

    .amc__track {
      display: flex;
      width: 100%;
      height: 100%;
      transition: transform 0.35s var(--lc-ease-drape, ease);
      will-change: transform;
    }

    .amc--carousel .amc__track {
      width: 200%;
    }

    .amc__track--dragging {
      transition: none;
    }

    .amc__slide {
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .amc--carousel .amc__slide {
      flex: 0 0 50%;
      width: 50%;
    }

    .amc__slide--video {
      background: #0e0c0e;
    }

    .amc__still {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      cursor: zoom-in;
      color: inherit;
    }

    .amc__still img,
    .amc__slide video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      pointer-events: none;
      -webkit-user-drag: none;
    }

    /* Video area is swipeable; controls stay clickable in the bottom band */
    .amc__slide video {
      pointer-events: auto;
      background: #0e0c0e;
    }

    .amc__nav {
      position: absolute;
      top: 50%;
      z-index: 2;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 18%, transparent);
      background: color-mix(in srgb, var(--lc-white) 88%, transparent);
      color: var(--lc-void);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }

    .amc__nav:disabled {
      opacity: 0.28;
      cursor: default;
    }

    .amc__nav--prev {
      left: 8px;
    }

    .amc__nav--next {
      right: 8px;
    }

    .amc__dots {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
    }

    .amc__dot {
      width: 7px;
      height: 7px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: color-mix(in srgb, var(--lc-void) 22%, transparent);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .amc__dot--active {
      background: var(--lc-void);
      transform: scale(1.15);
    }

    .amc__hint {
      margin: 0;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--lc-void) 42%, transparent);
    }
  `,
})
export class ArtMediaCarousel {
  readonly image = input<string | undefined>();
  readonly alt = input('');
  readonly videoSrc = input<string | undefined>();
  readonly openStill = output<void>();

  @ViewChild('videoEl') private videoEl?: ElementRef<HTMLVideoElement>;

  readonly slide = signal(0);
  readonly dragging = signal(false);
  private readonly dragX = signal(0);

  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private moved = false;
  private ignoreDrag = false;

  readonly hasCarousel = computed(() => !!this.image() && !!this.videoSrc());

  readonly trackTransform = computed(() => {
    if (!this.hasCarousel()) return 'translate3d(0, 0, 0)';
    const base = -this.slide() * 50;
    if (this.dragging()) {
      return `translate3d(calc(${base}% + ${this.dragX()}px), 0, 0)`;
    }
    return `translate3d(${base}%, 0, 0)`;
  });

  goTo(index: number): void {
    const max = this.hasCarousel() ? 1 : 0;
    const next = Math.max(0, Math.min(max, index));
    if (next !== 1) this.pauseVideo();
    this.slide.set(next);
  }

  onStillClick(event: Event): void {
    if (this.moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.openStill.emit();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.hasCarousel() || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.amc__nav, .amc__dot')) return;

    // Leave native video controls alone (bottom control strip).
    if (this.isVideoControlsHit(event)) {
      this.ignoreDrag = true;
      return;
    }

    this.ignoreDrag = false;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.moved = false;
    this.dragging.set(true);
    this.dragX.set(0);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.ignoreDrag || !this.dragging() || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (!this.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.moved = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    this.dragX.set(dx);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.ignoreDrag) {
      this.ignoreDrag = false;
      return;
    }
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.dragging.set(false);

    const dx = this.dragX();
    this.dragX.set(0);
    if (!this.hasCarousel()) return;

    if (dx <= -40) this.goTo(1);
    else if (dx >= 40) this.goTo(0);
  }

  private isVideoControlsHit(event: PointerEvent): boolean {
    const video = this.videoEl?.nativeElement;
    if (!video || this.slide() !== 1) return false;
    if (!(event.target instanceof Node) || !video.contains(event.target)) return false;

    const rect = video.getBoundingClientRect();
    const fromBottom = rect.bottom - event.clientY;
    // Native controls sit near the bottom; keep that band interactive only.
    return fromBottom <= 56;
  }

  private pauseVideo(): void {
    const el = this.videoEl?.nativeElement;
    if (el && !el.paused) el.pause();
  }
}
