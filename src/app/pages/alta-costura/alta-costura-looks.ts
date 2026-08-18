import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { Product } from '../../core/product.model';
import {
  GenderSlug,
  ROUTES,
  collectionPath,
  desfilePath,
  productPath,
} from '../../core/routes';
import { RtwType, productMatchesRtwType, rtwLabel } from '../../core/rtw';
import { sortByRecommendOrder } from '../../core/recommend-order';
import { LookbookCollection, LookbookLook, getLookbook } from './lookbook.data';

/** Prefer these tokens when picking a category-tile thumb. */
const TILE_THUMB_PREFER: Partial<Record<RtwType, RegExp>> = {
  casacos: /\b(blazer|jaqueta|trench)\b/i,
  calcas: /\b(calca|calça|pantalona|shorts)\b/i,
  camisas: /\b(camisa|blusa|top)\b/i,
  vestidos: /\b(vestido)\b/i,
};

const RTW_ORDER: RtwType[] = ['vestidos', 'calcas', 'casacos', 'camisas'];
const JOIA_TILE_IMAGE = 'assets/media/joias/brinco-tassel-preto.png';
const ACESSORIO_TILE_IMAGE = 'assets/media/pdp-echarpe-degrade-01.png';

interface RelatedCatTile {
  label: string;
  image: string;
  route: string | null;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'lc-alta-costura-looks-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './alta-costura-looks.html',
  styleUrl: './alta-costura-looks.scss',
})
export class AltaCosturaLooksPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);

  readonly back = ROUTES.lookbook;
  readonly hub = ROUTES.lookbook;
  readonly book = signal<LookbookCollection | null>(null);
  readonly gender = signal<GenderSlug | null>(null);
  readonly desfileHref = signal<string>(ROUTES.lookbook);
  readonly collectionProducts = signal<Product[]>([]);

  readonly visibleLooks = computed((): LookbookLook[] => {
    const book = this.book();
    if (!book) return [];
    const gender = this.gender();
    if (!gender) return book.looks;
    return book.looks.filter((look) => this.lookMatchesGender(look, gender));
  });

  readonly lookCount = computed(() => this.visibleLooks().length);

  /** RTW category tiles for this brand — only types that have products. */
  readonly relatedCats = computed((): RelatedCatTile[] => {
    const book = this.book();
    if (!book) return [];
    const gender = this.gender();
    const products = gender
      ? this.collectionProducts().filter((p) => p.category === gender)
      : this.collectionProducts();
    const usedImages = new Set<string>();
    const tiles: RelatedCatTile[] = [];

    for (const tipo of RTW_ORDER) {
      const matches = sortByRecommendOrder(
        products.filter((p) => productMatchesRtwType(p, tipo)),
      );
      if (!matches.length) continue;

      const prefer = TILE_THUMB_PREFER[tipo];
      const ordered = prefer
        ? [...matches].sort((a, b) => {
            const key = (p: Product) => `${p.slug} ${p.name}`;
            const as = prefer.test(key(a)) ? 0 : 1;
            const bs = prefer.test(key(b)) ? 0 : 1;
            return as - bs;
          })
        : matches;

      let image: string | null = null;
      for (const p of ordered) {
        if (!usedImages.has(p.thumb)) {
          usedImages.add(p.thumb);
          image = p.thumb;
          break;
        }
      }
      image ??= matches[0]?.thumb ?? null;
      if (!image) continue;

      tiles.push({
        label: rtwLabel(tipo),
        image,
        route: collectionPath(book.collectionSlug),
        queryParams: {
          tipo,
          ...(gender ? { categoria: gender } : {}),
        },
      });
    }

    tiles.push(
      {
        label: 'Joia',
        image: JOIA_TILE_IMAGE,
        route: null,
      },
      {
        label: 'Acessório',
        image: ACESSORIO_TILE_IMAGE,
        route: null,
      },
    );

    return tiles;
  });

  productHref(slug: string): string {
    return productPath(slug);
  }

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const raw = q.get('categoria');
      const cat: GenderSlug | null =
        raw === 'feminino' || raw === 'masculino' ? raw : null;
      this.gender.set(cat);
      this.chrome.setActive(cat ?? 'default');
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const found = getLookbook(slug);
    if (!found) {
      void this.router.navigateByUrl(ROUTES.lookbook);
      return;
    }
    this.book.set(found);
    this.desfileHref.set(desfilePath(found.slug));
    this.catalog.getProductsByCollection(found.collectionSlug).subscribe((list) => {
      this.collectionProducts.set(list);
    });
  }

  private lookMatchesGender(look: LookbookLook, gender: GenderSlug): boolean {
    const slug = look.productSlug;
    if (!slug) return false;
    const fromCollection = this.collectionProducts().find((p) => p.slug === slug);
    const product =
      fromCollection ?? this.catalog.products().find((p) => p.slug === slug);
    return product?.category === gender;
  }
}
