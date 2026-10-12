import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import { Product } from '../../../core/product.model';
import { ToastService } from '../../../core/feedback/toast.service';
import { AdminProductForm } from '../admin-product-form';
import { focusEditModal, listenDialogEscape } from './dialog-escape';

export interface ProductEditModalData {
  slug: string;
  product?: Product;
  isNew?: boolean;
}

export const PRODUCT_EDIT_MODAL_TITLE_ID = 'product-edit-modal-title';

export function productEditModalTitle(name: string | null | undefined, isNew = false): string {
  if (isNew) return 'Adicionar produto';
  const trimmed = name?.trim();
  return trimmed ? `Editar produto · ${trimmed}` : 'Editar produto';
}

@Component({
  selector: 'lc-product-edit-modal',
  standalone: true,
  imports: [AdminProductForm],
  templateUrl: './product-edit-modal.html',
  styleUrl: './product-edit-modal.scss',
})
export class ProductEditModal implements OnInit, AfterViewInit, OnDestroy {
  private readonly data = inject<ProductEditModalData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<Product | undefined>);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private detachEscape: (() => void) | null = null;

  @HostBinding('attr.tabindex') readonly hostTabIndex = -1;
  readonly titleId = PRODUCT_EDIT_MODAL_TITLE_ID;
  readonly product = signal<Product | null>(null);
  readonly missing = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);

  get title(): string {
    return productEditModalTitle(this.product()?.name ?? this.data.product?.name, this.data.isNew);
  }

  get creating(): boolean {
    return Boolean(this.data.isNew);
  }

  ngOnInit(): void {
    this.detachEscape = listenDialogEscape(() => this.close());
    if (this.data.isNew || this.data.product) {
      this.loading.set(false);
      this.product.set(structuredClone(this.data.product ?? null));
      if (!this.product()) this.missing.set(true);
      return;
    }
    this.adminCatalog.get$(this.data.slug).subscribe({
      next: (product) => {
        this.loading.set(false);
        if (!product) {
          this.missing.set(true);
          return;
        }
        this.product.set(structuredClone(product));
      },
      error: (err) => {
        this.loading.set(false);
        this.missing.set(true);
        this.toast.error(adminHttpErrorMessage(err, 'Produto não encontrado.'));
      },
    });
  }

  ngAfterViewInit(): void {
    focusEditModal(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.detachEscape?.();
    this.detachEscape = null;
  }

  onArchived(saved: Product): void {
    this.ref.close(saved);
  }

  onSaved(saved: Product): void {
    this.product.set(structuredClone(saved));
    this.ref.close(saved);
  }

  onSaving(value: boolean): void {
    this.saving.set(value);
  }

  close(): void {
    if (this.saving()) return;
    this.ref.close(undefined);
  }
}
