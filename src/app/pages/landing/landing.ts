import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { of } from 'rxjs';
import { LcNewsletter } from '../../shared/components/newsletter/newsletter';
import { LcProductCard } from '../../shared/components/product-card/product-card';
import { brandLineForGender } from '../../core/brand-lines';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { COLLECTION_NAV } from '../../core/nav.config';
import { Product } from '../../core/product.model';
import { GenderSlug, collectionPath } from '../../core/routes';
import { sortByRecommendOrder } from '../../core/recommend-order';
import { AltaCosturaFilms } from '../alta-costura/alta-costura-films';

@Component({
  selector: 'lc-landing-page',
  standalone: true,
  imports: [LcNewsletter, AltaCosturaFilms, LcProductCard, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);

  readonly categoria = signal<GenderSlug | null>(null);
  readonly rawProducts = signal<Product[]>([]);

  readonly brandLine = computed(() => brandLineForGender(this.categoria()));

  readonly genderLabel = computed(() => this.brandLine()?.title ?? null);

  readonly genderLede = computed(() => this.brandLine()?.lede ?? null);

  readonly products = computed(() => sortByRecommendOrder([...this.rawProducts()]));

  readonly collectionTiles = computed(() => {
    const g = this.categoria();
    if (!g) return [];
    return COLLECTION_NAV.map((c) => ({
      label: c.label,
      route: collectionPath(c.slug),
      queryParams: { categoria: g },
    }));
  });

  constructor() {
    this.route.queryParamMap
      .pipe(
        takeUntilDestroyed(),
        switchMap((q) => {
          const raw = q.get('categoria');
          const cat: GenderSlug | null =
            raw === 'feminino' || raw === 'masculino' ? raw : null;
          this.categoria.set(cat);
          this.chrome.setActive(cat ?? 'default');
          if (cat) {
            queueMicrotask(() => this.scrollToColecoes());
            return this.catalog.getProductsByCategory(cat);
          }
          this.rawProducts.set([]);
          return of([] as Product[]);
        }),
      )
      .subscribe((list) => this.rawProducts.set(list));
  }

  ngOnInit(): void {
    // Query + scroll handled in constructor.
  }

  private scrollToColecoes(): void {
    const el = document.getElementById('colecoes');
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
