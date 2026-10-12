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
import { AdminCatalogService, adminHttpErrorMessage } from '../../../core/admin-catalog.service';
import {
  confirmArchiveCollection,
  isArchivedAt,
  showArchiveUndo,
} from '../../../core/admin-archive';
import { formatCollectionCreateError, validateCreateCollection } from '../../../core/admin-collection-create';
import { AdminCollectionDto, AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { ConfirmService } from '../../../core/feedback/confirm.service';
import { ToastService } from '../../../core/feedback/toast.service';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { AdminViewModeService } from '../../../core/admin-view-mode.service';
import { mapApiProduct } from '../../../core/catalog.service';
import { JoiaPiece } from '../../../core/joias.data';
import { Product } from '../../../core/product.model';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';
import { leaveAdmin3dToList } from '../../../core/admin-return-url';
import { environment } from '../../../../environments/environment';
import { OVERVIEW_FOCUS_ID, rackNavItems, stepRackIndex } from '../../../scene-engine/camera-guide';
import { DRAFT_PLACEHOLDER_NAME, DRAFT_UNIT_ID } from '../../../scene-engine/unit-layout';
import {
  mapAtelierToScene,
  removeHangerFromLayout,
  removeUnitFromLayout,
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
  UNCOLLECTED_RACK_ID,
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
import { blankAtelierJoia, blankAtelierProduct, collectionSlugFromUnitId } from './atelier-blank';
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
  imports: [CollectionCreatePanel],
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
  private readonly joiasAdmin = inject(AdminJoiasCatalogService);
  private readonly viewMode = inject(AdminViewModeService);
  private readonly boot = inject(Admin3dBootService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
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
  readonly canArchiveFocused = computed(() => {
    if (this.creating()) return false;
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID || id === UNCOLLECTED_RACK_ID) {
      return false;
    }
    return Boolean(collectionSlugFromUnitId(id));
  });

  readonly emptyUnit = computed(() => {
    if (this.creating() || this.modalOpen) return null;
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID) return null;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const unit = unitsOfKind(this.layout, kind).find((r) => r.id === id);
    if (!unit || unit.hangers.length > 0) return null;
    return { id: unit.id, name: unit.name, kind: unit.kind };
  });

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
    this.engine = createSceneEngine(canvas, { reducedMotion: this.reducedMotion });
    if (!this.engine) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      this.boot.markFirstFrame();
      return;
    }
    this.engine.onClick((slug) => this.openEditor(slug));
    this.engine.onEmptyUnit((id) => this.openAddPiece(id));
    this.engine.onHover((slug, pointer) => this.setHoverTip(slug, pointer));
    this.engine.onFocusChange((id) => this.focusedId.set(id));
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
    this.engine?.dispose();
    this.engine = null;
  }

  @HostListener('window:resize')
  onViewport(): void {
    this.createSheet.set(isCreateSheetViewport());
  }

  @HostListener('window:keydown', ['$event'])
  onGuideKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.creating() && !this.modalOpen) {
      event.preventDefault();
      this.cancelCreate();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (this.creating()) return;
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
    if (this.creating()) return;
    this.engine?.focusRack(id, this.reducedMotion);
  }

  focusOverview(): void {
    if (this.creating()) return;
    this.engine?.focusOverview(this.reducedMotion);
  }

  setLine(line: AtelierLine): void {
    if (this.creating() || this.line() === line) return;
    this.line.set(line);
    this.syncVisibleLayout();
  }

  startCreate(): void {
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.modalOpen) return;
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
    const unit = this.emptyUnit();
    if (unit) this.openAddPiece(unit.id);
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
    this.line.set(kind === 'vitrine' ? 'joias' : 'roupas');
    this.creating.set(false);
    this.createError.set('');
    this.empty.set(false);
    this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
    this.engine?.commitDraft(unit, this.reducedMotion);
    this.focusedId.set(unit.id);
    this.toast.success('Coleção criada.');
  }

  private openAddPiece(unitId: string): void {
    if (this.creating() || this.modalOpen) return;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const unit = unitsOfKind(this.layout, kind).find((r) => r.id === unitId);
    if (!unit) return;
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    this.hoverTip.set(null);
    this.modalOpen = true;
    if (unit.kind === 'vitrine') {
      const ref = this.dialog.open<JoiaPiece | undefined, JoiaEditModalData, JoiaEditModal>(JoiaEditModal, {
        data: {
          slug: 'nova',
          isNew: true,
          piece: blankAtelierJoia(collectionSlug),
        },
        panelClass: 'lc-product-edit-dialog',
        backdropClass: 'lc-product-edit-backdrop',
        autoFocus: 'first-tabbable',
        restoreFocus: false,
        ariaLabelledBy: PRODUCT_EDIT_MODAL_TITLE_ID,
      });
      ref.closed.subscribe((saved) => {
        this.modalOpen = false;
        if (saved && isArchivedAt(saved.archivedAt)) this.onJoiaArchived(saved);
        else if (saved) this.applySavedJoia(saved);
        queueMicrotask(() => this.focusScene());
      });
      return;
    }
    const ref = this.dialog.open<Product | undefined, ProductEditModalData, ProductEditModal>(
      ProductEditModal,
      {
        data: {
          slug: 'novo',
          isNew: true,
          product: blankAtelierProduct(collectionSlug),
        },
        panelClass: 'lc-product-edit-dialog',
        backdropClass: 'lc-product-edit-backdrop',
        autoFocus: 'first-tabbable',
        restoreFocus: false,
        ariaLabelledBy: PRODUCT_EDIT_MODAL_TITLE_ID,
      },
    );
    ref.closed.subscribe((saved) => {
      this.modalOpen = false;
      if (saved && isArchivedAt(saved.archivedAt)) this.onProductArchived(saved);
      else if (saved) this.applySaved(saved);
      queueMicrotask(() => this.focusScene());
    });
  }

  private openEditor(slug: string): void {
    if (this.creating()) return;
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
        if (saved && isArchivedAt(saved.archivedAt)) this.onJoiaArchived(saved);
        else if (saved) this.applySavedJoia(saved);
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
      if (saved && isArchivedAt(saved.archivedAt)) this.onProductArchived(saved);
      else if (saved) this.applySaved(saved);
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

  async archiveFocusedCollection(): Promise<void> {
    const id = this.focusedId();
    const slug = collectionSlugFromUnitId(id);
    if (!slug || id === UNCOLLECTED_RACK_ID) return;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const units = unitsOfKind(this.layout, kind).filter(
      (r) => collectionSlugFromUnitId(r.id) === slug,
    );
    if (!units.length) return;
    const pieceCount = units.reduce((n, u) => n + u.hangers.length, 0);
    const ok = await confirmArchiveCollection(this.confirm, pieceCount);
    if (!ok) return;
    this.collectionsApi.archive(slug).subscribe({
      next: () => {
        const snapshots = units.map((u) => structuredClone(u));
        for (const unit of units) {
          this.layout = removeUnitFromLayout(this.layout, unit.id);
          this.engine?.sinkUnit(unit.id, this.reducedMotion);
        }
        this.knownRackIds.delete(slug);
        this.collections = this.collections.filter((c) => c.slug !== slug);
        this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
        this.focusedId.set(OVERVIEW_FOCUS_ID);
        this.empty.set(unitsOfKind(this.layout, kind).length === 0);
        showArchiveUndo(this.toast, () => {
          this.collectionsApi.restore(slug).subscribe({
            next: (restored) => {
              this.knownRackIds.add(restored.slug);
              this.collections = [
                ...this.collections,
                { slug: restored.slug, name: restored.name, sortOrder: restored.sortOrder },
              ];
              this.layout = { racks: [...this.layout.racks, ...snapshots] };
              this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
              for (const snapshot of snapshots) this.engine?.restoreUnit(snapshot);
              this.empty.set(false);
              this.toast.success('Restaurado.');
            },
            error: (err) => {
              this.toast.error(adminHttpErrorMessage(err, 'Não foi possível restaurar.'));
            },
          });
        });
      },
      error: (err) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível arquivar.'));
      },
    });
  }

  private onProductArchived(product: Product): void {
    this.layout = removeHangerFromLayout(this.layout, product.slug);
    this.productsBySlug.delete(product.slug);
    this.engine?.removeHanger(product.slug, this.reducedMotion);
    this.hoverTip.set(null);
    showArchiveUndo(this.toast, () => {
      this.adminCatalog.restoreViaApi(product.slug).subscribe({
        next: (restored) => this.applySaved(restored),
        error: (err) => this.toast.error(adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
      });
    });
  }

  private onJoiaArchived(piece: JoiaPiece): void {
    this.layout = removeHangerFromLayout(this.layout, piece.slug);
    this.joiasBySlug.delete(piece.slug);
    this.engine?.removeHanger(piece.slug, this.reducedMotion);
    this.hoverTip.set(null);
    showArchiveUndo(this.toast, () => {
      this.joiasAdmin.restore(piece.slug).subscribe({
        next: (restored) => this.applySavedJoia(restored),
        error: (err) => this.toast.error(adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
      });
    });
  }

  private applySaved(product: Product): void {
    this.productsBySlug.set(product.slug, product);
    const input = productToSceneInput(product);
    const rackId = resolveProductRackId(input, this.knownRackIds);
    const hanger = toSceneHanger(input, rackId);
    this.layout = replaceHanger(this.layout, hanger);
    this.engine?.updateHanger(hanger);
    this.refreshTip(hanger);
  }

  private applySavedJoia(piece: JoiaPiece): void {
    this.joiasBySlug.set(piece.slug, piece);
    const input = joiaToSceneInput(piece);
    const current = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === piece.slug);
    const hanger = toSceneHanger(input, current?.rackId ?? `vitrine:${input.collectionSlug || 'gioielli'}`);
    this.layout = replaceHanger(this.layout, hanger);
    this.engine?.updateHanger(hanger);
    this.refreshTip(hanger);
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
