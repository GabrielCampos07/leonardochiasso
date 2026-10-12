import { Dialog } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { AdminViewModeService } from '../../../core/admin-view-mode.service';
import { mapApiProduct } from '../../../core/catalog.service';
import { Product } from '../../../core/product.model';
import { leaveAdmin3dToList } from '../../../core/admin-return-url';
import { environment } from '../../../../environments/environment';
import { mapCatalogToScene, resolveProductRackId, toSceneHanger } from '../../../scene-engine/mapping';
import { apiProductToSceneInput, productToSceneInput } from '../../../scene-engine/from-catalog';
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
  readonly error = signal('');
  readonly empty = signal(false);
  readonly usingMock = signal(false);
  readonly allowMock = !environment.production;
  readonly hoverName = signal<string | null>(null);
  readonly showHint = signal(true);
  readonly webglUnavailable = signal(false);
  readonly reducedMotion = prefersReducedMotion();
  readonly webglTitle = WEBGL_UNAVAILABLE_TITLE;
  readonly webglHint = WEBGL_UNAVAILABLE_HINT;
  readonly webglAction = WEBGL_UNAVAILABLE_ACTION;

  private engine: SceneEngine | null = null;
  private layout: SceneLayout = { racks: [] };
  private knownRackIds = new Set<string>();
  private productsBySlug = new Map<string, Product>();
  private canvasReady = false;
  private pendingLayout: SceneLayout | null = null;
  private loadGen = 0;
  private hintTimer = 0;

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
    this.engine.onHover((slug) => {
      const hanger = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === slug);
      this.hoverName.set(hanger?.name ?? null);
    });
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
    this.engine?.dispose();
    this.engine = null;
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
    }).subscribe({
      next: ({ collections, products }) => {
        if (gen !== this.loadGen) return;
        this.cacheProducts(products.map(mapApiProduct));
        this.applyInputs(
          collections.map((c) => ({
            slug: c.slug,
            name: c.name,
            sortOrder: c.sortOrder,
          })),
          products.map(apiProductToSceneInput),
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

  private applySaved(product: Product): void {
    this.productsBySlug.set(product.slug, product);
    const input = productToSceneInput(product);
    const rackId = resolveProductRackId(input, this.knownRackIds);
    const hanger = toSceneHanger(input, rackId);
    this.engine?.updateHanger(hanger);
    const nextName = hanger.name;
    if (this.hoverName() && this.hoverName() !== nextName) {
      const currentSlug = this.layout.racks
        .flatMap((r) => r.hangers)
        .find((h) => h.name === this.hoverName())?.slug;
      if (currentSlug === hanger.slug) this.hoverName.set(nextName);
    }
  }
}
