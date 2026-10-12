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
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { mapApiProduct } from '../../../core/catalog.service';
import { Product } from '../../../core/product.model';
import { environment } from '../../../../environments/environment';
import { mapCatalogToScene, resolveProductRackId, toSceneHanger } from '../../../scene-engine/mapping';
import { apiProductToSceneInput, productToSceneInput } from '../../../scene-engine/from-catalog';
import { SceneEngine } from '../../../scene-engine/scene-engine';
import type { SceneCollectionInput, SceneLayout, SceneProductInput } from '../../../scene-engine/types';
import {
  admin3dFixtureProducts,
  admin3dFixtureSceneCollections,
  admin3dFixtureSceneProducts,
  collectionsFromLabels,
} from './admin-3d.fixtures';
import { ProductEditModal, ProductEditModalData } from './product-edit-modal';

export const ADMIN_3D_MOCK_KEY = 'lc.admin.3d.mock';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function isAdmin3dMockEnabled(queryMock?: string | null): boolean {
  if (environment.admin3dMock) return true;
  if (queryMock === '1' || queryMock === 'true') return true;
  try {
    return localStorage.getItem(ADMIN_3D_MOCK_KEY) === '1';
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
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly collectionsApi = inject(AdminCollectionsApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly empty = signal(false);
  readonly usingMock = signal(false);
  readonly hoverName = signal<string | null>(null);
  readonly reducedMotion = prefersReducedMotion();

  private engine: SceneEngine | null = null;
  private layout: SceneLayout = { racks: [] };
  private knownRackIds = new Set<string>();
  private productsBySlug = new Map<string, Product>();
  private canvasReady = false;
  private pendingLayout: SceneLayout | null = null;
  private loadGen = 0;

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.engine = new SceneEngine(canvas, { reducedMotion: this.reducedMotion });
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
  }

  ngOnDestroy(): void {
    this.engine?.dispose();
    this.engine = null;
  }

  retry(): void {
    this.load();
  }

  useMock(): void {
    try {
      localStorage.setItem(ADMIN_3D_MOCK_KEY, '1');
    } catch {
      /* ignore */
    }
    this.load();
  }

  private load(): void {
    const gen = ++this.loadGen;
    this.loading.set(true);
    this.error.set('');
    this.empty.set(false);

    const mock = isAdmin3dMockEnabled(this.route.snapshot.queryParamMap.get('mock'));
    if (mock) {
      this.cacheProducts(admin3dFixtureProducts());
      this.applyInputs(admin3dFixtureSceneCollections(), admin3dFixtureSceneProducts(), true, gen);
      return;
    }

    if (!this.adminCatalog.useApi) {
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
    const ref = this.dialog.open<Product | undefined, ProductEditModalData, ProductEditModal>(
      ProductEditModal,
      {
        data: { slug, product: this.productsBySlug.get(slug) },
        panelClass: 'lc-product-edit-dialog',
        backdropClass: 'lc-product-edit-backdrop',
        autoFocus: 'first-tabbable',
      },
    );
    ref.closed.subscribe((saved) => {
      if (saved) this.applySaved(saved);
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
