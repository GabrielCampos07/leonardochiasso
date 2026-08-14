import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, switchMap, tap } from 'rxjs';
import { LcProductCard } from '../../shared/components/product-card/product-card';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { Product } from '../../core/product.model';
import { GenderSlug, ROUTES } from '../../core/routes';
import { RtwType, productMatchesRtwType, rtwLabel } from '../../core/rtw';
import { sortByCollectionThenRecommend } from '../../core/recommend-order';

const RTW_TYPES: RtwType[] = ['vestidos', 'calcas', 'casacos', 'camisas'];

function isRtwType(value: string | null): value is RtwType {
  return !!value && RTW_TYPES.includes(value as RtwType);
}

function genderFromData(data: { gender?: string }): GenderSlug {
  return data['gender'] === 'masculino' ? 'masculino' : 'feminino';
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

  readonly gender = signal<GenderSlug>(genderFromData(this.route.snapshot.data));
  readonly tipo = signal<RtwType | null>(null);
  readonly rawProducts = signal<Product[]>([]);

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
    return sortByCollectionThenRecommend(
      this.rawProducts().filter((p) => productMatchesRtwType(p, t)),
    );
  });

  constructor() {
    combineLatest([this.route.data, this.route.paramMap])
      .pipe(
        takeUntilDestroyed(),
        map(([data, params]) => ({
          gender: genderFromData(data),
          tipo: params.get('tipo'),
        })),
        tap(({ gender, tipo }) => {
          this.gender.set(gender);
          this.chrome.setActive(gender);
          if (!isRtwType(tipo)) {
            void this.router.navigate(['/'], {
              queryParams: { categoria: gender },
              fragment: 'colecoes',
            });
            return;
          }
          this.tipo.set(tipo);
        }),
        switchMap(({ gender }) => this.catalog.getProductsByCategory(gender)),
      )
      .subscribe((list) => this.rawProducts.set(list));
  }

  ngOnInit(): void {
    // Route + catalog handled in constructor.
  }
}
