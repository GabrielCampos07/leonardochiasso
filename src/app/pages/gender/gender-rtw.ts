import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { LcProductCard } from '../../shared/components/product-card/product-card';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { COLLECTION_NAV } from '../../core/nav.config';
import { Product } from '../../core/product.model';
import {
  COLLECTION_SLUGS,
  CollectionSlug,
  GenderSlug,
  ROUTES,
} from '../../core/routes';
import { RtwType, productMatchesRtwType, rtwLabel } from '../../core/rtw';
import { sortByCollectionThenRecommend } from '../../core/recommend-order';

const RTW_TYPES: RtwType[] = ['vestidos', 'calcas', 'casacos', 'camisas'];

const KNOWN_COLLECTION_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));

interface CollectionChip {
  label: string;
  /** null = all collections */
  slug: CollectionSlug | null;
}

function isRtwType(value: string | null): value is RtwType {
  return !!value && RTW_TYPES.includes(value as RtwType);
}

function genderFromData(data: { gender?: string }): GenderSlug {
  return data['gender'] === 'masculino' ? 'masculino' : 'feminino';
}

function parseColecao(value: string | null): CollectionSlug | null {
  if (!value || !KNOWN_COLLECTION_SLUGS.has(value)) return null;
  return value as CollectionSlug;
}

@Component({
  selector: 'lc-gender-rtw-page',
  standalone: true,
  imports: [RouterLink, LcProductCard, UpperCasePipe],
  templateUrl: './gender-rtw.html',
  styleUrl: './gender-rtw.scss',
})
export class GenderRtwPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly home = ROUTES.home;

  readonly collectionChips: CollectionChip[] = [
    { label: 'Todas', slug: null },
    ...COLLECTION_NAV.map((c) => ({ label: c.label, slug: c.slug })),
  ];

  readonly gender = signal<GenderSlug>(genderFromData(this.route.snapshot.data));
  readonly tipo = signal<RtwType | null>(null);
  readonly collectionFilter = signal<CollectionSlug | null>(null);
  readonly rawProducts = signal<Product[]>([]);
  /** Page-local: true until this RTW grid's Observable emits. */
  readonly loading = signal(true);
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly genderLabel = computed(() =>
    this.gender() === 'masculino' ? 'Masculino' : 'Feminino',
  );

  readonly genderRoute = computed(() => ROUTES.home);
  readonly genderQueryParams = computed(() => ({ categoria: this.gender() }));

  readonly title = computed(() => {
    const t = this.tipo();
    return t ? rtwLabel(t, this.gender()) : this.genderLabel();
  });

  readonly lede = computed(() => {
    const t = this.tipo();
    if (t === 'vestidos') {
      return 'Vestidos, túnicas e macacões — todas as coleções, Organic → Niponic → Brazilian.';
    }
    if (t === 'calcas') {
      return 'Calças, bermudas e shorts — todas as coleções, Organic → Niponic → Brazilian.';
    }
    if (t === 'casacos') {
      return 'Blazers, jaquetas e trench — todas as coleções, Organic → Niponic → Brazilian.';
    }
    if (t === 'camisas') {
      return 'Camisas, blusas e tops — todas as coleções, Organic → Niponic → Brazilian.';
    }
    return '';
  });

  readonly products = computed(() => {
    const t = this.tipo();
    if (!t) return [];
    const colecao = this.collectionFilter();
    let list = this.rawProducts().filter((p) => productMatchesRtwType(p, t));
    if (colecao) {
      list = list.filter((p) => p.collectionSlug === colecao);
    }
    return sortByCollectionThenRecommend(list);
  });

  constructor() {
    combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(
        takeUntilDestroyed(),
        map(([data, params, query]) => ({
          gender: genderFromData(data),
          tipo: params.get('tipo'),
          colecao: parseColecao(query.get('colecao')),
        })),
        tap(({ gender, tipo, colecao }) => {
          this.gender.set(gender);
          this.chrome.setActive(gender);
          this.collectionFilter.set(colecao);
          if (!isRtwType(tipo)) {
            void this.router.navigate(['/'], {
              queryParams: { categoria: gender },
              fragment: 'colecoes',
            });
            return;
          }
          this.tipo.set(tipo);
        }),
        // Refetch + loading only on gender change; colecao filters client-side.
        map(({ gender }) => gender),
        distinctUntilChanged(),
        switchMap((gender) => {
          this.loading.set(true);
          return this.catalog.getProductsByCategory(gender);
        }),
      )
      .subscribe((list) => {
        this.rawProducts.set(list);
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    // Route + catalog handled in constructor.
  }

  selectCollection(slug: CollectionSlug | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { colecao: slug },
      queryParamsHandling: 'merge',
    });
  }

  isCollectionActive(slug: CollectionSlug | null): boolean {
    return this.collectionFilter() === slug;
  }
}
