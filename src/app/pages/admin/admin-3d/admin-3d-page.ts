import { Dialog } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { AdminViewModeService } from '../../../core/admin-view-mode.service';
import { ApiProductDto, mapApiProduct } from '../../../core/catalog.service';
import { Product } from '../../../core/product.model';
import { leaveAdmin3dToList } from '../../../core/admin-return-url';
import { environment } from '../../../../environments/environment';
import {
  OVERVIEW_FOCUS_ID,
  formatStockLabel,
  rackNavItems,
  stepRackIndex,
} from '../../../scene-engine/camera-guide';
import { mapCatalogToScene, replaceHanger, resolveProductRackId, toSceneHanger } from '../../../scene-engine/mapping';
import { apiProductToSceneInput, productToSceneInput } from '../../../scene-engine/from-catalog';
import { clampTooltip, mergeProductPhotos } from '../../../scene-engine/photo-url';
import { createSceneEngine, SceneEngine } from '../../../scene-engine/scene-engine';
import type { SceneCollectionInput, SceneLayout, SceneProductInput } from '../../../scene-engine/types';
import {
  WEBGL_UNAVAILABLE_ACTION,
  WEBGL_UNAVAILABLE_HINT,
  WEBGL_UNAVAILABLE_TITLE,
} from '../../../scene-engine/webgl-support';
import {
  ADMIN_3D_MOCK_KEY,
  isAdmin3dMockEnabled,
  readAdmin3dMockStorage,
  shouldUseLocalAdmin3dCatalog,
} from './admin-3d-guards';
import {
  admin3dFixtureProducts,
  admin3dFixtureSceneCollections,
  admin3dFixtureSceneProducts,
  collectionsFromLabels,
} from './admin-3d.fixtures';
import {
  PRODUCT_EDIT_MODAL_TITLE_ID,
  ProductEditModal,
  ProductEditModalData,
} from './product-edit-modal';

export { ADMIN_3D_MOCK_KEY, isAdmin3dMockEnabled } from './admin-3d-guards';

const HINT_AUTO_HIDE_MS = 5000;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

@Component({
  selector: 'lc-admin-3d-page',
  standalone: true,
  templateUrl: './admin-3d-page.html',
  styleUrl: './admin-3d-page.scss',
})
export class Admin3dPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sceneHost') private sceneHostRef?: ElementRef<HTMLElement>;
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly collectionsApi = inject(AdminCollectionsApiService);
  private readonly viewMode = inject(AdminViewModeService);

  readonly loading = signal(true);
  readonly firstFrame = signal(false);
  readonly bootFading = signal(false);
  readonly error = signal('');
  readonly empty = signal(false);
  readonly usingMock = signal(false);
  readonly allowMock = !environment.production;
  readonly hoverTip = signal<{ name: string; stock: string; x: number; y: number } | null>(null);
  readonly showHint = signal(true);
  readonly webglUnavailable = signal(false);
  readonly showBoot = computed(
    () =>
      !this.webglUnavailable() &&
      !this.error() &&
      !this.empty() &&
      (this.loading() || !this.firstFrame() || this.bootFading()),
  );
  readonly reducedMotion = prefersReducedMotion();
  readonly webglTitle = WEBGL_UNAVAILABLE_TITLE;
  readonly webglHint = WEBGL_UNAVAILABLE_HINT;
  readonly webglAction = WEBGL_UNAVAILABLE_ACTION;
  readonly focusedId = signal<string>(OVERVIEW_FOCUS_ID);
  readonly overviewId = OVERVIEW_FOCUS_ID;
  readonly racks = signal<{ id: string; name: string; index: number }[]>([]);
  readonly atFirst = computed(() => {
    const items = this.racks();
    const id = this.focusedId();
    return id !== OVERVIEW_FOCUS_ID && items[0]?.id === id;
  });
  readonly atLast = computed(() => {
    const items = this.racks();
    const id = this.focusedId();
    return id !== OVERVIEW_FOCUS_ID && items[items.length - 1]?.id === id;
  });

  private engine: SceneEngine | null = null;
  private layout: SceneLayout = { racks: [] };
  private knownRackIds = new Set<string>();
  private productsBySlug = new Map<string, Product>();
  private canvasReady = false;
  private pendingLayout: SceneLayout | null = null;
  private loadGen = 0;
  private hintTimer = 0;
  private bootFadeTimer = 0;

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      return;
    }
    this.engine = createSceneEngine(canvas, { reducedMotion: this.reducedMotion });
    if (!this.engine) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      return;
    }
    this.engine.onClick((slug) => this.openEditor(slug));
    this.engine.onHover((slug, pointer) => this.setHoverTip(slug, pointer));
    this.engine.onFocusChange((id) => this.focusedId.set(id));
    this.engine.onFirstFrame(() => this.markFirstFrame());
    this.engine.start();
    this.canvasReady = true;
    if (this.pendingLayout) {
      this.engine.setLayout(this.pendingLayout);
      this.pendingLayout = null;
    }
    this.hintTimer = window.setTimeout(() => this.showHint.set(false), HINT_AUTO_HIDE_MS);
  }

  ngOnDestroy(): void {
    if (this.hintTimer) window.clearTimeout(this.hintTimer);
    if (this.bootFadeTimer) window.clearTimeout(this.bootFadeTimer);
    this.engine?.dispose();
    this.engine = null;
  }

  @HostListener('window:keydown', ['$event'])
  onGuideKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.empty() || this.error()) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (document.querySelector('.lc-product-edit-dialog')) return;
    event.preventDefault();
    this.stepRack(event.key === 'ArrowLeft' ? -1 : 1);
  }

  focusRack(id: string): void {
    this.engine?.focusRack(id, this.reducedMotion);
  }

  focusOverview(): void {
    this.engine?.focusOverview(this.reducedMotion);
  }

  stepRack(delta: -1 | 1): void {
    const items = this.racks();
    if (!items.length) return;
    const current = items.findIndex((r) => r.id === this.focusedId());
    const from = current < 0 ? (delta === 1 ? -1 : items.length) : current;
    const next = items[stepRackIndex(from, delta, items.length)];
    if (next) this.focusRack(next.id);
  }

  dismissHint(): void {
    this.showHint.set(false);
  }

  backToList(): void {
    const dest = leaveAdmin3dToList();
    this.viewMode.setMode(dest.mode);
    void this.router.navigateByUrl(dest.url);
  }

  retry(): void {
    this.load();
  }

  useMock(): void {
    if (environment.production) return;
    try {
      localStorage.setItem(ADMIN_3D_MOCK_KEY, '1');
    } catch {
      /* ignore */
    }
    this.load();
  }

  focusScene(): void {
    this.sceneHostRef?.nativeElement.focus({ preventScroll: true });
  }

  private load(): void {
    const gen = ++this.loadGen;
    this.loading.set(true);
    this.firstFrame.set(false);
    this.bootFading.set(false);
    this.error.set('');
    this.empty.set(false);

    const mock = isAdmin3dMockEnabled({
      production: environment.production,
      envMock: environment.admin3dMock,
      queryMock: this.route.snapshot.queryParamMap.get('mock'),
      storageMock: readAdmin3dMockStorage(),
    });
    if (mock) {
      this.cacheProducts(admin3dFixtureProducts());
      this.applyInputs(admin3dFixtureSceneCollections(), admin3dFixtureSceneProducts(), true, gen);
      return;
    }

    if (
      shouldUseLocalAdmin3dCatalog({
        production: environment.production,
        useApi: this.adminCatalog.useApi,
      })
    ) {
      const list = this.adminCatalog.list();
      this.cacheProducts(list);
      this.applyInputs(collectionsFromLabels(), list.map(productToSceneInput), false, gen);
      return;
    }

    forkJoin({
      collections: this.collectionsApi.list(),
      products: this.collectionsApi.listAdminProducts(),
      storefront: this.collectionsApi.listPublicProducts().pipe(catchError(() => of([] as ApiProductDto[]))),
    }).subscribe({
      next: ({ collections, products, storefront }) => {
        if (gen !== this.loadGen) return;
        const storefrontBySlug = new Map(storefront.map((p) => [p.slug, p]));
        const merged = products.map((dto) => mergeProductPhotos(dto, storefrontBySlug.get(dto.slug)));
        this.cacheProducts(merged.map(mapApiProduct));
        this.applyInputs(
          collections.map((c) => ({
            slug: c.slug,
            name: c.name,
            sortOrder: c.sortOrder,
          })),
          merged.map(apiProductToSceneInput),
          false,
          gen,
        );
      },
      error: (err) => {
        if (gen !== this.loadGen) return;
        this.loading.set(false);
        this.error.set(
          adminHttpErrorMessage(err, 'Não foi possível carregar o ateliê 3D. Verifique a API.'),
        );
      },
    });
  }

  private applyInputs(
    collections: SceneCollectionInput[],
    products: SceneProductInput[],
    mock: boolean,
    gen: number,
  ): void {
    if (gen !== this.loadGen) return;
    this.usingMock.set(mock);
    this.knownRackIds = new Set(collections.map((c) => c.slug));
    this.layout = mapCatalogToScene(collections, products);
    this.racks.set(rackNavItems(this.layout.racks));
    const hangerCount = this.layout.racks.reduce((n, r) => n + r.hangers.length, 0);
    this.empty.set(hangerCount === 0);
    this.loading.set(false);
    if (this.canvasReady && this.engine) {
      this.engine.setLayout(this.layout);
    } else {
      this.pendingLayout = this.layout;
    }
  }

  private openEditor(slug: string): void {
    this.focusScene();
    const ref = this.dialog.open<Product | undefined, ProductEditModalData, ProductEditModal>(
      ProductEditModal,
      {
        data: { slug, product: this.productsBySlug.get(slug) },
        panelClass: 'lc-product-edit-dialog',
        backdropClass: 'lc-product-edit-backdrop',
        autoFocus: 'first-tabbable',
        restoreFocus: false,
        ariaLabelledBy: PRODUCT_EDIT_MODAL_TITLE_ID,
      },
    );
    ref.closed.subscribe((saved) => {
      if (saved) this.applySaved(saved);
      queueMicrotask(() => this.focusScene());
    });
  }

  private cacheProducts(products: Product[]): void {
    this.productsBySlug = new Map(products.map((p) => [p.slug, p]));
  }

  private setHoverTip(slug: string | null, pointer?: { x: number; y: number }): void {
    if (!slug || !pointer) {
      this.hoverTip.set(null);
      return;
    }
    const hanger = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === slug);
    if (!hanger) {
      this.hoverTip.set(null);
      return;
    }
    const pos = clampTooltip(pointer.x, pointer.y, { width: 228, height: 68 });
    this.hoverTip.set({ name: hanger.name, stock: formatStockLabel(hanger.stockQty), x: pos.x, y: pos.y });
  }

  private markFirstFrame(): void {
    this.firstFrame.set(true);
    if (this.reducedMotion) {
      this.bootFading.set(false);
      return;
    }
    this.bootFading.set(true);
    if (this.bootFadeTimer) window.clearTimeout(this.bootFadeTimer);
    this.bootFadeTimer = window.setTimeout(() => this.bootFading.set(false), 420);
  }

  private applySaved(product: Product): void {
    this.productsBySlug.set(product.slug, product);
    const input = productToSceneInput(product);
    const rackId = resolveProductRackId(input, this.knownRackIds);
    const hanger = toSceneHanger(input, rackId);
    this.layout = replaceHanger(this.layout, hanger);
    this.engine?.updateHanger(hanger);
    const tip = this.hoverTip();
    if (tip && tip.name !== hanger.name) {
      const currentSlug = this.layout.racks
        .flatMap((r) => r.hangers)
        .find((h) => h.name === tip.name)?.slug;
      if (currentSlug === hanger.slug) {
        this.hoverTip.set({
          name: hanger.name,
          stock: formatStockLabel(hanger.stockQty),
          x: tip.x,
          y: tip.y,
        });
      }
    }
  }
}
