import { Injectable, Type, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
import { filterArchivedList } from '../../../core/admin-archive';
import { AdminCollectionsApiService, AdminCollectionDto } from '../../../core/admin-collections-api.service';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { ApiProductDto } from '../../../core/catalog.service';
import { JoiaPiece } from '../../../core/joias.data';

export interface Admin3dCatalogSnapshot {
  collections: AdminCollectionDto[];
  products: ApiProductDto[];
  joias: JoiaPiece[];
}

/**
 * Starts the 3D page chunk and catalog HTTP in parallel from the three.js-free gate.
 * Only authenticated admin endpoints (`GET /api/admin/collections`,
 * `GET /api/admin/products`). Never `GET /api/collections/:slug` — drafts such as
 * teste-ordem2 and archived slugs 404 on the public catalog, which the 3D must still
 * show. Archived rows are dropped client-side as well, in case an older API ignores
 * the default `archived=false`.
 */
@Injectable({ providedIn: 'root' })
export class Admin3dPrefetchService {
  private readonly collectionsApi = inject(AdminCollectionsApiService);
  private readonly joiasAdmin = inject(AdminJoiasCatalogService);

  private pageImport: Promise<Type<unknown>> | null = null;
  private catalog$: Observable<Admin3dCatalogSnapshot> | null = null;

  prefetchPage(): Promise<Type<unknown>> {
    this.pageImport ??= import('./admin-3d-page').then((m) => m.Admin3dPage);
    return this.pageImport;
  }

  prefetchCatalog(): Observable<Admin3dCatalogSnapshot> {
    if (!this.catalog$) {
      this.catalog$ = forkJoin({
        collections: this.collectionsApi.list(),
        products: this.collectionsApi.listAdminProducts().pipe(map((list) => filterArchivedList(list, false))),
        joias: this.joiasAdmin.list$().pipe(catchError(() => of(this.joiasAdmin.list()))),
      }).pipe(shareReplay(1));
    }
    return this.catalog$;
  }
}
