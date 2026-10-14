import { Dialog } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AdminCatalogService, adminHttpErrorMessage, uniqueAdminSlug } from '../../../core/admin-catalog.service';
import {
  archiveAwareError,
  confirmArchiveCollection,
  countActiveHangers,
  isArchivedAt,
  showArchiveUndo,
} from '../../../core/admin-archive';
import { formatCollectionCreateError, validateCreateCollection } from '../../../core/admin-collection-create';
import {
  AdminCollectionProductsService,
  addPieceStaggerDelay,
  appendCollectionProductSlugs,
} from '../../../core/admin-collection-products';
import { AdminCollectionDto, AdminCollectionsApiService } from '../../../core/admin-collections-api.service';
import { ConfirmService } from '../../../core/feedback/confirm.service';
import { ERROR_TOAST_MS, ToastService } from '../../../core/feedback/toast.service';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { AdminViewModeService } from '../../../core/admin-view-mode.service';
import { mapApiProduct } from '../../../core/catalog.service';
import { photoUploadErrorMessage } from '../../../core/photo-upload';
import { ContentAdminService } from '../../../core/content-admin.service';
import { JoiaPiece, joiaGallery } from '../../../core/joias.data';
import { formatPriceLabel, Product } from '../../../core/product.model';
import { CollectionSlug } from '../../../core/routes';
import { afterOverlayPaint } from '../../../core/after-overlay-paint';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';
import { leaveAdmin3dToList } from '../../../core/admin-return-url';
import { environment } from '../../../../environments/environment';
import {
  OVERVIEW_FOCUS_ID,
  collectionSwitcherItems,
  rackNavItems,
  stepRackIndex,
} from '../../../scene-engine/camera-guide';
import { EMPTY_RACK_PAN, rackArrowDelta } from '../../../scene-engine/rack-pan';
import { DRAFT_PLACEHOLDER_NAME, DRAFT_UNIT_ID } from '../../../scene-engine/unit-layout';
import {
  findHanger,
  insertUnitBeforeUncollected,
  isUnpublishedCollection,
  mapAtelierToScene,
  omitHanger,
  removeHangerFromLayout,
  removeUnitFromLayout,
  replaceHanger,
  resolveProductRackId,
  toSceneHanger,
  unitsOfKind,
} from '../../../scene-engine/mapping';
import { apiProductToSceneInput, joiaToSceneInput, productToSceneInput } from '../../../scene-engine/from-catalog';
import { formatHangerTooltip } from '../../../scene-engine/hanger-price';
import { clampTooltip } from '../../../scene-engine/photo-url';
import type { AtelierEngine } from '../../../scene-engine/engine-contract';
import type { StockroomEngine, StockroomOverlay } from '../../../scene-engine/stockroom/stockroom-engine';
import type {
  SceneCollectionInput,
  SceneLayout,
  SceneProductInput,
  SceneRack,
  SceneUnitKind,
} from '../../../scene-engine/types';
import { UNCOLLECTED_RACK_ID } from '../../../scene-engine/types';
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
  DESKTOP_ONLY_HINT,
  DESKTOP_ONLY_TITLE,
  STOCKROOM_HINT_COPY,
  adminSceneMode,
  isDesktopOnlyBlocked,
  isStockroomMode,
  sceneNeedsCredits,
} from './admin-3d-scene-mode';
import {
  admin3dFixtureProducts,
  admin3dFixtureSceneCollections,
  admin3dFixtureSceneProducts,
  collectionsFromLabels,
} from './admin-3d.fixtures';
import { Admin3dPrefetchService } from './admin-3d-prefetch';
import { catalogFingerprint, readCatalogSnapshot, writeCatalogSnapshot } from './catalog-snapshot';
import { blankAtelierJoia, blankAtelierProduct, collectionSlugFromUnitId, uniqueJoiaSlug } from './atelier-blank';
import {
  CollectionAddPiecePanel,
  buildAddPieceCandidates,
  type AddPieceCandidate,
  type AddPieceCreatePayload,
  type AddPieceItemError,
} from './collection-add-piece-panel';
import { CollectionCreatePanel } from './collection-create-panel';
import { StockroomCreditsPanel } from './stockroom-credits-panel';
import {
  PIECE_ORDER_SAVE_ERROR,
  REORDER_AUTOSCROLL_MS,
  REORDER_DRAG_THRESHOLD_PX,
  autoScrollDelta,
  dropIndexForSlug,
  dropTargetSlug,
  moveSlug,
  moveSlugById,
  reorderRackHangers,
  sameSlugOrder,
  type PieceRect,
} from './stockroom-piece-order';
import { JoiaEditModal, JoiaEditModalData } from './joia-edit-modal';
import {
  PRODUCT_EDIT_MODAL_TITLE_ID,
  ProductEditModal,
  ProductEditModalData,
} from './product-edit-modal';

export type AtelierLine = 'roupas' | 'joias';

export { ADMIN_3D_MOCK_KEY, isAdmin3dMockEnabled } from './admin-3d-guards';

export const HINT_AUTO_HIDE_MS = 5000;
/** Visible hint only — dismiss is aria-label so "Fechar" cannot leak into the copy. */
export const ATELIER_HINT_COPY = 'Clique · arraste · ← → · scroll';

/** Same stockroom line for `/admin/3d`, `?cc0=1` and `?sketchfab=1`. */
export function gestureHintCopy(mode: ReturnType<typeof adminSceneMode>): string {
  return isStockroomMode(mode) ? STOCKROOM_HINT_COPY : ATELIER_HINT_COPY;
}

/** Count the 5s hide from the first painted frame, not from boot, so a slow kit still shows the hint. */
export function armHintAutoHide(hide: () => void): number {
  return window.setTimeout(hide, HINT_AUTO_HIDE_MS);
}

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

/** Bottom-bar counter: "2/5" on a collection, the total on the overview. */
export function rackCounterLabel(items: ReadonlyArray<{ id: string }>, focusedId: string): string {
  if (!items.length) return '0/0';
  const at = items.findIndex((item) => item.id === focusedId);
  return at < 0 ? `${items.length}` : `${at + 1}/${items.length}`;
}

export interface StockroomTitle {
  name: string;
  detail: string;
  unpublished: boolean;
}

/** Title strip above the stockroom canvas: the focused collection, or the room on the overview. */
export function stockroomTitle(
  racks: ReadonlyArray<Pick<SceneRack, 'id' | 'name' | 'hangers' | 'unpublished'>>,
  focusedId: string,
  draftName = '',
): StockroomTitle {
  if (focusedId === OVERVIEW_FOCUS_ID) {
    return { name: 'Todas as coleções', detail: racks.length === 1 ? '1 coleção' : `${racks.length} coleções`, unpublished: false };
  }
  if (focusedId === DRAFT_UNIT_ID) {
    return { name: draftName.trim() || DRAFT_PLACEHOLDER_NAME, detail: '0 peças', unpublished: true };
  }
  const rack = racks.find((r) => r.id === focusedId);
  const count = rack?.hangers.length ?? 0;
  return {
    name: rack?.name ?? 'Coleção',
    detail: count === 1 ? '1 peça' : `${count} peças`,
    unpublished: rack?.unpublished === true,
  };
}

/** Click slug → edit modal. Blocked only while creating / adding pieces. */
export function pieceModalFromHangerClick(
  slug: string | null,
  blockers: { creating?: boolean; adding?: boolean } = {},
): { open: true; slug: string } | { open: false } {
  if (!slug || blockers.creating || blockers.adding) return { open: false };
  return { open: true, slug };
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
  imports: [CollectionCreatePanel, CollectionAddPiecePanel, StockroomCreditsPanel],
  templateUrl: './admin-3d-page.html',
  styleUrl: './admin-3d-page.scss',
})
export class Admin3dPage implements AfterViewInit, OnDestroy {
  @ViewChild('sceneHost') private sceneHostRef?: ElementRef<HTMLElement>;
  @ViewChild('stage') private stageRef?: ElementRef<HTMLElement>;
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('creditsButton') readonly creditsButtonRef?: ElementRef<HTMLButtonElement>;
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
  private readonly confirm = inject(ConfirmService);
  private readonly prefetch = inject(Admin3dPrefetchService);

  readonly loading = signal(true);
  readonly firstFrame = signal(false);
  readonly bootFading = signal(false);
  readonly sceneProgress = signal(0);
  readonly bootPercent = computed(() => Math.round(this.sceneProgress() * 100));
  readonly error = signal('');
  readonly empty = signal(false);
  readonly usingMock = signal(false);
  readonly allowMock = !environment.production;
  readonly hoverTip = signal<{ text: string; x: number; y: number } | null>(null);
  readonly line = signal<AtelierLine>('roupas');
  readonly showHint = signal(true);
  readonly sceneMode = adminSceneMode(this.route.snapshot.queryParamMap);
  /** Stockroom: nav in a fixed bar under the canvas, names and captions as HTML labels. */
  readonly stockroom = isStockroomMode(this.sceneMode);
  readonly overlay = signal<StockroomOverlay | null>(null);
  readonly hintCopy = gestureHintCopy(this.sceneMode);
  readonly viewportWidth = signal(typeof window === 'undefined' ? 1280 : window.innerWidth);
  readonly desktopOnly = computed(() => isDesktopOnlyBlocked(this.sceneMode, this.viewportWidth()));
  readonly desktopOnlyTitle = DESKTOP_ONLY_TITLE;
  readonly desktopOnlyHint = DESKTOP_ONLY_HINT;
  readonly hasCredits = sceneNeedsCredits(this.sceneMode);
  readonly creditsOpen = signal(false);
  readonly pieceDrag = signal<{ slug: string; x: number; y: number; over: string | null } | null>(null);
  readonly webglUnavailable = signal(false);
  readonly showBoot = computed(
    () =>
      !this.webglUnavailable() &&
      !this.desktopOnly() &&
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
  private readonly panTick = signal(0);
  readonly atFirst = computed(() => {
    this.panTick();
    const items = this.racks();
    const id = this.focusedId();
    return id !== OVERVIEW_FOCUS_ID && items[0]?.id === id && (this.stockroom || !this.engine?.canPan(-1));
  });
  readonly atLast = computed(() => {
    this.panTick();
    const items = this.racks();
    const id = this.focusedId();
    return (
      id !== OVERVIEW_FOCUS_ID && items[items.length - 1]?.id === id && (this.stockroom || !this.engine?.canPan(1))
    );
  });
  readonly rackCounter = computed(() => rackCounterLabel(this.racks(), this.focusedId()));
  readonly focusedUnpublished = computed(() => {
    this.layoutRev();
    const id = this.focusedId();
    return this.layout.racks.some((r) => r.id === id && r.unpublished === true);
  });
  readonly stageTitle = computed(() => {
    this.layoutRev();
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    return stockroomTitle(unitsOfKind(this.layout, kind), this.focusedId(), this.createName());
  });
  readonly rackPan = computed(() => {
    this.panTick();
    this.focusedId();
    this.layoutRev();
    return this.engine?.rackPanState() ?? EMPTY_RACK_PAN;
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
  readonly moreOpen = signal(false);
  readonly switcherOpen = signal(false);
  readonly focusedName = computed(() => {
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID) return 'Todas';
    return this.racks().find((rack) => rack.id === id)?.name ?? 'Coleção';
  });
  readonly switcherItems = computed(() => collectionSwitcherItems(this.racks()));
  readonly adding = signal(false);
  readonly canArchiveFocused = computed(() => {
    if (this.creating() || this.adding()) return false;
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID || id === UNCOLLECTED_RACK_ID) {
      return false;
    }
    return Boolean(collectionSlugFromUnitId(id));
  });
  readonly addSaving = signal(false);
  readonly addCandidates = signal<AddPieceCandidate[]>([]);
  readonly addUnitName = signal('');
  readonly addSheet = signal(isCreateSheetViewport());
  readonly addCount = signal(0);
  readonly addErrors = signal<AddPieceItemError[]>([]);
  readonly addCreateError = signal('');
  private pendingCreatedProduct: Product | null = null;
  readonly addCanUpload = true;
  readonly addPriceRequired = computed(() => this.line() !== 'joias');

  private engine: AtelierEngine | null = null;
  private booting = false;
  private layout: SceneLayout = { racks: [] };
  private collections: SceneCollectionInput[] = [];
  private knownRackIds = new Set<string>();
  private productsBySlug = new Map<string, Product>();
  private joiasBySlug = new Map<string, JoiaPiece>();
  private canvasReady = false;
  private pendingLayout: SceneLayout | null = null;
  private loadGen = 0;
  private lastCatalogFp = '';
  private hintTimer = 0;
  private bootFadeTimer = 0;
  private modalOpen = false;
  private readonly layoutRev = signal(0);
  private addTimers: number[] = [];
  private readonly addingSlugs = new Set<string>();
  private paintToken = 0;
  private pieceDragStart: { slug: string; x: number; y: number; pointerId: number } | null = null;
  private pieceDragMoved = false;
  private pieceScrollTimer = 0;

  ngAfterViewInit(): void {
    const token = ++this.paintToken;
    afterOverlayPaint(() => {
      if (token !== this.paintToken) return;
      this.load();
      void this.bootScene();
    });
  }

  ngOnDestroy(): void {
    this.paintToken += 1;
    if (this.hintTimer) window.clearTimeout(this.hintTimer);
    if (this.bootFadeTimer) window.clearTimeout(this.bootFadeTimer);
    this.stopPieceScroll();
    this.clearAddTimers();
    this.engine?.dispose();
    this.engine = null;
  }

  private async bootScene(): Promise<void> {
    if (this.desktopOnly()) {
      this.boot.markFirstFrame();
      return;
    }
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      this.boot.markFirstFrame();
      return;
    }
    if (this.engine || this.booting) return;
    this.booting = true;
    const host =
      (this.stockroom ? this.stageRef?.nativeElement : this.sceneHostRef?.nativeElement) ??
      canvas.parentElement ??
      canvas;
    const opts = { reducedMotion: this.reducedMotion, host };
    try {
      if (this.stockroom) {
        const { createStockroomEngine } = await import('../../../scene-engine/stockroom/stockroom-engine');
        if (!this.engine) {
          const stockroom: StockroomEngine | null = createStockroomEngine(canvas, opts);
          stockroom?.onOverlay((frame) => this.overlay.set(frame));
          this.engine = stockroom;
        }
      } else {
        const { createSceneEngine } = await import('../../../scene-engine/scene-engine');
        if (!this.engine) this.engine = createSceneEngine(canvas, opts);
      }
    } finally {
      this.booting = false;
    }
    if (!this.engine) {
      this.webglUnavailable.set(true);
      this.loading.set(false);
      this.boot.markFirstFrame();
      return;
    }
    this.engine.onClick((slug) => this.openEditor(slug));
    this.engine.onEmptyUnit((id) => {
      if (this.adding()) return;
      this.openAddPanel(id);
    });
    this.engine.onHover((slug, pointer) => this.setHoverTip(slug, pointer));
    this.engine.onFocusChange((id) => {
      this.focusedId.set(id);
    });
    this.engine.onFirstFrame(() => this.markFirstFrame());
    this.engine.onSceneComplete(() => this.markSceneComplete());
    this.engine.onPanChange(() => this.panTick.update((n) => n + 1));
    this.engine.onLoadProgress((loaded, total) => {
      this.sceneProgress.set(total > 0 ? Math.min(1, loaded / total) : 0);
    });
    this.engine.onDraftAnchor((point) => {
      if (point && !this.createSheet()) this.createPanel.set(clampCreatePanel(point.x, point.y));
    });
    this.engine.start();
    this.canvasReady = true;
    if (this.pendingLayout) {
      this.engine.setLayout(this.pendingLayout);
      this.pendingLayout = null;
    }
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onViewport(): void {
    const wasBlocked = this.desktopOnly();
    this.viewportWidth.set(window.innerWidth);
    if (wasBlocked && !this.desktopOnly() && !this.engine) void this.bootScene();
    this.createSheet.set(isCreateSheetViewport());
    this.addSheet.set(isCreateSheetViewport());
    this.engine?.resize();
  }

  @HostListener('window:keydown', ['$event'])
  onGuideKey(event: KeyboardEvent): void {
    if (this.creditsOpen()) return;
    if (event.key === 'Escape' && this.switcherOpen()) {
      event.preventDefault();
      this.switcherOpen.set(false);
      return;
    }
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
    const arrow = rackArrowDelta(event.key);
    if (!arrow) return;
    if (event.altKey) {
      const slug = (event.target as HTMLElement | null)?.closest?.('[data-slug]')?.getAttribute('data-slug');
      if (slug) {
        event.preventDefault();
        this.movePieceByKey(slug, arrow);
      }
      return;
    }
    if (this.creating() || this.adding()) return;
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.error()) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (this.modalOpen || document.querySelector('.lc-product-edit-dialog')) return;
    event.preventDefault();
    this.stepRack(arrow);
  }

  /** Enter / Space on a captioned piece opens it like a click on its photo. */
  openPieceFromKey(event: Event, slug: string): void {
    event.preventDefault();
    this.openEditor(slug);
  }

  onPiecePointerDown(event: PointerEvent, slug: string): void {
    if (!this.stockroom || event.button !== 0 || this.creating() || this.adding() || this.modalOpen) return;
    this.pieceDragStart = { slug, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    this.pieceDragMoved = false;
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onPiecePointerMove(event: PointerEvent): void {
    const start = this.pieceDragStart;
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!this.pieceDragMoved && Math.hypot(dx, dy) < REORDER_DRAG_THRESHOLD_PX) return;
    this.pieceDragMoved = true;
    const stage = this.stageRef?.nativeElement.getBoundingClientRect();
    const localX = event.clientX - (stage?.left ?? 0);
    const localY = event.clientY - (stage?.top ?? 0);
    const over = dropTargetSlug(localX, localY, this.pieceRects(), start.slug);
    this.pieceDrag.set({ slug: start.slug, x: localX, y: localY, over });
    this.tickPieceScroll(event.clientX);
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onPiecePointerUp(event: PointerEvent): void {
    const start = this.pieceDragStart;
    if (!start || event.pointerId !== start.pointerId) return;
    const drag = this.pieceDrag();
    this.pieceDragStart = null;
    this.stopPieceScroll();
    this.pieceDrag.set(null);
    if (!this.pieceDragMoved) {
      this.openEditor(start.slug);
      return;
    }
    if (!drag?.over) return;
    this.commitPieceMove(start.slug, drag.over);
  }

  pieceDragTransform(piece: { slug: string; x: number; y: number; w: number; h: number }): string | null {
    const drag = this.pieceDrag();
    if (!drag || drag.slug !== piece.slug) return null;
    return `translate(${drag.x - piece.x - piece.w / 2}px, ${drag.y - piece.y - piece.h / 2}px)`;
  }

  movePieceByKey(slug: string, delta: -1 | 1): void {
    const rack = this.layout.racks.find((r) => r.hangers.some((h) => h.slug === slug));
    if (!rack) return;
    const slugs = rack.hangers.map((h) => h.slug);
    const next = moveSlugById(slugs, slug, delta);
    if (!next) return;
    this.applyAndSavePieceOrder(rack.id, slugs, next);
  }

  private pieceRects(): PieceRect[] {
    return (this.overlay()?.pieces ?? []).map((p) => ({ slug: p.slug, x: p.x, y: p.y, w: p.w, h: p.h }));
  }

  private tickPieceScroll(clientX: number): void {
    const stage = this.stageRef?.nativeElement.getBoundingClientRect();
    const pan = this.rackPan();
    const pieces = this.layout.racks.find((r) => r.id === this.focusedId())?.hangers.length ?? 0;
    const delta = stage
      ? autoScrollDelta(clientX, stage.left, stage.width, pieces, pan.canPrev, pan.canNext)
      : 0;
    if (!delta) {
      this.stopPieceScroll();
      return;
    }
    if (this.pieceScrollTimer) return;
    const step = (): void => {
      this.engine?.panRack(delta);
      this.pieceScrollTimer = window.setTimeout(step, REORDER_AUTOSCROLL_MS);
    };
    this.engine?.panRack(delta);
    this.pieceScrollTimer = window.setTimeout(step, REORDER_AUTOSCROLL_MS);
  }

  private stopPieceScroll(): void {
    if (this.pieceScrollTimer) window.clearTimeout(this.pieceScrollTimer);
    this.pieceScrollTimer = 0;
  }

  private commitPieceMove(fromSlug: string, overSlug: string): void {
    const rack = this.layout.racks.find((r) => r.hangers.some((h) => h.slug === fromSlug));
    if (!rack) return;
    const slugs = rack.hangers.map((h) => h.slug);
    const from = slugs.indexOf(fromSlug);
    const to = dropIndexForSlug(slugs, overSlug);
    if (from < 0 || to === null || from === to) return;
    const next = moveSlug(slugs, from, to);
    if (sameSlugOrder(slugs, next)) return;
    this.applyAndSavePieceOrder(rack.id, slugs, next);
  }

  private applyAndSavePieceOrder(rackId: string, previous: readonly string[], next: readonly string[]): void {
    const collectionSlug = collectionSlugFromUnitId(rackId);
    if (!collectionSlug || rackId === UNCOLLECTED_RACK_ID) return;
    const layout = reorderRackHangers(this.layout, rackId, next);
    if (!layout) return;
    this.layout = layout;
    this.engine?.reorderHangers?.(rackId, next);
    this.bumpLayout();
    this.collectionProducts.remember(collectionSlug, next);
    this.collectionProducts.replace(collectionSlug, next).subscribe({
      error: (err: unknown) => {
        this.toast.error(adminHttpErrorMessage(err, PIECE_ORDER_SAVE_ERROR), { durationMs: ERROR_TOAST_MS });
        const rolled = reorderRackHangers(this.layout, rackId, previous);
        if (rolled) {
          this.layout = rolled;
          this.engine?.reorderHangers?.(rackId, previous);
          this.collectionProducts.remember(collectionSlug, previous);
          this.bumpLayout();
        }
      },
    });
  }

  focusRack(id: string): void {
    if (this.creating() || this.adding()) return;
    this.switcherOpen.set(false);
    this.moreOpen.set(false);
    this.engine?.focusRack(id, this.reducedMotion);
  }

  focusOverview(): void {
    if (this.creating() || this.adding()) return;
    this.moreOpen.set(false);
    this.switcherOpen.set(false);
    this.engine?.focusOverview(this.reducedMotion);
  }

  openCredits(): void {
    this.moreOpen.set(false);
    this.switcherOpen.set(false);
    this.setHoverTip(null);
    this.creditsOpen.set(true);
  }

  closeCredits(): void {
    this.creditsOpen.set(false);
  }

  toggleMore(event?: Event): void {
    event?.stopPropagation();
    this.switcherOpen.set(false);
    this.moreOpen.update((open) => !open);
  }

  closeMore(): void {
    this.moreOpen.set(false);
    this.switcherOpen.set(false);
  }

  toggleSwitcher(event?: Event): void {
    event?.stopPropagation();
    if (this.creating() || this.adding() || !this.racks().length) return;
    this.moreOpen.set(false);
    this.switcherOpen.update((open) => !open);
  }

  pickCollection(id: string): void {
    this.switcherOpen.set(false);
    this.moreOpen.set(false);
    if (id === OVERVIEW_FOCUS_ID) this.focusOverview();
    else this.focusRack(id);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.moreOpen()) this.moreOpen.set(false);
    if (this.switcherOpen()) this.switcherOpen.set(false);
  }

  setLine(line: AtelierLine): void {
    if (this.creating() || this.adding() || this.line() === line) return;
    this.line.set(line);
    this.syncVisibleLayout();
  }

  startCreate(): void {
    if (this.webglUnavailable() || this.loading() || !this.firstFrame() || this.modalOpen || this.adding()) return;
    this.moreOpen.set(false);
    this.switcherOpen.set(false);
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
    this.moreOpen.set(false);
    this.switcherOpen.set(false);
    const unit = this.activeUnit();
    if (unit) this.openAddPanel(unit.id);
  }

  confirmAddPieces(slugs: string[]): void {
    const unit = this.focusedUnit();
    if (!unit || !slugs.length) return;
    const incoming = slugs.filter(
      (slug) => !unit.hangers.some((h) => h.slug === slug) && !this.addingSlugs.has(slug),
    );
    if (!incoming.length) return;
    this.addErrors.update((errors) => errors.filter((item) => !incoming.includes(item.slug)));
    this.addPanel?.finishAdd(incoming);
    incoming.forEach((slug, index) => {
      this.addingSlugs.add(slug);
      const timer = window.setTimeout(() => this.addOneOptimistic(unit.id, slug), addPieceStaggerDelay(index));
      this.addTimers.push(timer);
    });
  }

  createAndAdd(draft: AddPieceCreatePayload): void {
    const unit = this.focusedUnit();
    if (!unit || this.addSaving()) return;
    this.addCreateError.set('');
    this.addSaving.set(true);
    if (this.pendingCreatedProduct && draft.photo) {
      this.retryCreatedPhoto(this.pendingCreatedProduct, draft.photo, unit);
      return;
    }
    if (unit.kind === 'vitrine') {
      this.createAndAddJoia(unit, draft);
      return;
    }
    this.createAndAddProduct(unit, draft);
  }

  cancelAddPiece(): void {
    this.adding.set(false);
    this.addCandidates.set([]);
    this.addErrors.set([]);
    this.addCreateError.set('');
    this.pendingCreatedProduct = null;
    this.addCount.set(0);
    this.addPanel?.resetCreate();
  }

  panFocused(delta: -1 | 1): void {
    if (this.creating() || this.adding()) return;
    if (this.engine?.panRack(delta)) this.panTick.update((n) => n + 1);
  }

  /** Stockroom arrows always change collection; bays inside one page with the rail buttons. */
  stepRack(delta: -1 | 1): void {
    if (!this.stockroom && this.engine?.panRack(delta)) {
      this.panTick.update((n) => n + 1);
      return;
    }
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
    this.sceneProgress.set(0);
    this.error.set('');
    this.empty.set(false);

    const mock = isAdmin3dMockEnabled({
      production: environment.production,
      envMock: environment.admin3dMock,
      queryMock: this.route.snapshot.queryParamMap.get('mock'),
      storageMock: readAdmin3dMockStorage(),
    });
    if (mock) {
      const full = this.route.snapshot.queryParamMap.get('mock') === 'full';
      this.cacheProducts(admin3dFixtureProducts(full));
      this.cacheJoias(this.joiasAdmin.list());
      this.applyInputs(
        admin3dFixtureSceneCollections(),
        admin3dFixtureSceneProducts(full),
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

    const snap = readCatalogSnapshot();
    if (snap) {
      this.applyInputs(snap.collections, snap.products, snap.joias, false, gen, { persist: false });
    }

    this.prefetch.prefetchCatalog().subscribe({
      next: ({ collections, products, joias }) => {
        if (gen !== this.loadGen) return;
        this.cacheProducts(products.map(mapApiProduct));
        this.cacheJoias(joias);
        this.applyInputs(
          collections.map((c) => ({
            slug: c.slug,
            name: c.name,
            sortOrder: c.sortOrder,
            publishedAt: c.publishedAt ?? null,
          })),
          products.map(apiProductToSceneInput),
          joias.map(joiaToSceneInput),
          false,
          gen,
          { persist: true },
        );
      },
      error: (err) => {
        if (gen !== this.loadGen) return;
        if (this.layout.racks.length) {
          this.loading.set(false);
          return;
        }
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
    opts: { persist?: boolean } = {},
  ): void {
    if (gen !== this.loadGen) return;
    const fp = catalogFingerprint(collections, products, joias);
    const sameScene = fp === this.lastCatalogFp && this.layout.racks.length > 0;
    this.lastCatalogFp = fp;
    this.usingMock.set(mock);
    this.collections = collections;
    this.knownRackIds = new Set(collections.map((c) => c.slug));
    this.layout = mapAtelierToScene(collections, products, joias);
    this.rememberCollectionProducts();
    this.bumpLayout();
    this.loading.set(false);
    if (opts.persist) writeCatalogSnapshot({ collections, products, joias });
    if (sameScene) {
      const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
      const visible: SceneLayout = { racks: unitsOfKind(this.layout, kind) };
      this.racks.set(rackNavItems(visible.racks));
      this.empty.set(visible.racks.length === 0 && !this.creating());
      return;
    }
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
      ...(isUnpublishedCollection(created) ? { unpublished: true } : {}),
    };
    this.knownRackIds.add(created.slug);
    this.collections = [
      ...this.collections,
      { slug: created.slug, name: created.name, sortOrder: created.sortOrder, publishedAt: created.publishedAt ?? null },
    ];
    this.layout = insertUnitBeforeUncollected(this.layout, unit);
    this.collectionProducts.remember(created.slug, []);
    this.line.set(kind === 'vitrine' ? 'joias' : 'roupas');
    this.creating.set(false);
    this.createError.set('');
    this.empty.set(false);
    this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
    this.engine?.commitDraft(unit, this.reducedMotion);
    this.focusedId.set(unit.id);
    this.toast.success('Coleção criada.');
  }

  private openAddPanel(unitId: string): void {
    if (this.creating() || this.adding() || this.modalOpen || this.addSaving()) return;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    const unit = unitsOfKind(this.layout, kind).find((r) => r.id === unitId);
    if (!unit) return;
    if (this.focusedId() !== unit.id) this.engine?.focusRack(unit.id, this.reducedMotion);
    this.hoverTip.set(null);
    this.addUnitName.set(unit.name);
    this.addCandidates.set(this.listAddCandidates(unit.id));
    this.addSheet.set(isCreateSheetViewport());
    this.addSaving.set(false);
    this.addErrors.set([]);
    this.addCreateError.set('');
    this.addCount.set(0);
    this.addPanel?.resetCreate();
    this.adding.set(true);
  }

  private openEditor(slug: string): void {
    if (this.modalOpen) return;
    const next = pieceModalFromHangerClick(slug, { creating: this.creating(), adding: this.adding() });
    if (!next.open) return;
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
    if (this.modalOpen || this.creating() || this.creditsOpen() || !slug || !pointer) {
      this.hoverTip.set(null);
      return;
    }
    const hanger = this.layout.racks.flatMap((r) => r.hangers).find((h) => h.slug === slug);
    const captioned = this.overlay()?.pieces.some((p) => p.slug === slug) ?? false;
    if (!hanger || captioned) {
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
    if (!this.hintTimer) this.hintTimer = armHintAutoHide(() => this.showHint.set(false));
    afterOverlayPaint(() => this.engine?.refitToChrome());
    const piece = this.route.snapshot.queryParamMap.get('piece');
    if (piece) {
      const aim = () => this.engine?.focusHanger(piece, true);
      window.setTimeout(() => {
        if (!aim()) window.setTimeout(aim, 400);
      }, 480);
    }
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
    const archivedAtBySlug = new Map<string, string | null | undefined>();
    for (const [slug, product] of this.productsBySlug) archivedAtBySlug.set(slug, product.archivedAt);
    for (const [slug, piece] of this.joiasBySlug) archivedAtBySlug.set(slug, piece.archivedAt);
    const pieceCount = units.reduce((n, unit) => n + countActiveHangers(unit.hangers, archivedAtBySlug), 0);
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
                {
                  slug: restored.slug,
                  name: restored.name,
                  sortOrder: restored.sortOrder,
                  publishedAt: restored.publishedAt ?? null,
                },
              ];
              this.layout = snapshots.reduce(
                (layout, snapshot) => insertUnitBeforeUncollected(layout, snapshot),
                this.layout,
              );
              this.racks.set(rackNavItems(unitsOfKind(this.layout, kind)));
              for (const snapshot of snapshots) this.engine?.restoreUnit(snapshot);
              this.empty.set(false);
              this.toast.success('Restaurado.');
            },
            error: (err) => {
              this.toast.error(
                archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
              );
            },
          });
        });
      },
      error: (err) => {
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  private onProductArchived(product: Product): void {
    this.layout = removeHangerFromLayout(this.layout, product.slug);
    this.productsBySlug.delete(product.slug);
    this.engine?.removeHanger(product.slug, this.reducedMotion);
    this.hoverTip.set(null);
    this.bumpLayout();
        showArchiveUndo(this.toast, () => {
      this.adminCatalog.restoreViaApi(product.slug).subscribe({
        next: (restored) => {
          this.applySaved(restored);
          this.toast.success('Restaurado.');
        },
        error: (err) =>
          this.toast.error(
            archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
          ),
      });
    });
  }

  private onJoiaArchived(piece: JoiaPiece): void {
    this.layout = removeHangerFromLayout(this.layout, piece.slug);
    this.joiasBySlug.delete(piece.slug);
    this.engine?.removeHanger(piece.slug, this.reducedMotion);
    this.hoverTip.set(null);
    this.bumpLayout();
        showArchiveUndo(this.toast, () => {
      this.joiasAdmin.restore(piece.slug).subscribe({
        next: (restored) => {
          this.applySavedJoia(restored);
          this.toast.success('Restaurado.');
        },
        error: (err) =>
          this.toast.error(
            archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
          ),
      });
    });
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
  }

  private focusedUnit(): SceneRack | null {
    const id = this.focusedId();
    if (id === OVERVIEW_FOCUS_ID || id === DRAFT_UNIT_ID) return null;
    const kind = this.line() === 'joias' ? 'vitrine' : 'rack';
    return unitsOfKind(this.layout, kind).find((r) => r.id === id) ?? null;
  }

  private listAddCandidates(unitId: string): AddPieceCandidate[] {
    const unit = this.layout.racks.find((r) => r.id === unitId);
    if (!unit) return [];
    const hangers = this.layout.racks.flatMap((rack) =>
      rack.hangers.map((h) => ({ slug: h.slug, productId: h.productId, rackId: h.rackId })),
    );
    const units = this.layout.racks.map((rack) => ({ id: rack.id, name: rack.name }));
    const collections = this.collections.map((c) => ({ slug: c.slug, name: c.name }));
    const unitCollectionSlug = collectionSlugFromUnitId(unit.id);
    const ctx = {
      unitId,
      unitCollectionSlug,
      hangers,
      units,
      collections,
      unitProductSlugs: [
        ...unit.hangers.map((h) => h.slug),
        ...unit.hangers.map((h) => h.productId),
        ...this.collectionProducts.current(unitCollectionSlug),
      ],
    };
    if (unit.kind === 'vitrine') {
      return buildAddPieceCandidates(
        [...this.joiasBySlug.values()].map((piece) => ({
          slug: piece.slug,
          id: piece.id,
          name: piece.title,
          thumb: piece.image || joiaGallery(piece)[0],
          collectionSlug: piece.collectionSlug,
          archivedAt: piece.archivedAt,
        })),
        ctx,
      );
    }
    return buildAddPieceCandidates(
      [...this.productsBySlug.values()].map((product) => ({
        slug: product.slug,
        id: product.id,
        name: product.name,
        thumb: product.thumb || product.gallery?.[0],
        collectionSlug: product.collectionSlug,
        collectionName: product.collection,
        archivedAt: product.archivedAt,
      })),
      ctx,
    );
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
  }

  private addOneOptimistic(unitId: string, slug: string): void {
    const unit = this.layout.racks.find((rack) => rack.id === unitId);
    if (!unit) {
      this.addingSlugs.delete(slug);
      return;
    }
    if (unit.kind === 'vitrine') {
      this.addOneJoiaOptimistic(unit, slug);
      return;
    }
    this.addOneProductOptimistic(unit, slug);
  }

  private addOneProductOptimistic(unit: SceneRack, slug: string): void {
    const product = this.productsBySlug.get(slug);
    if (!product) {
      this.markAddPieceFailed(slug, 'Peça não encontrada.');
      return;
    }
    const previous = findHanger(this.layout, slug);
    this.applySaved(product, unit.id, true);
    this.addCount.update((n) => n + 1);
    this.addCandidates.set(this.listAddCandidates(unit.id));
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    if (this.usesLocalCatalog()) {
      this.addingSlugs.delete(slug);
      return;
    }
    this.collectionProducts.append(collectionSlug, [slug]).subscribe({
      next: () => this.addingSlugs.delete(slug),
      error: (err) =>
        this.failAddPiece(
          unit,
          slug,
          adminHttpErrorMessage(err, 'Não foi possível adicionar esta peça.'),
          previous?.rackId ?? null,
        ),
    });
  }

  private addOneJoiaOptimistic(unit: SceneRack, slug: string): void {
    const piece = this.joiasBySlug.get(slug);
    if (!piece) {
      this.markAddPieceFailed(slug, 'Peça não encontrada.');
      return;
    }
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    const next: JoiaPiece = { ...piece, collectionSlug: collectionSlug as CollectionSlug };
    this.joiasAdmin.save(next);
    this.applySavedJoia(next, unit.id, true);
    this.addCount.update((n) => n + 1);
    this.addCandidates.set(this.listAddCandidates(unit.id));
    this.contentAdmin.patchContentField('joia', next.slug, 'collectionSlug', collectionSlug).subscribe({
      next: () => this.addingSlugs.delete(slug),
      error: () => this.addingSlugs.delete(slug),
    });
    if (this.usesLocalCatalog()) this.addingSlugs.delete(slug);
  }

  private failAddPiece(unit: SceneRack, slug: string, message: string, previousRackId: string | null): void {
    this.revertAddedPiece(unit, slug, previousRackId);
    this.addCount.update((n) => Math.max(0, n - 1));
    this.markAddPieceFailed(slug, message);
    this.addCandidates.set(this.listAddCandidates(unit.id));
  }

  private markAddPieceFailed(slug: string, message: string): void {
    this.addingSlugs.delete(slug);
    this.addErrors.update((errors) => [...errors.filter((item) => item.slug !== slug), { slug, message }]);
    this.addPanel?.selected.add(slug);
  }

  private revertAddedPiece(unit: SceneRack, slug: string, previousRackId: string | null): void {
    const collectionSlug = collectionSlugFromUnitId(unit.id);
    this.layout = omitHanger(this.layout, slug);
    this.bumpLayout();
    this.engine?.removeHanger(slug, true);
    if (unit.kind !== 'vitrine') {
      this.collectionProducts.remember(
        collectionSlug,
        this.collectionProducts.current(collectionSlug).filter((item) => item !== slug),
      );
    }
    if (previousRackId && previousRackId !== unit.id) {
      const product = this.productsBySlug.get(slug);
      const piece = this.joiasBySlug.get(slug);
      if (unit.kind === 'vitrine' && piece) this.applySavedJoia(piece, previousRackId, false);
      else if (product) this.applySaved(product, previousRackId, false);
    }
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

    this.adminCatalog.createPublishedProduct$(product).pipe(
      switchMap((created) => {
        this.pendingCreatedProduct = created;
        return this.attachCreatedPhoto$(created, draft.photo);
      }),
    ).subscribe({
      next: (created) => {
        this.pendingCreatedProduct = null;
        afterCreate(created);
      },
      error: (err) => {
        this.addSaving.set(false);
        this.addCreateError.set(
          draft.photo
            ? photoUploadErrorMessage(err)
            : adminHttpErrorMessage(err, 'Não foi possível criar a peça.'),
        );
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
      this.addCandidates.set(this.listAddCandidates(unit.id));
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
      return this.adminCatalog.uploadMediaAsset$(photo, product.name).pipe(
        switchMap((asset) =>
          this.adminCatalog.attachMediaViaApi(product.slug, asset.id, { isPrimary: true }),
        ),
      );
    }
    const url = URL.createObjectURL(photo);
    const withPhoto: Product = { ...product, thumb: url, gallery: [url, ...(product.gallery ?? [])] };
    this.adminCatalog.save(withPhoto);
    return of(withPhoto);
  }

  private retryCreatedPhoto(product: Product, photo: File, unit: SceneRack): void {
    this.attachCreatedPhoto$(product, photo).subscribe({
      next: (created) => {
        this.pendingCreatedProduct = null;
        const collectionSlug = collectionSlugFromUnitId(unit.id);
        if (this.usesLocalCatalog() || !collectionSlug) {
          this.finishCreatePiece(unit, created);
          return;
        }
        this.collectionProducts.append(collectionSlug, [created.slug]).subscribe({
          next: () => this.finishCreatePiece(unit, created),
          error: () => this.finishCreatePiece(unit, created),
        });
      },
      error: (err) => {
        this.addSaving.set(false);
        this.addCreateError.set(photoUploadErrorMessage(err));
      },
    });
  }

  private finishCreatePiece(unit: SceneRack, product: Product): void {
    this.applySaved(product, unit.id, true);
    this.addSaving.set(false);
    this.addCreateError.set('');
    this.addCount.update((n) => n + 1);
    this.addCandidates.set(this.listAddCandidates(unit.id));
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
