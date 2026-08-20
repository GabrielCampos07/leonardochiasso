import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ContentService } from '../../core/content.service';
import { BRAND_LINES } from '../../core/brand-lines';
import { ChromeService } from '../../core/chrome.service';
import {
  JOIAS_INTRO_POSTER,
  JOIAS_INTRO_VIDEO,
  JoiaPiece,
  joiaGallery,
} from '../../core/joias.data';
import { ArtMediaCarousel } from '../../shared/components/art-media-carousel/art-media-carousel';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';

@Component({
  selector: 'lc-joias-page',
  standalone: true,
  imports: [ArtMediaCarousel, ImageLightbox],
  templateUrl: './joias.html',
  styleUrl: './joias.scss',
})
export class JoiasPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);

  readonly brand = BRAND_LINES.gioielli;
  readonly introVideo = JOIAS_INTRO_VIDEO;
  readonly introPoster = JOIAS_INTRO_POSTER;
  readonly pieces = this.content.joias;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  /** Per-piece still index for multi-image groups. */
  private readonly stillById = signal<Record<string, number>>({});

  @ViewChild('intro') private introRef?: ElementRef<HTMLVideoElement>;

  private playAttempted = false;

  ngOnInit(): void {
    this.chrome.setActive('joias');
    this.content.loadJoias().subscribe();
  }

  ngAfterViewInit(): void {
    this.tryAutoplay();
  }

  ngOnDestroy(): void {
    const video = this.introRef?.nativeElement;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }

  onCanPlay(): void {
    this.tryAutoplay();
  }

  gallery(piece: JoiaPiece): string[] {
    return joiaGallery(piece);
  }

  stillIndex(piece: JoiaPiece): number {
    return this.stillById()[piece.id] ?? 0;
  }

  activeStill(piece: JoiaPiece): string | undefined {
    const g = this.gallery(piece);
    if (!g.length) return piece.image;
    return g[this.stillIndex(piece)] ?? g[0];
  }

  setStill(id: string, index: number): void {
    this.stillById.update((m) => ({ ...m, [id]: index }));
  }

  onOpenStill(piece: JoiaPiece): void {
    const src = this.activeStill(piece);
    if (src) this.openImage(src, piece.title);
  }

  openImage(src: string, alt: string): void {
    this.lightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  private tryAutoplay(): void {
    const video = this.introRef?.nativeElement;
    if (!video || this.playAttempted) return;
    this.playAttempted = true;
    video.muted = true;
    const play = video.play();
    if (play !== undefined) {
      void play.catch(() => {
        this.playAttempted = false;
      });
    }
  }
}
