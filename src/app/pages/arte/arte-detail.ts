import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

const CONTENT_KIND = 'arte-series';

interface ArteDetailCtx {
  series: ArtSeries;
  piece: ArtPiece;
  pieceIndex: number;
}

@Component({
  selector: 'lc-arte-detail-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel, LcEditableText, LcEditableImage],
  templateUrl: './arte-detail.html',
  styleUrl: './arte-detail.scss',
})
export class ArteDetailPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  readonly admin = inject(AdminSessionService);

  readonly home = ROUTES.home;
  readonly gallery = ROUTES.arte;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly saving = signal(false);
  private readonly stillById = signal<Record<string, number>>({});
  private readonly slug = signal('');

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
      },
      error: () => this.saving.set(false),
    });
  }

  onPickImage(file: File): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const imageIndex = this.stillIndex(ctx.piece);
    this.saving.set(true);
    this.contentAdmin.uploadImage$(file, ctx.piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistImage(ctx, imageIndex, cdnUrl),
      error: () => this.saving.set(false),
    });
  }

  private persistImage(ctx: ArteDetailCtx, imageIndex: number, cdnUrl: string): void {
    const seriesSlug = ctx.series.id;
    const { pieceIndex, piece } = ctx;
    const hasImages = Boolean(piece.images?.length);

    if (hasImages) {
      const imgPath = `pieces.${pieceIndex}.images.${imageIndex}`;
      this.contentAdmin.patchContentField(CONTENT_KIND, seriesSlug, imgPath, cdnUrl).subscribe({
        next: () => {
          this.applyLocalPatch(seriesSlug, imgPath, cdnUrl);
          if (imageIndex === 0) {
            const coverPath = `pieces.${pieceIndex}.image`;
            this.contentAdmin.patchContentField(CONTENT_KIND, seriesSlug, coverPath, cdnUrl).subscribe({
              next: () => {
                this.applyLocalPatch(seriesSlug, coverPath, cdnUrl);
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
    this.contentAdmin.patchContentField(CONTENT_KIND, seriesSlug, coverPath, cdnUrl).subscribe({
      next: () => {
        this.applyLocalPatch(seriesSlug, coverPath, cdnUrl);
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
