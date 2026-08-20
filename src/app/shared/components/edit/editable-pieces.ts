import { Component, inject, input, output } from '@angular/core';
import { ProductPiece } from '../../../core/product.model';
import { AdminSessionService } from '../../../core/admin-session.service';
import { LcEditableText } from './editable-text';

@Component({
  selector: 'lc-editable-pieces',
  standalone: true,
  imports: [LcEditableText],
  template: `
    <div class="pdp__pieces-list">
      @for (piece of pieces(); track piece.id) {
        <button
          type="button"
          class="pdp__piece"
          [class.is-active]="activePieceId() === piece.id"
          (click)="selectPiece.emit(piece.id)"
        >
          @if (admin.editMode()) {
            <lc-editable-text
              tag="p"
              [value]="piece.name"
              (valueChange)="renamePiece.emit({ pieceId: piece.id, name: $event })"
            />
          } @else {
            <span class="pdp__piece-name">{{ piece.name }}</span>
          }
          @if (!pricesOnRequest()) {
            <span class="pdp__piece-price">{{ piece.priceLabel }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class LcEditablePieces {
  readonly admin = inject(AdminSessionService);
  readonly pieces = input.required<ProductPiece[]>();
  readonly activePieceId = input<string | null>(null);
  readonly pricesOnRequest = input(false);
  readonly selectPiece = output<string>();
  readonly renamePiece = output<{ pieceId: string; name: string }>();
}
