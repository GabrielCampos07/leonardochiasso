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
import { AdminSessionService } from '../../core/admin-session.service';
import { ContentAdminService } from '../../core/content-admin.service';
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
import { LcEditableImage } from '../../shared/components/edit/editable-image';
import { LcEditableText } from '../../shared/components/edit/editable-text';

const CONTENT_KIND = 'joia';

@Component({
  selector: 'lc-joias-page',
  standalone: true,
  imports: [ArtMediaCarousel, ImageLightbox, LcEditableText, LcEditableImage],
  templateUrl: './joias.html',
  styleUrl: './joias.scss',
})
export class JoiasPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  readonly admin = inject(AdminSessionService);

  readonly brand = BRAND_LINES.gioielli;
  readonly introVideo = JOIAS_INTRO_VIDEO;
  readonly introPoster = JOIAS_INTRO_POSTER;
  readonly pieces = this.content.joias;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly saving = signal(false);
  /** Piece id while upload + PATCH is in flight. */
  readonly imageUploadingId = signal<string | null>(null);
  /** Per-piece still index for multi-image groups. */
  private readonly stillById = signal<Record<string, number>>({});
  private pickTarget: { slug: string; index: number } | null = null;

  @ViewChild('intro') private introRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

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
    if (this.admin.editMode()) return;
    const src = this.activeStill(piece);
    if (src) this.openImage(src, piece.title);
  }

  openImage(src: string, alt: string): void {
    this.lightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  patchField(piece: JoiaPiece, path: string, value: string): void {
    const slug = piece.slug || piece.id;
    this.saving.set(true);
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, path, value).subscribe({
      next: () => {
        this.applyLocalPatch(slug, path, value);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  isImageUploading(piece: JoiaPiece): boolean {
    return this.imageUploadingId() === piece.id;
  }

  /** From `lc-editable-image` — File is already chosen. */
  onPickImage(piece: JoiaPiece, index: number, file: File): void {
    this.imageUploadingId.set(piece.id);
    this.contentAdmin.uploadImage$(file, piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistImageSwap(piece, index, cdnUrl),
      error: () => this.imageUploadingId.set(null),
    });
  }

  /** «Adicionar foto» — no hero yet; open hidden file input. */
  startPickImage(piece: JoiaPiece, index: number): void {
    this.pickTarget = { slug: piece.slug || piece.id, index };
    this.fileInput?.nativeElement.click();
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const target = this.pickTarget;
    this.pickTarget = null;
    if (!file || !target) return;

    const piece = this.pieces().find((p) => (p.slug || p.id) === target.slug);
    if (!piece) return;
    this.onPickImage(piece, target.index, file);
  }

  private persistImageSwap(piece: JoiaPiece, index: number, cdnUrl: string): void {
    const slug = piece.slug || piece.id;
    const hasImages = Boolean(piece.images?.length);
    const path = hasImages ? `images.${index}` : 'image';

    this.contentAdmin.patchContentField(CONTENT_KIND, slug, path, cdnUrl).subscribe({
      next: () => {
        this.applyLocalPatch(slug, path, cdnUrl);
        if (hasImages && index === 0) {
          this.applyLocalPatch(slug, 'image', cdnUrl);
        }
        this.imageUploadingId.set(null);
      },
      error: () => this.imageUploadingId.set(null),
    });
  }

  private applyLocalPatch(slug: string, path: string, value: string): void {
    this.content.joias.update((list) =>
      list.map((p) => {
        if ((p.slug || p.id) !== slug) return p;
        const next = structuredClone(p) as unknown as Record<string, unknown>;
        setByPath(next, path, value);
        return next as unknown as JoiaPiece;
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
