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
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import {
  patchContentGalleryImage,
  removeContentGalleryImage,
  ContentGalleryPatch,
} from '../../core/content-gallery.util';
import { LcTrashButton } from '../../shared/components/feedback/trash-button';

/** ContentDocument kind seeded in `seed-content-enrichment.ts`. */
const CONTENT_KIND = 'arte-series';

@Component({
  selector: 'lc-arte-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel, LcEditableText, LcEditableImage, LcTrashButton],
  templateUrl: './arte.html',
  styleUrl: './arte.scss',
})
export class ArtePage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly admin = inject(AdminSessionService);

  readonly seriesList = this.content.arteSeries;
  readonly introVideo = ART_INTRO_VIDEO;
  readonly introPoster = ART_INTRO_POSTER;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly saving = signal(false);
  readonly imageUploadingId = signal<string | null>(null);
  /** Active still index per piece id (multi-image works). */
  private readonly stillById = signal<Record<string, number>>({});
  private pickTarget: { seriesId: string; pieceIndex: number; imageIndex: number } | null = null;

  @ViewChild('intro') private introRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
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

  isImageUploading(piece: ArtPiece): boolean {
    return this.imageUploadingId() === piece.id;
  }

  startAppendPieceImage(series: ArtSeries, pieceIndex: number): void {
    const piece = series.pieces[pieceIndex];
    if (!piece) return;
    this.pickTarget = {
      seriesId: series.id,
      pieceIndex,
      imageIndex: this.stills(piece).length,
    };
    this.fileInput?.nativeElement.click();
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const target = this.pickTarget;
    this.pickTarget = null;
    if (!file || !target) return;

    const series = this.seriesList().find((s) => s.id === target.seriesId);
    if (!series) return;
    this.onPickPieceImage(series, target.pieceIndex, target.imageIndex, file);
  }

  async removePieceImage(series: ArtSeries, pieceIndex: number, index: number): Promise<void> {
    const piece = series.pieces[pieceIndex];
    if (!piece) return;

    const ok = await this.confirm.confirm({
      title: 'Remover foto',
      message: 'Remover esta foto? Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    const slug = this.seriesSlug(series);
    const base = `pieces.${pieceIndex}`;
    const state = {
      gallery: this.stills(piece),
      hasImagesArray: Boolean(piece.images?.length),
    };
    const patch = removeContentGalleryImage(state, index, {
      imagesPath: `${base}.images`,
      imagePath: `${base}.image`,
    });
    if (!patch) return;

    this.imageUploadingId.set(piece.id);
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, patch.path, patch.value).subscribe({
      next: () => {
        this.applyGalleryPatch(slug, patch);
        this.clampStillIndex(piece.id, Math.max(0, state.gallery.length - 2));
        this.imageUploadingId.set(null);
        this.toast.success('Foto removida.');
      },
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível remover a foto.'));
      },
    });
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
        this.toast.success('Alteração salva.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar.'));
      },
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
            this.toast.success('Imagem atualizada.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar a imagem.'));
          },
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Falha no envio da foto.'));
      },
    });
  }

  onPickPieceImage(series: ArtSeries, pieceIndex: number, imageIndex: number, file: File): void {
    const piece = series.pieces[pieceIndex];
    if (!piece) return;

    this.imageUploadingId.set(piece.id);
    this.contentAdmin.uploadImage$(file, piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistPieceImage(series, pieceIndex, imageIndex, cdnUrl),
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Falha no envio da foto.'));
      },
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
    if (!piece) return;

    const base = `pieces.${pieceIndex}`;
    const state = {
      gallery: this.stills(piece),
      hasImagesArray: Boolean(piece.images?.length),
    };
    const patch = patchContentGalleryImage(state, imageIndex, cdnUrl, {
      imagesPath: `${base}.images`,
      imagePath: `${base}.image`,
    });

    this.contentAdmin.patchContentField(CONTENT_KIND, slug, patch.path, patch.value).subscribe({
      next: () => {
        this.applyGalleryPatch(slug, patch);
        if (imageIndex >= state.gallery.length) {
          this.setStill(piece.id, imageIndex);
        }
        this.imageUploadingId.set(null);
        this.toast.success('Foto atualizada.');
      },
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar a foto.'));
      },
    });
  }

  private applyGalleryPatch(slug: string, patch: ContentGalleryPatch): void {
    this.applyLocalPatch(slug, patch.path, patch.value);
    for (const extra of patch.localSync ?? []) {
      this.applyLocalPatch(slug, extra.path, extra.value);
    }
  }

  private clampStillIndex(pieceId: string, maxIndex: number): void {
    const current = this.stillById()[pieceId] ?? 0;
    if (current > maxIndex) {
      this.setStill(pieceId, maxIndex);
    }
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
