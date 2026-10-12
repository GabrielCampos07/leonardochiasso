import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { UNCOLLECTED_RACK_ID } from '../../../scene-engine/types';
import { collectionSlugFromUnitId } from './atelier-blank';

export type AddPieceTab = 'existentes' | 'nova';

export interface AddPieceCandidate {
  slug: string;
  name: string;
  thumb?: string;
  /** Display name of another collection this piece already hangs in. */
  otherCollection?: string;
  /** Already on the focused rack / vitrine. */
  onRack?: boolean;
}

export interface AddPieceSource {
  slug: string;
  name: string;
  thumb?: string;
  collectionSlug?: string;
  collectionName?: string;
  archivedAt?: string | null;
}

export interface AddPieceItemError {
  slug: string;
  message: string;
}

export interface AddPieceCreatePayload {
  name: string;
  price: number | null;
  stock: number;
  photo: File | null;
}

export function filterAddPieceCandidates(
  candidates: readonly AddPieceCandidate[],
  query: string,
): AddPieceCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...candidates];
  return candidates.filter(
    (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
  );
}

export function addedPiecesLabel(count: number): string {
  if (count <= 0) return '';
  return count === 1 ? '1 peça adicionada' : `${count} peças adicionadas`;
}

export function addPiecesActionLabel(count: number): string {
  if (count <= 0) return 'Adicionar';
  return count === 1 ? 'Adicionar 1 peça' : `Adicionar ${count} peças`;
}

export function otherCollectionCaption(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `em ${trimmed}` : '';
}

export function buildAddPieceCandidates(
  pieces: readonly AddPieceSource[],
  ctx: {
    unitId: string;
    unitCollectionSlug: string;
    hangers: ReadonlyArray<{ slug: string; rackId: string }>;
    units: ReadonlyArray<{ id: string; name: string }>;
    collections: ReadonlyArray<{ slug: string; name: string }>;
  },
): AddPieceCandidate[] {
  const hangerBySlug = new Map(ctx.hangers.map((h) => [h.slug, h]));
  const unitNameById = new Map(ctx.units.map((u) => [u.id, u.name]));
  const collectionNameBySlug = new Map(ctx.collections.map((c) => [c.slug, c.name]));
  return pieces
    .filter((piece) => !piece.archivedAt)
    .map((piece) => {
      const hanger = hangerBySlug.get(piece.slug);
      const onRack = hanger?.rackId === ctx.unitId;
      return {
        slug: piece.slug,
        name: piece.name,
        thumb: piece.thumb,
        onRack,
        otherCollection: onRack
          ? undefined
          : resolveOtherCollectionName(piece, hanger, ctx.unitCollectionSlug, unitNameById, collectionNameBySlug),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function resolveOtherCollectionName(
  piece: AddPieceSource,
  hanger: { slug: string; rackId: string } | undefined,
  unitCollectionSlug: string,
  unitNameById: Map<string, string>,
  collectionNameBySlug: Map<string, string>,
): string | undefined {
  if (hanger && hanger.rackId !== UNCOLLECTED_RACK_ID) {
    const hangerCollection = collectionSlugFromUnitId(hanger.rackId);
    if (hangerCollection && hangerCollection !== unitCollectionSlug) {
      return unitNameById.get(hanger.rackId) ?? collectionNameBySlug.get(hangerCollection);
    }
  }
  if (piece.collectionSlug && piece.collectionSlug !== unitCollectionSlug) {
    // Only caption live collections. Archived names must not appear as "em X".
    return collectionNameBySlug.get(piece.collectionSlug);
  }
  return undefined;
}

export function parseAddPiecePrice(
  raw: string,
  required: boolean,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) return { ok: false, error: 'Informe o preço.' };
    return { ok: true, value: null };
  }
  const normalized = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'Preço inválido.' };
  return { ok: true, value };
}

export function parseAddPieceStock(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: 1 };
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0) return { ok: false, error: 'Estoque inválido.' };
  return { ok: true, value };
}

@Component({
  selector: 'lc-collection-add-piece-panel',
  standalone: true,
  templateUrl: './collection-add-piece-panel.html',
  styleUrl: './collection-add-piece-panel.scss',
})
export class CollectionAddPiecePanel implements OnChanges {
  @Input({ required: true }) unitName = '';
  @Input({ required: true }) candidates: AddPieceCandidate[] = [];
  @Input() sheet = false;
  @Input() saving = false;
  @Input() addedCount = 0;
  @Input() itemErrors: AddPieceItemError[] = [];
  @Input() createError = '';
  @Input() canUpload = true;
  @Input() priceRequired = true;

  @Output() readonly add = new EventEmitter<string[]>();
  @Output() readonly create = new EventEmitter<AddPieceCreatePayload>();
  @Output() readonly close = new EventEmitter<void>();

  tab: AddPieceTab = 'existentes';
  query = '';
  createName = '';
  createPrice = '';
  createStock = '';
  photoName = '';
  formError = '';
  readonly selected = new Set<string>();
  private photo: File | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['candidates']) this.pruneSelection();
  }

  get filtered(): AddPieceCandidate[] {
    return filterAddPieceCandidates(this.candidates, this.query);
  }

  get addedLabel(): string {
    return addedPiecesLabel(this.addedCount);
  }

  get pickCount(): number {
    return [...this.selected].filter((slug) => {
      const item = this.candidates.find((c) => c.slug === slug);
      return item && !item.onRack;
    }).length;
  }

  get actionLabel(): string {
    return addPiecesActionLabel(this.pickCount);
  }

  get createLabel(): string {
    return this.saving ? 'Criando…' : 'Criar e adicionar';
  }

  errorFor(slug: string): string {
    return this.itemErrors.find((item) => item.slug === slug)?.message ?? '';
  }

  isOnRack(slug: string): boolean {
    return Boolean(this.candidates.find((item) => item.slug === slug)?.onRack);
  }

  isChecked(slug: string): boolean {
    return this.isOnRack(slug) || this.selected.has(slug);
  }

  setTab(tab: AddPieceTab): void {
    this.tab = tab;
  }

  toggle(slug: string): void {
    if (this.isOnRack(slug)) return;
    if (this.selected.has(slug)) this.selected.delete(slug);
    else this.selected.add(slug);
  }

  confirm(): void {
    const slugs = [...this.selected].filter((slug) => !this.isOnRack(slug));
    if (!slugs.length) return;
    this.add.emit(slugs);
  }

  createFromSearch(): void {
    this.createName = this.query.trim();
    this.formError = '';
    this.tab = 'nova';
  }

  confirmCreate(): void {
    if (this.saving) return;
    this.formError = '';
    const name = this.createName.trim();
    if (!name) {
      this.formError = 'Informe o nome.';
      return;
    }
    const price = parseAddPiecePrice(this.createPrice, this.priceRequired);
    if (!price.ok) {
      this.formError = price.error;
      return;
    }
    const stock = parseAddPieceStock(this.createStock);
    if (!stock.ok) {
      this.formError = stock.error;
      return;
    }
    this.create.emit({
      name,
      price: price.value,
      stock: stock.value,
      photo: this.photo,
    });
  }

  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photo = file;
    this.photoName = file?.name ?? '';
  }

  finishAdd(added: readonly string[]): void {
    for (const slug of added) this.selected.delete(slug);
    if (!this.selected.size) this.query = '';
  }

  resetCreate(): void {
    this.createName = '';
    this.createPrice = '';
    this.createStock = '';
    this.photo = null;
    this.photoName = '';
    this.formError = '';
  }

  private pruneSelection(): void {
    const allowed = new Set(
      this.candidates.filter((item) => !item.onRack).map((item) => item.slug),
    );
    for (const slug of [...this.selected]) {
      if (!allowed.has(slug)) this.selected.delete(slug);
    }
  }
}
