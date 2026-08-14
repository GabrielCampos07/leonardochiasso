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
import { RouterLink } from '@angular/router';
import {
  ART_INTRO_POSTER,
  ART_INTRO_VIDEO,
  ART_SERIES,
  ArtPiece,
} from '../../core/arte.data';
import { ChromeService } from '../../core/chrome.service';
import { artePath } from '../../core/routes';
import { ArtMediaCarousel } from '../../shared/components/art-media-carousel/art-media-carousel';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';

@Component({
  selector: 'lc-arte-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel],
  templateUrl: './arte.html',
  styleUrl: './arte.scss',
})
export class ArtePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);

  readonly seriesList = ART_SERIES;
  readonly introVideo = ART_INTRO_VIDEO;
  readonly introPoster = ART_INTRO_POSTER;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);

  @ViewChild('intro') private introRef?: ElementRef<HTMLVideoElement>;
  private playAttempted = false;

  ngOnInit(): void {
    this.chrome.setActive('arte');
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

  onIntroCanPlay(): void {
    this.tryAutoplay();
  }

  detailPath(piece: ArtPiece): string {
    return artePath(piece.slug);
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
