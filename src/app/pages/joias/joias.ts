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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
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
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import {
  patchContentGalleryImage,
  removeContentGalleryImage,
} from '../../core/content-gallery.util';
import { LcTrashButton } from '../../shared/components/feedback/trash-button';

const CONTENT_KIND = 'joia';

@Component({
  selector: 'lc-joias-page',
  standalone: true,
  imports: [
    ArtMediaCarousel,
    ImageLightbox,
    LcEditableText,
    LcEditableImage,
    LcTrashButton,
    DragDropModule,
  ],
  templateUrl: './joias.html',
  styleUrl: './joias.scss',
})
export class JoiasPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);
  private readonly contentAdmin = inject(ContentAdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
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

  startAppendImage(piece: JoiaPiece): void {
    this.startPickImage(piece, this.gallery(piece).length);
  }

  async removeImage(piece: JoiaPiece, index: number): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remover foto',
      message: 'Remover esta foto? Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    const slug = piece.slug || piece.id;
    const state = {
      gallery: this.gallery(piece),
      hasImagesArray: Boolean(piece.images?.length),
    };
    const patch = removeContentGalleryImage(state, index, {
      imagesPath: 'images',
      imagePath: 'image',
    });
    if (!patch) return;

    this.imageUploadingId.set(piece.id);
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, patch.path, patch.value).subscribe({
      next: () => {
        this.applyLocalPatch(slug, patch.path, patch.value);
        for (const extra of patch.localSync ?? []) {
          this.applyLocalPatch(slug, extra.path, extra.value);
        }
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
        this.toast.success('Alteração salva.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar.'));
      },
    });
  }

  isImageUploading(piece: JoiaPiece): boolean {
    return this.imageUploadingId() === piece.id;
  }

  dropGallery(piece: JoiaPiece, event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const next = [...this.gallery(piece)];
    moveItemInArray(next, event.previousIndex, event.currentIndex);

    const slug = piece.slug || piece.id;
    this.imageUploadingId.set(piece.id);
    this.contentAdmin.patchContentField(CONTENT_KIND, slug, 'images', next).subscribe({
      next: () => {
        this.applyLocalPatch(slug, 'images', next);
        this.applyLocalPatch(slug, 'image', next[0] ?? '');
        this.setStill(piece.id, event.currentIndex);
        this.imageUploadingId.set(null);
        this.toast.success('Ordem das fotos atualizada.');
      },
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível reordenar.'));
      },
    });
  }

  /** From `lc-editable-image` — File is already chosen. */
  onPickImage(piece: JoiaPiece, index: number, file: File): void {
    this.imageUploadingId.set(piece.id);
    this.contentAdmin.uploadImage$(file, piece.title).subscribe({
      next: ({ cdnUrl }) => this.persistImageSwap(piece, index, cdnUrl),
      error: (err: unknown) => {
        this.imageUploadingId.set(null);
        this.toast.error(adminHttpErrorMessage(err, 'Falha no envio da foto.'));
      },
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
    const state = {
      gallery: this.gallery(piece),
      hasImagesArray: Boolean(piece.images?.length),
    };
    const patch = patchContentGalleryImage(state, index, cdnUrl, {
      imagesPath: 'images',
      imagePath: 'image',
    });

    this.contentAdmin.patchContentField(CONTENT_KIND, slug, patch.path, patch.value).subscribe({
      next: () => {
        this.applyLocalPatch(slug, patch.path, patch.value);
        for (const extra of patch.localSync ?? []) {
          this.applyLocalPatch(slug, extra.path, extra.value);
        }
        if (index >= state.gallery.length) {
          this.setStill(piece.id, index);
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

  private clampStillIndex(pieceId: string, maxIndex: number): void {
    const current = this.stillById()[pieceId] ?? 0;
    if (current > maxIndex) {
      this.setStill(pieceId, maxIndex);
    }
  }

  private applyLocalPatch(slug: string, path: string, value: unknown): void {
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
