import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import { Product } from '../../../core/product.model';
import { ToastService } from '../../../core/feedback/toast.service';
import { AdminProductForm } from '../admin-product-form';

export interface ProductEditModalData {
  slug: string;
  product?: Product;
}

@Component({
  selector: 'lc-product-edit-modal',
  standalone: true,
  imports: [AdminProductForm],
  templateUrl: './product-edit-modal.html',
  styleUrl: './product-edit-modal.scss',
})
export class ProductEditModal implements OnInit {
  private readonly data = inject<ProductEditModalData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<Product | undefined>);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly toast = inject(ToastService);

  readonly product = signal<Product | null>(null);
  readonly missing = signal(false);
  readonly loading = signal(true);

  ngOnInit(): void {
    if (this.data.product) {
      this.loading.set(false);
      this.product.set(structuredClone(this.data.product));
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

  onSaved(saved: Product): void {
    this.ref.close(saved);
  }

  close(): void {
    this.ref.close(undefined);
  }
}
