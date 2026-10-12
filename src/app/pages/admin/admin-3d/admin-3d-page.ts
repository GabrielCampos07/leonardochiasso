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
import { catchError, of, switchMap } from 'rxjs';
import { AdminCatalogService, adminHttpErrorMessage, uniqueAdminSlug } from '../../../core/admin-catalog.service';
import { formatCollectionCreateError, validateCreateCollection } from '../../../core/admin-collection-create';
import {
  AdminCollectionProductsService,
  addPieceStaggerDelay,
  appendCollectionProductSlugs,
} from '../../../core/admin-collection-products';
import { AdminCollectionDto, AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { ToastService } from '../../../core/feedback/toast.service';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { AdminViewModeService } from '../../../core/admin-view-mode.service';
import { mapApiProduct } from '../../../core/catalog.service';
import { ContentAdminService } from '../../../core/content-admin.service';
import { JoiaPiece } from '../../../core/joias.data';
import { formatPriceLabel, Product } from '../../../core/product.model';
import { CollectionSlug } from '../../../core/routes';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';
import { leaveAdmin3dToList } from '../../../core/admin-return-url';
import { environment } from '../../../../environments/environment';
import { OVERVIEW_FOCUS_ID, rackNavItems, stepRackIndex } from '../../../scene-engine/camera-guide';
import { DRAFT_PLACEHOLDER_NAME, DRAFT_UNIT_ID } from '../../../scene-engine/unit-layout';
import {
  mapAtelierToScene,
  replaceHanger,
  resolveProductRackId,
  toSceneHanger,
  unitsOfKind,
} from '../../../scene-engine/mapping';
import { apiProductToSceneInput, joiaToSceneInput, productToSceneInput } from '../../../scene-engine/from-catalog';
import { formatHangerTooltip } from '../../../scene-engine/hanger-price';
import { clampTooltip, mergeProductPhotos } from '../../../scene-engine/photo-url';
import { createSceneEngine, SceneEngine } from '../../../scene-engine/scene-engine';
import type {
  SceneCollectionInput,
  SceneLayout,
  SceneProductInput,
  SceneRack,
  SceneUnitKind,
} from '../../../scene-engine/types';
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
import { Admin3dPrefetchService } from './admin-3d-prefetch';
import { blankAtelierJoia, blankAtelierProduct, collectionSlugFromUnitId, uniqueJoiaSlug } from './atelier-blank';
import {
  CollectionAddPiecePanel,
  type AddPieceCreatePayload,
  type AddPieceItemError,
} from './collection-add-piece-panel';
import { CollectionCreatePanel } from './collection-create-panel';
import { JoiaEditModal, JoiaEditModalData } from './joia-edit-modal';
import {
  PRODUCT_EDIT_MODAL_TITLE_ID,
  ProductEditModal,
  ProductEditModalData,
} from './product-edit-modal';

export type AtelierLine = 'roupas' | 'joias';

export { ADMIN_3D_MOCK_KEY, isAdmin3dMockEnabled } from './admin-3d-guards';

const HINT_AUTO_HIDE_MS = 5000;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function isCreateSheetViewport(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
): boolean {
  return width <= 768;
}

export function clampCreatePanel(
  x: number,
  y: number,
  viewport = typeof window === 'undefined'
    ? { width: 1280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight },
): { x: number; y: number } {
  const width = 280;
  const height = 320;
  const compact = viewport.width <= 768;
  const maxX = Math.max(8, viewport.width - width - 8);
  const maxY = Math.max(8, viewport.height - height - (compact ? 96 : 24));
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, compact ? 72 : y), maxY),
  };
}

@Component({
  selector: 'lc-admin-3d-page',
  standalone: true,
  imports: [CollectionCreatePanel, CollectionAddPiecePanel],
  templateUrl: './admin-3d-page.html',
  styleUrl: './admin-3d-page.scss',
})
export class Admin3dPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sceneHost') private sceneHostRef?: ElementRef<HTMLElement>;
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild(CollectionAddPiecePanel) private addPanel?: CollectionAddPiecePanel;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly collectionsApi = inject(AdminCollectionsApiService);
  private readonly collectionProducts = inject(AdminCollectionProductsService);
  private readonly contentAdmin = inject(ContentAdminService);
  private readonly joiasAdmin = inject(AdminJoiasCatalogService);
  private readonly viewMode = inject(AdminViewModeService);
  private readonly boot = inject(Admin3dBootService);
  private readonly toast = inject(ToastService);
  private readonly prefetch = inject(Admin3dPrefetchService);

  readonly loading = signal(true);
  readonly firstFrame = signal(false);
  readonly bootFading = signal(false);
  readonly error = signal('');
  readonly empty = signal(false);
  readonly usingMock = signal(false);
  readonly allowMock = !environment.production;
  readonly hoverTip = signal<{ text: string; x: number; y: number } | null>(null);
  readonly line = signal<AtelierLine>('roupas');
  readonly showHint = signal(true);
  readonly webglUnavailable = signal(false);
  readonly showBoot = computed(
    () =>
      !this.webglUnavailable() &&
      !this.error() &&
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
  readonly creating = signal(false);
  readonly createName = signal('');
  readonly createLine = signal<AtelierLine>('roupas');
  readonly createError = signal('');
  readonly createSaving = signal(false);
  readonly createPanel = signal<{ x: number; y: number }>({ x: 24, y: 24 });
  readonly createSheet = signal(isCreateSheetViewport());
  readonly activeUnit = computed(() => {
    this.layoutRev();
    if (this.creating()) return null;
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID) return null;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const unit = unitsOfKind(this.layout, kind).find((r) => r.id === id);
    if (!unit) return null;
    return { id: unit.id, name: unit.name, kind: unit.kind, hangers: unit.hangers.length };
  });
  readonly showAddPieceButton = computed(() => Boolean(this.activeUnit()) && !this.adding());
  readonly adding = signal(false);
  readonly addSaving = signal(false);
  readonly addCandidates = signal<{ slug: string; name: string }[]>([]);
  readonly addUnitName = signal('');
  readonly addSheet = signal(isCreateSheetViewport());
  readonly addCount = signal(0);
  readonly addErrors = signal<AddPieceItemError[]>([]);
  readonly addCreateError = signal('');
  readonly addAnchor = signal<{ x: number; y: number } | null>(null);
  readonly addCanUpload = true;
  readonly addPriceRequired = computed(() => this.line() !== 'joias');

  private engine: SceneEngine | null = null;
  private layout: SceneLayout = { racks: [] };
  private collections: SceneCollectionInput[] = [];
  private knownRackIds = new Set<string>();
  private productsBySlug = new Map<string, Product>();
  private joiasBySlug = new Map<string, JoiaPiece>();
  private canvasReady = false;
  private pendingLayout: SceneLayout | null = null;
  private loadGen = 0;
  private hintTimer = 0;
  private bootFadeTimer = 0;
  private modalOpen = false;
  private readonly layoutRev = signal(0);
  private addTimers: number[] = [];

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      this.boot.markFirstFrame();
      return;
    }
    this.engine = createSceneEngine(canvas, {
      reducedMotion: this.reducedMotion,
      host: this.sceneHostRef?.nativeElement ?? canvas.parentElement ?? canvas,
    });
    if (!this.engine) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      this.boot.markFirstFrame();
      return;
    }
    this.engine.onClick((slug) => this.openEditor(slug));
    this.engine.onEmptyUnit((id) => this.openAddPanel(id));
    this.engine.onHover((slug, pointer) => this.setHoverTip(slug, pointer));
    this.engine.onFocusChange((id) => {
      this.focusedId.set(id);
      this.refreshAddAnchor();
    });
    this.engine.onFirstFrame(() => this.markFirstFrame());
    this.engine.onSceneComplete(() => this.markSceneComplete());
    this.engine.onDraftAnchor((point) => {
      if (point && !this.createSheet()) this.createPanel.set(clampCreatePanel(point.x, point.y));
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
    if (this.bootFadeTimer) window.clearTimeout(this.bootFadeTimer);
    this.clearAddTimers();
    this.engine?.dispose();
    this.engine = null;
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onViewport(): void {
    this.createSheet.set(isCreateSheetViewport());
    this.addSheet.set(isCreateSheetViewport());
    this.engine?.resize();
    this.refreshAddAnchor();
  }

  @HostListener('window:keydown', ['$event'])
  onGuideKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.adding() && !this.modalOpen) {
      event.preventDefault();
      this.cancelAddPiece();
      return;
    }
    if (event.key === 'Escape' && this.creating() && !this.modalOpen) {
      event.preventDefault();
      this.cancelCreate();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (this.creating() || this.adding()) return;
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.error()) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (this.modalOpen || document.querySelector('.lc-product-edit-dialog')) return;
    event.preventDefault();
    this.stepRack(event.key === 'ArrowLeft' ? -1 : 1);
  }

  focusRack(id: string): void {
    if (this.creating() || this.adding()) return;
    this.engine?.focusRack(id, this.reducedMotion);
  }

  focusOverview(): void {
    if (this.creating() || this.adding()) return;
    this.engine?.focusOverview(this.reducedMotion);
  }

  setLine(line: AtelierLine): void {
    if (this.creating() || this.adding() || this.line() === line) return;
    this.line.set(line);
    this.syncVisibleLayout();
  }

  startCreate(): void {
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.modalOpen || this.adding()) return;
    this.hoverTip.set(null);
    this.createError.set('');
    this.createSaving.set(false);
    this.createName.set('');
    this.createLine.set(this.line());
    this.createSheet.set(isCreateSheetViewport());
    this.creating.set(true);
    this.empty.set(false);
    this.showDraftOutline();
  }

  onCreateName(name: string): void {
    this.createName.set(name);
    this.engine?.setDraftName(name.trim() || DRAFT_PLACEHOLDER_NAME);
  }

  onCreateLine(line: AtelierLine): void {
    if (this.createLine() === line) return;
    this.createLine.set(line);
    if (this.line() !== line) {
      this.line.set(line);
      this.syncVisibleLayout();
    }
    this.showDraftOutline();
  }

  saveCreate(): void {
    if (this.createSaving()) return;
    this.createError.set('');
    const checked = validateCreateCollection(this.createName(), this.collections);
    if (!checked.ok) {
      this.createError.set(checked.error);
      return;
    }
    const sortOrder = this.collections.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
    const payload = { ...checked.payload, sortOrder };
    const kind: SceneUnitKind = this.createLine() === 'joias' ? 'vitrine' : 'rack';

    if (
      this.usingMock() ||
      shouldUseLocalAdmin3dCatalog({
        production: environment.production,
        useApi: this.adminCatalog.useApi,
      })
    ) {
      this.finishCreate(
        {
          id: payload.slug,
          slug: payload.slug,
          name: payload.name,
          description: null,
          sortOrder,
          publishedAt: null,
        },
        kind,
      );
      return;
    }

    this.createSaving.set(true);
    this.collectionsApi.create(payload).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.finishCreate(created, kind);
      },
      error: (err) => {
        this.createSaving.set(false);
        this.createError.set(formatCollectionCreateError(err));
      },
    });
  }

  cancelCreate(): void {
    if (!this.creating() || this.createSaving()) return;
    this.engine?.clearDraft(this.reducedMotion);
    this.creating.set(false);
    this.createError.set('');
    const items = this.racks();
    if (items.length) this.focusRack(items[items.length - 1]!.id);
    else this.focusOverview();
    this.syncVisibleLayout();
  }

  addPieceToFocused(): void {
    const unit = this.activeUnit();
    if (unit) this.openAddPanel(unit.id);
  }

  confirmAddPieces(slugs: string[]): void {
    const unit = this.focusedUnit();
    if (!unit || !slugs.length || this.addSaving()) return;
    if (unit.kind === 'vitrine') {
      this.confirmAddJoias(unit, slugs);
      return;
    }
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    const current = unit.hangers.map((h) => h.slug);
    this.collectionProducts.remember(collectionSlug, current);
    this.addSaving.set(true);
    this.addErrors.set([]);

    if (this.usesLocalCatalog()) {
      this.finishAddBatch(unit, slugs, []);
      return;
    }

    this.collectionProducts.tryAppend(collectionSlug, slugs).subscribe({
      next: (batch) => this.finishAddBatch(unit, batch.added, batch.failed),
      error: (err) => {
        this.addSaving.set(false);
        this.addErrors.set(
          slugs.map((slug) => ({
            slug,
            message: adminHttpErrorMessage(err, 'Não foi possível adicionar as peças.'),
          })),
        );
      },
    });
  }

  createAndAdd(draft: AddPieceCreatePayload): void {
    const unit = this.focusedUnit();
    if (!unit || this.addSaving()) return;
    this.addCreateError.set('');
    this.addSaving.set(true);
    if (unit.kind === 'vitrine') {
      this.createAndAddJoia(unit, draft);
      return;
    }
    this.createAndAddProduct(unit, draft);
  }

  cancelAddPiece(): void {
    if (this.addSaving()) return;
    this.adding.set(false);
    this.addCandidates.set([]);
    this.addErrors.set([]);
    this.addCreateError.set('');
    this.addCount.set(0);
    this.addPanel?.resetCreate();
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
      this.cacheJoias(this.joiasAdmin.list());
      this.applyInputs(
        admin3dFixtureSceneCollections(),
        admin3dFixtureSceneProducts(),
        this.joiasAdmin.list().map(joiaToSceneInput),
        true,
        gen,
      );
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
      this.cacheJoias(this.joiasAdmin.list());
      this.applyInputs(
        collectionsFromLabels(),
        list.map(productToSceneInput),
        this.joiasAdmin.list().map(joiaToSceneInput),
        false,
        gen,
      );
      return;
    }

    this.prefetch.prefetchCatalog().subscribe({
      next: ({ collections, products, storefront, joias }) => {
        if (gen !== this.loadGen) return;
        const storefrontBySlug = new Map(storefront.map((p) => [p.slug, p]));
        const merged = products.map((dto) => mergeProductPhotos(dto, storefrontBySlug.get(dto.slug)));
        this.cacheProducts(merged.map(mapApiProduct));
        this.cacheJoias(joias);
        this.applyInputs(
          collections.map((c) => ({
            slug: c.slug,
            name: c.name,
            sortOrder: c.sortOrder,
          })),
          merged.map(apiProductToSceneInput),
          joias.map(joiaToSceneInput),
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
        this.boot.markFirstFrame();
      },
    });
  }

  private applyInputs(
    collections: SceneCollectionInput[],
    products: SceneProductInput[],
    joias: SceneProductInput[],
    mock: boolean,
    gen: number,
  ): void {
    if (gen !== this.loadGen) return;
    this.usingMock.set(mock);
    this.collections = collections;
    this.knownRackIds = new Set(collections.map((c) => c.slug));
    this.layout = mapAtelierToScene(collections, products, joias);
    this.rememberCollectionProducts();
    this.bumpLayout();
    this.loading.set(false);
    this.syncVisibleLayout();
  }

  private syncVisibleLayout(): void {
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const visible: SceneLayout = { racks: unitsOfKind(this.layout, kind) };
    this.racks.set(rackNavItems(visible.racks));
    this.empty.set(visible.racks.length === 0 && !this.creating());
    if (this.canvasReady && this.engine) {
      this.engine.setLayout(visible);
    } else {
      this.pendingLayout = visible;
    }
    this.refreshAddAnchor();
  }

  private showDraftOutline(): void {
    if (!this.engine) return;
    const kind: SceneUnitKind = this.createLine() === 'joias' ? 'vitrine' : 'rack';
    const point = this.engine.showDraft(
      kind,
      this.createName().trim() || DRAFT_PLACEHOLDER_NAME,
      this.reducedMotion,
    );
    if (!this.createSheet()) this.createPanel.set(clampCreatePanel(point.x, point.y));
    this.focusedId.set(DRAFT_UNIT_ID);
  }

  private finishCreate(created: AdminCollectionDto, kind: SceneUnitKind): void {
    const unit: SceneRack = {
      id: kind === 'vitrine' ? `vitrine:${created.slug}` : created.slug,
      name: created.name,
      sortOrder: created.sortOrder,
      hangers: [],
      kind,
    };
    this.knownRackIds.add(created.slug);
    this.collections = [
      ...this.collections,
      { slug: created.slug, name: created.name, sortOrder: created.sortOrder },
    ];
    this.layout = { racks: [...this.layout.racks, unit] };
    this.collectionProducts.remember(created.slug, []);
    this.line.set(kind === 'vitrine' ? 'joias' : 'roupas');
    this.creating.set(false);
    this.createError.set('');
    this.empty.set(false);
    this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
    this.engine?.commitDraft(unit, this.reducedMotion);
    this.focusedId.set(unit.id);
    this.toast.success('Coleção criada.');
    this.refreshAddAnchor();
  }

  private openAddPanel(unitId: string): void {
    if (this.creating() || this.modalOpen || this.addSaving()) return;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const unit = unitsOfKind(this.layout, kind).find((r) => r.id === unitId);
    if (!unit) return;
    if (this.focusedId() !== unit.id) this.engine?.focusRack(unit.id, this.reducedMotion);
    this.hoverTip.set(null);
    this.addUnitName.set(unit.name);
    this.addCandidates.set(this.piecesOutside(unit.id));
    this.addSheet.set(isCreateSheetViewport());
    this.addSaving.set(false);
    this.addErrors.set([]);
    this.addCreateError.set('');
    this.addCount.set(0);
    this.addPanel?.resetCreate();
    this.adding.set(true);
    this.refreshAddAnchor();
  }

  private openEditor(slug: string): void {
    if (this.creating() || this.adding()) return;
    this.hoverTip.set(null);
    this.modalOpen = true;
    const hanger = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === slug);
    if (hanger?.kind === 'jewelry') {
      const ref = this.dialog.open<JoiaPiece | undefined, JoiaEditModalData, JoiaEditModal>(JoiaEditModal, {
        data: { slug, piece: this.joiasBySlug.get(slug) },
        panelClass: 'lc-product-edit-dialog',
        backdropClass: 'lc-product-edit-backdrop',
        autoFocus: 'first-tabbable',
        restoreFocus: false,
        ariaLabelledBy: PRODUCT_EDIT_MODAL_TITLE_ID,
      });
      ref.closed.subscribe((saved) => {
        this.modalOpen = false;
        if (saved) this.applySavedJoia(saved);
        queueMicrotask(() => this.focusScene());
      });
      return;
    }
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
      this.modalOpen = false;
      if (saved) this.applySaved(saved);
      queueMicrotask(() => this.focusScene());
    });
  }

  private cacheProducts(products: Product[]): void {
    this.productsBySlug = new Map(products.map((p) => [p.slug, p]));
  }

  private cacheJoias(pieces: JoiaPiece[]): void {
    this.joiasBySlug = new Map(pieces.map((p) => [p.slug, p]));
  }

  private setHoverTip(slug: string | null, pointer?: { x: number; y: number }): void {
    if (this.modalOpen || this.creating() || !slug || !pointer) {
      this.hoverTip.set(null);
      return;
    }
    const hanger = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === slug);
    if (!hanger) {
      this.hoverTip.set(null);
      return;
    }
    const pos = clampTooltip(pointer.x, pointer.y, { width: 320, height: 48 });
    this.hoverTip.set({
      text: formatHangerTooltip(hanger.name, hanger.priceLabel),
      x: pos.x,
      y: pos.y,
    });
  }

  private markSceneComplete(): void {
    this.boot.markSceneComplete();
  }

  private markFirstFrame(): void {
    this.boot.markFirstFrame();
    this.firstFrame.set(true);
    if (this.reducedMotion) {
      this.bootFading.set(false);
      return;
    }
    this.bootFading.set(true);
    if (this.bootFadeTimer) window.clearTimeout(this.bootFadeTimer);
    this.bootFadeTimer = window.setTimeout(() => this.bootFading.set(false), 420);
  }

  private applySaved(product: Product, ontoRackId?: string, animate = false): void {
    this.productsBySlug.set(product.slug, product);
    const input = productToSceneInput(product);
    const rackId = ontoRackId ?? resolveProductRackId(input, this.knownRackIds);
    const existed = this.layout.racks.some((rack) => rack.hangers.some((h) => h.slug === product.slug));
    const hanger = toSceneHanger(input, rackId);
    this.layout = replaceHanger(this.layout, hanger);
    this.bumpLayout();
    const collectionSlug = collectionSlugFromUnitId(hanger.rackId);
    if (collectionSlug) {
      this.collectionProducts.remember(
        collectionSlug,
        appendCollectionProductSlugs(this.collectionProducts.current(collectionSlug), [hanger.slug]),
      );
    }
    if (animate && !existed) this.engine?.addHanger(hanger, this.reducedMotion);
    else this.engine?.updateHanger(hanger);
    this.refreshTip(hanger);
    this.refreshAddAnchor();
  }

  private focusedUnit(): SceneRack | null {
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID) return null;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    return unitsOfKind(this.layout, kind).find((r) => r.id === id) ?? null;
  }

  private piecesOutside(unitId: string): { slug: string; name: string }[] {
    const unit = this.layout.racks.find((r) => r.id === unitId);
    const taken = new Set(unit?.hangers.map((h) => h.slug) ?? []);
    if (unit?.kind === 'vitrine') {
      return [...this.joiasBySlug.values()]
        .filter((piece) => !taken.has(piece.slug))
        .map((piece) => ({ slug: piece.slug, name: piece.title }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return [...this.productsBySlug.values()]
      .filter((p) => !taken.has(p.slug))
      .map((p) => ({ slug: p.slug, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  private staggerAddedPieces(slugs: string[], rackId: string): void {
    this.clearAddTimers();
    slugs.forEach((slug, index) => {
      const product = this.productsBySlug.get(slug);
      if (!product) return;
      const wait = addPieceStaggerDelay(index);
      const timer = window.setTimeout(() => this.applySaved(product, rackId, true), wait);
      this.addTimers.push(timer);
    });
  }

  private staggerAddedJoias(slugs: string[], rackId: string): void {
    this.clearAddTimers();
    slugs.forEach((slug, index) => {
      const piece = this.joiasBySlug.get(slug);
      if (!piece) return;
      const wait = addPieceStaggerDelay(index);
      const timer = window.setTimeout(() => this.applySavedJoia(piece, rackId, true), wait);
      this.addTimers.push(timer);
    });
  }

  private rememberCollectionProducts(): void {
    for (const rack of this.layout.racks) {
      if (rack.kind !== 'rack') continue;
      const slug = collectionSlugFromUnitId(rack.id);
      if (slug) this.collectionProducts.remember(slug, rack.hangers.map((h) => h.slug));
    }
  }

  private bumpLayout(): void {
    this.layoutRev.update((n) => n + 1);
  }

  private clearAddTimers(): void {
    for (const timer of this.addTimers) window.clearTimeout(timer);
    this.addTimers = [];
  }

  private applySavedJoia(piece: JoiaPiece, ontoRackId?: string, animate = false): void {
    this.joiasBySlug.set(piece.slug, piece);
    const input = joiaToSceneInput(piece);
    const current = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === piece.slug);
    const existed = Boolean(current);
    const hanger = toSceneHanger(
      input,
      ontoRackId ?? current?.rackId ?? `vitrine:${input.collectionSlug || 'gioielli'}`,
    );
    this.layout = replaceHanger(this.layout, hanger);
    this.bumpLayout();
    if (animate && !existed) this.engine?.addHanger(hanger, this.reducedMotion);
    else this.engine?.updateHanger(hanger);
    this.refreshTip(hanger);
    this.refreshAddAnchor();
  }

  private confirmAddJoias(unit: SceneRack, slugs: string[]): void {
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    const added: string[] = [];
    const failed: AddPieceItemError[] = [];
    this.addSaving.set(true);
    for (const slug of slugs) {
      const piece = this.joiasBySlug.get(slug);
      if (!piece) {
        failed.push({ slug, message: 'Peça não encontrada.' });
        continue;
      }
      const next: JoiaPiece = { ...piece, collectionSlug: collectionSlug as CollectionSlug };
      this.joiasAdmin.save(next);
      this.joiasBySlug.set(next.slug, next);
      this.contentAdmin.patchContentField('joia', next.slug, 'collectionSlug', collectionSlug).subscribe({
        error: () => undefined,
      });
      added.push(slug);
    }
    this.finishAddBatch(unit, added, failed);
  }

  private finishAddBatch(unit: SceneRack, added: string[], failed: AddPieceItemError[]): void {
    this.addSaving.set(false);
    this.addErrors.set(failed);
    this.addPanel?.finishAdd(added);
    this.addCandidates.set(this.piecesOutside(unit.id));
    if (added.length) this.addCount.update((n) => n + added.length);
    if (unit.kind === 'vitrine') this.staggerAddedJoias(added, unit.id);
    else this.staggerAddedPieces(added, unit.id);
  }

  private createAndAddProduct(unit: SceneRack, draft: AddPieceCreatePayload): void {
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    const price = draft.price ?? 0;
    const product: Product = {
      ...blankAtelierProduct(collectionSlug),
      name: draft.name,
      slug: uniqueAdminSlug(draft.name, (slug) => this.adminCatalog.slugExists(slug) || this.productsBySlug.has(slug)),
      price,
      priceCents: Math.round(price * 100),
      priceLabel: formatPriceLabel(price),
      stockQty: draft.stock,
    };

    const afterCreate = (created: Product) => {
      this.productsBySlug.set(created.slug, created);
      if (this.usesLocalCatalog()) {
        this.collectionProducts.remember(
          collectionSlug,
          appendCollectionProductSlugs(this.collectionProducts.current(collectionSlug), [created.slug]),
        );
        this.finishCreatePiece(unit, created);
        return;
      }
      this.collectionProducts.append(collectionSlug, [created.slug]).subscribe({
        next: () => this.finishCreatePiece(unit, created),
        error: () => {
          this.collectionProducts.remember(
            collectionSlug,
            appendCollectionProductSlugs(this.collectionProducts.current(collectionSlug), [created.slug]),
          );
          this.finishCreatePiece(unit, created);
        },
      });
    };

    this.adminCatalog.saveProduct$(product, { isNew: true, details: [] }).pipe(
      switchMap((created) => this.attachCreatedPhoto$(created, draft.photo)),
    ).subscribe({
      next: afterCreate,
      error: (err) => {
        this.addSaving.set(false);
        this.addCreateError.set(adminHttpErrorMessage(err, 'Não foi possível criar a peça.'));
      },
    });
  }

  private createAndAddJoia(unit: SceneRack, draft: AddPieceCreatePayload): void {
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    const slug = uniqueJoiaSlug(draft.name, (value) => this.joiasAdmin.slugExists(value) || this.joiasBySlug.has(value));
    const piece: JoiaPiece = {
      ...blankAtelierJoia(collectionSlug),
      id: slug,
      slug,
      title: draft.name,
      price: draft.price,
      priceLabel: draft.price != null ? formatPriceLabel(draft.price) : 'Sob consulta',
    };

    const finish = (next: JoiaPiece) => {
      this.joiasAdmin.create(next);
      this.joiasBySlug.set(next.slug, next);
      this.contentAdmin.patchContentField('joia', next.slug, 'collectionSlug', collectionSlug).subscribe({
        error: () => undefined,
      });
      this.applySavedJoia(next, unit.id, true);
      this.addSaving.set(false);
      this.addCreateError.set('');
      this.addCount.update((n) => n + 1);
      this.addCandidates.set(this.piecesOutside(unit.id));
      this.addPanel?.resetCreate();
    };

    if (!draft.photo) {
      finish(piece);
      return;
    }
    this.contentAdmin.uploadImage$(draft.photo, draft.name).subscribe({
      next: (uploaded) => finish({ ...piece, image: uploaded.cdnUrl, images: [uploaded.cdnUrl] }),
      error: (err) => {
        this.addSaving.set(false);
        this.addCreateError.set(adminHttpErrorMessage(err, 'Não foi possível enviar a foto.'));
      },
    });
  }

  private attachCreatedPhoto$(product: Product, photo: File | null) {
    if (!photo) return of(product);
    if (this.adminCatalog.useApi) {
      return this.adminCatalog.uploadAndAttach$(product.slug, [photo]).pipe(
        catchError(() => of(product)),
      );
    }
    const url = URL.createObjectURL(photo);
    const withPhoto: Product = { ...product, thumb: url, gallery: [url, ...(product.gallery ?? [])] };
    this.adminCatalog.save(withPhoto);
    return of(withPhoto);
  }

  private finishCreatePiece(unit: SceneRack, product: Product): void {
    this.applySaved(product, unit.id, true);
    this.addSaving.set(false);
    this.addCreateError.set('');
    this.addCount.update((n) => n + 1);
    this.addCandidates.set(this.piecesOutside(unit.id));
    this.addPanel?.resetCreate();
  }

  private usesLocalCatalog(): boolean {
    return (
      this.usingMock() ||
      shouldUseLocalAdmin3dCatalog({
        production: environment.production,
        useApi: this.adminCatalog.useApi,
      })
    );
  }

  private refreshAddAnchor(): void {
    const unit = this.activeUnit();
    if (!unit || !this.engine) {
      this.addAnchor.set(null);
      return;
    }
    this.addAnchor.set(this.engine.unitScreenPoint(unit.id));
  }

  private refreshTip(hanger: { slug: string; name: string; priceLabel: string }): void {
    const tip = this.hoverTip();
    if (!tip) return;
    this.hoverTip.set({
      text: formatHangerTooltip(hanger.name, hanger.priceLabel),
      x: tip.x,
      y: tip.y,
    });
  }
}
