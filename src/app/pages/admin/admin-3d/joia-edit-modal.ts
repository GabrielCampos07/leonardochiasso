import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { uniqueJoiaSlug } from './atelier-blank';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { JoiaPiece, joiaGallery } from '../../../core/joias.data';
import { ToastService } from '../../../core/feedback/toast.service';
import { focusEditModal, listenDialogEscape } from './dialog-escape';
import { PRODUCT_EDIT_MODAL_TITLE_ID } from './product-edit-modal';

export interface JoiaEditModalData {
  slug: string;
  piece?: JoiaPiece;
  isNew?: boolean;
}

@Component({
  selector: 'lc-joia-edit-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './joia-edit-modal.html',
  styleUrl: './product-edit-modal.scss',
})
export class JoiaEditModal implements OnInit, AfterViewInit, OnDestroy {
  private readonly data = inject<JoiaEditModalData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<JoiaPiece | undefined>);
  private readonly catalog = inject(AdminJoiasCatalogService);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private detachEscape: (() => void) | null = null;

  @HostBinding('attr.tabindex') readonly hostTabIndex = -1;
  readonly titleId = PRODUCT_EDIT_MODAL_TITLE_ID;
  readonly piece = signal<JoiaPiece | null>(null);
  readonly missing = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly imagesText = computed(() => {
    const p = this.piece();
    return p ? joiaGallery(p).join('\n') : '';
  });

  get title(): string {
    if (this.data.isNew) return 'Adicionar joia';
    const name = this.piece()?.title ?? this.data.piece?.title;
    return name?.trim() ? `Editar joia · ${name}` : 'Editar joia';
  }

  ngOnInit(): void {
    this.detachEscape = listenDialogEscape(() => this.close());
    if (this.data.isNew) {
      this.loading.set(false);
      if (!this.data.piece) {
        this.missing.set(true);
        return;
      }
      this.piece.set(structuredClone(this.data.piece));
      return;
    }
    const found = this.data.piece ?? this.catalog.get(this.data.slug);
    this.loading.set(false);
    if (!found) {
      this.missing.set(true);
      return;
    }
    this.piece.set(structuredClone(found));
  }

  ngAfterViewInit(): void {
    focusEditModal(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.detachEscape?.();
    this.detachEscape = null;
  }

  patch<K extends keyof JoiaPiece>(key: K, value: JoiaPiece[K]): void {
    const cur = this.piece();
    if (!cur) return;
    this.piece.set({ ...cur, [key]: value });
  }

  onImagesChange(text: string): void {
    const cur = this.piece();
    if (!cur) return;
    const images = text.split('\n').map((l) => l.trim()).filter(Boolean);
    this.piece.set({ ...cur, images, image: images[0] ?? cur.image });
  }

  save(): void {
    if (this.saving()) return;
    const cur = this.piece();
    if (!cur?.title.trim()) {
      this.toast.info('Informe o título.');
      return;
    }
    const title = cur.title.trim();
    const slug = this.data.isNew
      ? uniqueJoiaSlug(title, (s) => this.catalog.slugExists(s))
      : cur.slug;
    const next: JoiaPiece = {
      ...cur,
      id: slug,
      slug,
      title,
      description: cur.description.trim(),
      priceLabel: cur.priceLabel.trim() || 'Sob consulta',
      image: cur.image?.trim() || joiaGallery(cur)[0],
      images: joiaGallery(cur),
    };
    this.saving.set(true);
    if (this.data.isNew) this.catalog.create(next);
    else this.catalog.save(next);
    this.toast.success(this.data.isNew ? 'Joia criada.' : 'Joia salva.');
    this.saving.set(false);
    this.ref.close(next);
  }

  close(): void {
    if (this.saving()) return;
    this.ref.close(undefined);
  }
}
