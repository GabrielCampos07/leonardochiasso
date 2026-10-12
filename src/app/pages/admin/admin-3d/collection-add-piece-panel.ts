import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

export type AddPieceTab = 'existentes' | 'nova';

export interface AddPieceCandidate {
  slug: string;
  name: string;
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
  return `Adicionar ${count}`;
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

  get actionLabel(): string {
    return this.saving ? 'Adicionando…' : addPiecesActionLabel(this.selected.size);
  }

  get createLabel(): string {
    return this.saving ? 'Criando…' : 'Criar e adicionar';
  }

  errorFor(slug: string): string {
    return this.itemErrors.find((item) => item.slug === slug)?.message ?? '';
  }

  setTab(tab: AddPieceTab): void {
    if (this.saving) return;
    this.tab = tab;
  }

  toggle(slug: string): void {
    if (this.saving) return;
    if (this.selected.has(slug)) this.selected.delete(slug);
    else this.selected.add(slug);
  }

  confirm(): void {
    if (this.saving || !this.selected.size) return;
    this.add.emit([...this.selected]);
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
    const allowed = new Set(this.candidates.map((item) => item.slug));
    for (const slug of [...this.selected]) {
      if (!allowed.has(slug)) this.selected.delete(slug);
    }
  }
}
