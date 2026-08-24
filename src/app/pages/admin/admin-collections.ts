import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import { adminCollectionPath, adminNewCollectionPath } from '../../core/routes';

@Component({
  selector: 'lc-admin-collections',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-collections.html',
  styleUrl: './admin-products.scss',
})
export class AdminCollectionsPage implements OnInit {
  private readonly api = inject(AdminCollectionsApiService);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly collections = signal<AdminCollectionDto[]>([]);
  readonly newPath = adminNewCollectionPath();

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.collections();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.reload();
  }

  editPath(slug: string): string {
    return adminCollectionPath(slug);
  }

  publishedLabel(c: AdminCollectionDto): string {
    return c.publishedAt ? 'Publicada' : 'Rascunho';
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: (list) => {
        this.collections.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as coleções. Verifique se a API está no ar.');
        this.loading.set(false);
      },
    });
  }
}
