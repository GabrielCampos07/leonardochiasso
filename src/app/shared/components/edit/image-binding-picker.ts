import { Component, HostListener, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductPiece } from '../../../core/product.model';
import { LcTrashButton } from '../feedback/trash-button';

@Component({
  selector: 'lc-image-binding-picker',
  standalone: true,
  imports: [FormsModule, LcTrashButton],
  template: `
    @if (open()) {
      <div class="lc-binding" role="presentation">
        <button
          type="button"
          class="lc-binding__scrim"
          aria-label="Fechar"
          (click)="closed.emit()"
        ></button>

        <div
          class="lc-binding__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lc-binding-title"
        >
          <header class="lc-binding__head">
            <div class="lc-binding__titles">
              <h2 id="lc-binding-title" class="lc-binding__title">{{ panelTitle() }}</h2>
              <p class="lc-binding__hint">{{ panelHint() }}</p>
            </div>
            <button type="button" class="lc-binding__close" (click)="closed.emit()">
              Fechar
            </button>
          </header>

          @if (managePieces()) {
            <section class="lc-binding__pieces" aria-label="Peças do look">
              <div class="lc-binding__pieces-head">
                <h3>Peças</h3>
                <button type="button" class="lc-binding__add" (click)="addPiece.emit()">
                  + Adicionar peça
                </button>
              </div>

              @if (pieces().length === 0) {
                <p class="lc-binding__empty">
                  Nenhuma peça ainda. Adicione a primeira para montar o look.
                </p>
              } @else {
                <ul class="lc-binding__piece-list">
                  @for (piece of pieces(); track piece.id) {
                    <li
                      class="lc-binding__piece"
                      [class.is-active]="activePieceId() === piece.id"
                    >
                      <button
                        type="button"
                        class="lc-binding__piece-select"
                        [attr.aria-pressed]="activePieceId() === piece.id"
                        (click)="selectPiece.emit(piece.id)"
                      >
                        Selecionar
                      </button>
                      <label class="lc-binding__piece-name">
                        <span class="visually-hidden">Nome da peça</span>
                        <input
                          type="text"
                          [ngModel]="piece.name"
                          (ngModelChange)="onRename(piece.id, $event)"
                          (focus)="selectPiece.emit(piece.id)"
                        />
                      </label>
                      <lc-trash-button
                        ariaLabel="Remover peça"
                        (pressed)="removePiece.emit(piece.id)"
                      />
                    </li>
                  }
                </ul>
              }
            </section>
          }

          <section class="lc-binding__photos" aria-label="Fotos da galeria">
            <h3 class="lc-binding__photos-title">{{ photosTitle() }}</h3>

            @if (gallery().length === 0) {
              <p class="lc-binding__empty">
                Nenhuma foto na galeria. Adicione imagens ao produto primeiro.
              </p>
            } @else if (managePieces() && !activePieceId()) {
              <p class="lc-binding__empty">
                Selecione uma peça acima para vincular a foto.
              </p>
            } @else {
              <ul class="lc-binding__grid">
                @for (img of gallery(); track img + '-' + i; let i = $index) {
                  <li>
                    <button
                      type="button"
                      class="lc-binding__card"
                      (click)="pick.emit(i)"
                    >
                      <span class="lc-binding__frame">
                        <img [src]="img" [alt]="'Foto ' + (i + 1)" />
                      </span>
                      <span class="lc-binding__label">Foto {{ i + 1 }}</span>
                    </button>
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      </div>
    }
  `,
  styles: `
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .lc-binding {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
    }
    @media (min-width: 768px) {
      .lc-binding {
        align-items: center;
        padding: 24px;
      }
    }
    .lc-binding__scrim {
      position: absolute;
      inset: 0;
      border: none;
      padding: 0;
      background: rgb(14 12 14 / 48%);
      cursor: pointer;
    }
    .lc-binding__panel {
      position: relative;
      width: min(100%, 760px);
      max-height: min(88vh, 720px);
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 20px 24px;
      background: var(--lc-white);
      color: var(--lc-void);
      border: 1px solid color-mix(in srgb, var(--lc-void) 12%, transparent);
      box-shadow: 0 18px 48px rgb(0 0 0 / 18%);
      overflow: auto;
    }
    @media (min-width: 768px) {
      .lc-binding__panel {
        padding: 24px 28px 28px;
      }
    }
    .lc-binding__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
    }
    .lc-binding__titles {
      min-width: 0;
    }
    .lc-binding__title {
      margin: 0 0 6px;
      font-family: var(--lc-font-display);
      font-weight: 400;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      line-height: 1.35;
    }
    .lc-binding__hint {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--lc-ash);
    }
    .lc-binding__close {
      flex-shrink: 0;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 22%, transparent);
      background: transparent;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .lc-binding__close:hover {
      background: color-mix(in srgb, var(--lc-void) 4%, transparent);
    }
    .lc-binding__pieces-head,
    .lc-binding__photos-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .lc-binding__pieces-head h3,
    .lc-binding__photos-title {
      margin: 0;
      font-family: var(--lc-font-display);
      font-weight: 400;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--lc-ash);
    }
    .lc-binding__add {
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 22%, transparent);
      background: transparent;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .lc-binding__add:hover {
      border-color: var(--lc-void);
    }
    .lc-binding__empty {
      margin: 0;
      font-size: 14px;
      line-height: 1.55;
      color: var(--lc-ash);
    }
    .lc-binding__piece-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lc-binding__piece {
      position: relative;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 14%, transparent);
      background: color-mix(in srgb, var(--lc-ash) 6%, var(--lc-white));
    }
    .lc-binding__piece.is-active {
      border-color: var(--lc-void);
      background: color-mix(in srgb, var(--lc-void) 4%, transparent);
    }
    .lc-binding__piece-select {
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 18%, transparent);
      background: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .lc-binding__piece.is-active .lc-binding__piece-select {
      background: var(--lc-void);
      color: var(--lc-white);
      border-color: var(--lc-void);
    }
    .lc-binding__piece-name {
      display: block;
      min-width: 0;
    }
    .lc-binding__piece-name input {
      width: 100%;
      min-height: 36px;
      padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 16%, transparent);
      background: var(--lc-white);
      font-size: 14px;
      color: inherit;
    }
    .lc-binding__piece-name input:focus {
      outline: none;
      border-color: var(--lc-void);
    }
    .lc-binding__piece lc-trash-button {
      position: static;
    }
    .lc-binding__grid {
      list-style: none;
      margin: 0;
      padding: 0 2px 4px 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    @media (min-width: 520px) {
      .lc-binding__grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }
    }
    @media (min-width: 768px) {
      .lc-binding__grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .lc-binding__card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      padding: 0;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      color: inherit;
    }
    .lc-binding__frame {
      display: block;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: color-mix(in srgb, var(--lc-ash) 14%, var(--lc-white));
      border: 1px solid color-mix(in srgb, var(--lc-void) 14%, transparent);
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }
    .lc-binding__frame img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      transition: transform 0.35s ease;
    }
    .lc-binding__card:hover .lc-binding__frame,
    .lc-binding__card:focus-visible .lc-binding__frame {
      border-color: var(--lc-void);
      box-shadow: 0 0 0 1px var(--lc-void);
    }
    .lc-binding__card:hover .lc-binding__frame img,
    .lc-binding__card:focus-visible .lc-binding__frame img {
      transform: scale(1.03);
    }
    .lc-binding__label {
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--lc-ash);
    }
    .lc-binding__card:hover .lc-binding__label,
    .lc-binding__card:focus-visible .lc-binding__label {
      color: var(--lc-void);
    }
  `,
})
export class LcImageBindingPicker {
  readonly open = input(false);
  readonly title = input('Gerenciar peças');
  readonly gallery = input<string[]>([]);
  readonly pieces = input<ProductPiece[]>([]);
  readonly activePieceId = input<string | null>(null);
  /** When true, shows add/rename/remove piece controls. */
  readonly managePieces = input(false);
  readonly colorLabel = input<string | null>(null);

  readonly pick = output<number>();
  readonly closed = output<void>();
  readonly addPiece = output<void>();
  readonly removePiece = output<string>();
  readonly renamePiece = output<{ pieceId: string; name: string }>();
  readonly selectPiece = output<string>();

  readonly panelTitle = computed(() => {
    if (this.managePieces()) return this.title();
    return this.colorLabel() ? `Vincular foto · ${this.colorLabel()}` : this.title();
  });

  readonly panelHint = computed(() => {
    if (this.managePieces()) {
      return 'Adicione, edite ou remova peças do look. Selecione uma peça e escolha a foto da galeria para vincular.';
    }
    return 'Escolha uma foto da galeria para vincular à cor selecionada.';
  });

  readonly photosTitle = computed(() => {
    if (!this.managePieces()) return 'Fotos da galeria';
    const id = this.activePieceId();
    const piece = this.pieces().find((p) => p.id === id);
    return piece ? `Vincular foto · ${piece.name}` : 'Vincular foto';
  });

  private renameTimers = new Map<string, ReturnType<typeof setTimeout>>();

  onRename(pieceId: string, name: string): void {
    const prev = this.renameTimers.get(pieceId);
    if (prev) clearTimeout(prev);
    this.renameTimers.set(
      pieceId,
      setTimeout(() => this.renamePiece.emit({ pieceId, name }), 320),
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
