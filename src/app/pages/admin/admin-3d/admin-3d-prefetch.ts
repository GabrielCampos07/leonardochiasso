import { Injectable, Type, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
import { AdminCollectionsApiService, AdminCollectionDto } from '../../../core/admin-collections-api.service';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { ApiProductDto } from '../../../core/catalog.service';
import { ContentService } from '../../../core/content.service';
import { JoiaPiece } from '../../../core/joias.data';

export interface Admin3dCatalogSnapshot {
  collections: AdminCollectionDto[];
  products: ApiProductDto[];
  storefront: ApiProductDto[];
  joias: JoiaPiece[];
}

/**
 * Starts the 3D page chunk and catalog HTTP in parallel from the three.js-free gate.
 */
@Injectable({ providedIn: 'root' })
export class Admin3dPrefetchService {
  private readonly collectionsApi = inject(AdminCollectionsApiService);
  private readonly content = inject(ContentService);
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
        products: this.collectionsApi.listAdminProducts(),
        storefront: this.collectionsApi.listPublicProducts().pipe(catchError(() => of([] as ApiProductDto[]))),
        joias: this.content.loadJoias().pipe(
          map((list) => this.joiasAdmin.applyTo(list)),
          catchError(() => of(this.joiasAdmin.list())),
        ),
      }).pipe(shareReplay(1));
    }
    return this.catalog$;
  }
}
