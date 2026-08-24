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
import { AdminSessionService } from '../../core/admin-session.service';
import {
  ART_INTRO_POSTER,
  ART_INTRO_VIDEO,
  ArtPiece,
  ArtSeries,
} from '../../core/arte.data';
import { ContentAdminService } from '../../core/content-admin.service';
import { ContentService } from '../../core/content.service';
import { ChromeService } from '../../core/chrome.service';
import { artePath } from '../../core/routes';
import { ArtMediaCarousel } from '../../shared/components/art-media-carousel/art-media-carousel';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';
import { LcEditableImage } from '../../shared/components/edit/editable-image';
import { LcEditableText } from '../../shared/components/edit/editable-text';

/** ContentDocument kind seeded in `seed-content-enrichment.ts`. */
const CONTENT_KIND = 'arte-series';

@Component({
  selector: 'lc-arte-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel, LcEditableText, LcEditableImage],
  templateUrl: './arte.html',
  styleUrl: './arte.scss',
})
export class ArtePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  readonly admin = inject(AdminSessionService);

  readonly seriesList = this.content.arteSeries;
  readonly introVideo = ART_INTRO_VIDEO;
  readonly introPoster = ART_INTRO_POSTER;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly saving = signal(false);
  /** Active still index per piece id (multi-image works). */
  private readonly stillById = signal<Record<string, number>>({});

  @ViewChild('intro') private introRef?: ElementRef<HTMLVideoElement>;
  private playAttempted = false;

  ngOnInit(): void {
    this.chrome.setActive('arte');
    this.content.loadArte().subscribe();
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

  seriesSlug(series: ArtSeries): string {
    return series.id;
  }

  detailPath(piece: ArtPiece): string {
    return artePath(piece.slug);
  }

  stills(piece: ArtPiece): string[] {
    if (piece.images?.length) return piece.images;
    return piece.image ? [piece.image] : [];
  }

  stillIndex(piece: ArtPiece): number {
    return this.stillById()[piece.id] ?? 0;
  }

  activeStill(piece: ArtPiece): string | undefined {
    const g = this.stills(piece);
    if (!g.length) return piece.image;
    return g[this.stillIndex(piece)] ?? g[0];
  }

  setStill(id: string, index: number): void {
    this.stillById.update((m) => ({ ...m, [id]: index }));
  }

  openImage(src: string, alt: string): void {
    if (this.admin.editMode()) return;
    this.lightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  patchSeries(series: ArtSeries, path: string, value: unknown): void {
    const slug = this.seriesSlug(series);
    this.saving.set(true);
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, path, value).subscribe({
      next: () => {
        this.applyLocalPatch(slug, path, value);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  patchPiece(series: ArtSeries, pieceIndex: number, field: string, value: string): void {
    this.patchSeries(series, `pieces.${pieceIndex}.${field}`, value);
  }

  onPickPresentationImage(series: ArtSeries, stageIndex: number, file: File): void {
    this.saving.set(true);
    this.contentAdmin.uploadImage$(file).subscribe({
      next: ({ cdnUrl }) => {
        const path = `presentations.${stageIndex}.image`;
        this.contentAdmin.patchContentField(CONTENT_KIND, this.seriesSlug(series), path, cdnUrl).subscribe({
          next: () => {
            this.applyLocalPatch(this.seriesSlug(series), path, cdnUrl);
            this.saving.set(false);
          },
          error: () => this.saving.set(false),
        });
      },
      error: () => this.saving.set(false),
    });
  }

  onPickPieceImage(series: ArtSeries, pieceIndex: number, imageIndex: number, file: File): void {
    const piece = series.pieces[pieceIndex];
    if (!piece) return;

    this.saving.set(true);
    this.contentAdmin.uploadImage$(file, piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistPieceImage(series, pieceIndex, imageIndex, cdnUrl),
      error: () => this.saving.set(false),
    });
  }

  private persistPieceImage(
    series: ArtSeries,
    pieceIndex: number,
    imageIndex: number,
    cdnUrl: string,
  ): void {
    const slug = this.seriesSlug(series);
    const piece = series.pieces[pieceIndex];
    const hasImages = Boolean(piece?.images?.length);

    if (hasImages) {
      const imgPath = `pieces.${pieceIndex}.images.${imageIndex}`;
      this.contentAdmin.patchContentField(CONTENT_KIND, slug, imgPath, cdnUrl).subscribe({
        next: () => {
          this.applyLocalPatch(slug, imgPath, cdnUrl);
          if (imageIndex === 0) {
            const coverPath = `pieces.${pieceIndex}.image`;
            this.contentAdmin.patchContentField(CONTENT_KIND, slug, coverPath, cdnUrl).subscribe({
              next: () => {
                this.applyLocalPatch(slug, coverPath, cdnUrl);
                this.saving.set(false);
              },
              error: () => this.saving.set(false),
            });
          } else {
            this.saving.set(false);
          }
        },
        error: () => this.saving.set(false),
      });
      return;
    }

    const coverPath = `pieces.${pieceIndex}.image`;
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, coverPath, cdnUrl).subscribe({
      next: () => {
        this.applyLocalPatch(slug, coverPath, cdnUrl);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  private applyLocalPatch(seriesSlug: string, path: string, value: unknown): void {
    this.content.arteSeries.update((list) =>
      list.map((s) => {
        if (s.id !== seriesSlug) return s;
        const next = structuredClone(s) as unknown as Record<string, unknown>;
        setByPath(next, path, value);
        return next as unknown as ArtSeries;
      }),
    );
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

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const seg = cur[key];
    if (seg == null || typeof seg !== 'object') {
      const nextKey = parts[i + 1]!;
      cur[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
