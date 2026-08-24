import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminSessionService } from '../../core/admin-session.service';
import { ArtPiece, ArtSeries } from '../../core/arte.data';
import { ContentAdminService } from '../../core/content-admin.service';
import { ContentService } from '../../core/content.service';
import { ChromeService } from '../../core/chrome.service';
import { ROUTES, artePath } from '../../core/routes';
import { ArtMediaCarousel } from '../../shared/components/art-media-carousel/art-media-carousel';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';
import { LcEditableImage } from '../../shared/components/edit/editable-image';
import { LcEditableText } from '../../shared/components/edit/editable-text';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import {
  ContentGalleryPatch,
  patchContentGalleryImage,
  removeContentGalleryImage,
} from '../../core/content-gallery.util';
import { LcTrashButton } from '../../shared/components/feedback/trash-button';

const CONTENT_KIND = 'arte-series';

interface ArteDetailCtx {
  series: ArtSeries;
  piece: ArtPiece;
  pieceIndex: number;
}

@Component({
  selector: 'lc-arte-detail-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel, LcEditableText, LcEditableImage, LcTrashButton],
  templateUrl: './arte-detail.html',
  styleUrl: './arte-detail.scss',
})
export class ArteDetailPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly admin = inject(AdminSessionService);

  readonly home = ROUTES.home;
  readonly gallery = ROUTES.arte;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly saving = signal(false);
  readonly imageUploadingId = signal<string | null>(null);
  private readonly stillById = signal<Record<string, number>>({});
  private readonly slug = signal('');
  private pickAppend = false;

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  readonly ctx = computed((): ArteDetailCtx | null => {
    const slug = this.slug();
    if (!slug) return null;
    for (const series of this.content.arteSeries()) {
      const pieceIndex = series.pieces.findIndex((p) => p.slug === slug || p.id === slug);
      if (pieceIndex < 0) continue;
      const piece = series.pieces[pieceIndex]!;
      return { series, piece, pieceIndex };
    }
    return null;
  });

  readonly found = computed(() => this.ctx() !== null);

  ngOnInit(): void {
    this.chrome.setActive('arte');
    this.slug.set(this.route.snapshot.paramMap.get('slug') ?? '');
    this.content.loadArte().subscribe();
  }

  backPath(): string {
    return artePath();
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

  startAppendImage(): void {
    this.pickAppend = true;
    this.fileInput?.nativeElement.click();
  }

  async removeImage(index: number): Promise<void> {
    const ctx = this.ctx();
    if (!ctx) return;

    const ok = await this.confirm.confirm({
      title: 'Remover foto',
      message: 'Remover esta foto? Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    const { series, piece, pieceIndex } = ctx;
    const slug = series.id;
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

  patchField(field: string, value: string): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const path = `pieces.${ctx.pieceIndex}.${field}`;
    const seriesSlug = ctx.series.id;
    this.saving.set(true);
    this.contentAdmin.patchContentField(CONTENT_KIND, seriesSlug, path, value).subscribe({
      next: () => {
        this.applyLocalPatch(seriesSlug, path, value);
        this.saving.set(false);
        this.toast.success('Alteração salva.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar.'));
      },
    });
  }

  onPickImage(file: File): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const imageIndex = this.pickAppend
      ? this.stills(ctx.piece).length
      : this.stillIndex(ctx.piece);
    this.pickAppend = false;
    this.imageUploadingId.set(ctx.piece.id);
    this.contentAdmin.uploadImage$(file, ctx.piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistImage(ctx, imageIndex, cdnUrl),
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Falha no envio da foto.'));
      },
    });
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      this.pickAppend = false;
      return;
    }
    this.onPickImage(file);
  }

  private persistImage(ctx: ArteDetailCtx, imageIndex: number, cdnUrl: string): void {
    const seriesSlug = ctx.series.id;
    const base = `pieces.${ctx.pieceIndex}`;
    const state = {
      gallery: this.stills(ctx.piece),
      hasImagesArray: Boolean(ctx.piece.images?.length),
    };
    const patch = patchContentGalleryImage(state, imageIndex, cdnUrl, {
      imagesPath: `${base}.images`,
      imagePath: `${base}.image`,
    });

    this.contentAdmin.patchContentField(CONTENT_KIND, seriesSlug, patch.path, patch.value).subscribe({
      next: () => {
        this.applyGalleryPatch(seriesSlug, patch);
        if (imageIndex >= state.gallery.length) {
          this.setStill(ctx.piece.id, imageIndex);
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
