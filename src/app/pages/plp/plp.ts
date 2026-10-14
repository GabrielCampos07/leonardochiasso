import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { LcProductCard } from '../../shared/components/product-card/product-card';
import { CollectionCover } from '../../shared/components/collection-cover/collection-cover';
import { isArchivedAt } from '../../core/admin-archive';
import { ApiCollectionDto, CatalogService } from '../../core/catalog.service';
import { resolveCollectionCover } from '../../core/collection-cover';
import { COLLECTION_LABELS, Product } from '../../core/product.model';
import { ChromeService } from '../../core/chrome.service';
import { productMatchesRtwType, RtwType } from '../../core/rtw';
import {
  COLLECTION_SLUGS,
  CollectionSlug,
  ROUTES,
  collectionPath,
} from '../../core/routes';
import { groupShopProducts, matchesPublicGenderHub } from '../../core/product-gender';
import { AdminJoiasCatalogService } from '../../core/admin-joias-catalog.service';
import { JoiaPiece } from '../../core/joias.data';
import { displayPriceLabel } from '../../core/pricing';

const KNOWN_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));

/** Keep the route slug as-is. Never remap an unknown collection to Organic Dreams. */
export function resolvePlpCollectionSlug(param: string | null | undefined): string {
  return param?.trim() ?? '';
}

export function isCollectionNotFound(
  slug: string,
  meta: { slug?: string } | null | undefined,
  productCount: number,
): boolean {
  if (!slug) return true;
  if (productCount > 0 || meta) return false;
  return !KNOWN_SLUGS.has(slug);
}

export type SortKey = 'recomendados' | 'menor' | 'maior' | 'novidades' | 'desconto';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recomendados', label: 'Recomendados' },
  { key: 'menor', label: 'Menor preço' },
  { key: 'maior', label: 'Maior preço' },
  { key: 'novidades', label: 'Novidades' },
  { key: 'desconto', label: 'Melhor desconto' },
];

@Component({
  selector: 'lc-plp-page',
  standalone: true,
  imports: [RouterLink, LcProductCard, CollectionCover, UpperCasePipe],
  templateUrl: './plp.html',
  styleUrl: './plp.scss',
})
export class PlpPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);
  private readonly joiasCatalog = inject(AdminJoiasCatalogService);
  private readonly route = inject(ActivatedRoute);

  readonly home = ROUTES.home;
  readonly joiasRoute = ROUTES.joias;
  readonly sortOptions = SORT_OPTIONS;
  readonly priceLabel = displayPriceLabel;

  readonly collectionSlug = signal<string>('');
  readonly missing = computed(() =>
    isCollectionNotFound(this.collectionSlug(), this.collectionMeta(), this.rawProducts().length),
  );
  readonly rawProducts = signal<Product[]>([]);
  readonly collectionMeta = signal<ApiCollectionDto | null>(null);
  /** Page-local: true until this PLP's collection Observable emits. */
  readonly loading = signal(true);
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly sortKey = signal<SortKey>('recomendados');
  readonly sortOpen = signal(false);
  readonly gridCols = signal<2 | 4>(2);
  readonly rtwFilter = signal<RtwType | null>(null);
  readonly categoryFilter = signal<'feminino' | 'masculino' | null>(null);

  readonly collectionLabel = computed(() => {
    if (this.missing()) return 'Coleção não encontrada';
    const slug = this.collectionSlug();
    return (
      COLLECTION_LABELS[slug as CollectionSlug] ??
      this.collectionMeta()?.name ??
      slug
    );
  });

  readonly collectionRoute = computed(() => collectionPath(this.collectionSlug()));

  readonly genderHubRoute = computed(() => {
    const cat = this.categoryFilter();
    return cat ? ROUTES.home : null;
  });

  readonly genderHubLabel = computed(() => {
    const cat = this.categoryFilter();
    if (!cat) return null;
    return cat === 'masculino' ? 'Masculino' : 'Feminino';
  });

  readonly genderHubQueryParams = computed(() => {
    const cat = this.categoryFilter();
    return cat ? { categoria: cat } : null;
  });

  readonly sortLabel = computed(
    () => SORT_OPTIONS.find((o) => o.key === this.sortKey())?.label ?? 'Recomendados',
  );

  readonly coverUrl = computed(() => {
    if (this.missing()) return '';
    return resolveCollectionCover({
      collection: this.collectionMeta() ?? {
        slug: this.collectionSlug(),
        name: this.collectionLabel(),
      },
      products: this.rawProducts().map((p, index) => ({ ...p, sortOrder: index })),
    });
  });

  readonly products = computed(() => {
    let list = this.rawProducts().filter((p) => !isArchivedAt(p.archivedAt));
    const category = this.categoryFilter();
    if (category) {
      list = list.filter((p) => matchesPublicGenderHub(p, category));
    }
    const rtw = this.rtwFilter();
    if (rtw) {
      list = list.filter((p) => productMatchesRtwType(p, rtw));
    }
    switch (this.sortKey()) {
      case 'menor':
        return list.sort((a, b) => a.price - b.price);
      case 'maior':
        return list.sort((a, b) => b.price - a.price);
      case 'novidades':
        return list.reverse();
      case 'desconto':
        return list;
      case 'recomendados':
      default:
        return groupShopProducts(list);
    }
  });

  /** Joias featured under the current collection PLP. */
  readonly organicJoias = computed((): JoiaPiece[] => {
    const slug = this.collectionSlug();
    return this.joiasCatalog
      .list()
      .filter((j) => j.collectionSlug === slug && !isArchivedAt(j.archivedAt));
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        takeUntilDestroyed(),
        switchMap(([params, query]) => {
          const slug = resolvePlpCollectionSlug(params.get('collectionSlug'));
          this.collectionSlug.set(slug);

          const tipo = query.get('tipo');
          const known: RtwType[] = ['vestidos', 'calcas', 'casacos', 'camisas'];
          this.rtwFilter.set(
            tipo && known.includes(tipo as RtwType) ? (tipo as RtwType) : null,
          );

          const categoria = query.get('categoria');
          this.categoryFilter.set(
            categoria === 'masculino' || categoria === 'feminino' ? categoria : null,
          );

          const nav =
            categoria === 'masculino'
              ? 'masculino'
              : categoria === 'feminino'
                ? 'feminino'
                : 'default';
          this.chrome.setActive(nav);

          this.loading.set(true);
          return forkJoin({
            products: this.catalog.getProductsByCollection(slug),
            collections: this.catalog.getCollections().pipe(catchError(() => of([] as ApiCollectionDto[]))),
          }).pipe(
            map(({ products, collections }) => {
              this.collectionMeta.set(collections.find((row) => row.slug === slug) ?? null);
              return products;
            }),
          );
        }),
      )
      .subscribe((list) => {
        this.rawProducts.set(list);
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    this.catalog.getCollections().subscribe({
      next: (list) => {
        const slug = this.collectionSlug();
        this.collectionMeta.set(list.find((row) => row.slug === slug) ?? null);
      },
      error: () => this.collectionMeta.set(null),
    });
  }

  toggleSort(): void {
    this.sortOpen.update((v) => !v);
  }

  selectSort(key: SortKey): void {
    this.sortKey.set(key);
    this.sortOpen.set(false);
  }

  setGrid(cols: 2 | 4): void {
    this.gridCols.set(cols);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.plp__sort')) {
      this.sortOpen.set(false);
    }
  }
}
