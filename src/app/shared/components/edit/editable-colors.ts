import { Component, inject, input, output } from '@angular/core';
import { ProductColor } from '../../../core/product.model';
import { AdminSessionService } from '../../../core/admin-session.service';
import { LcEditableText } from './editable-text';

@Component({
  selector: 'lc-editable-colors',
  standalone: true,
  imports: [LcEditableText],
  template: `
    <ul class="pdp__swatches" [attr.aria-label]="label()">
      @for (c of colors(); track c.id) {
        <li>
          <button
            type="button"
            class="pdp__swatch-btn"
            [class.is-active]="activeColorId() === c.id"
            [attr.title]="c.name"
            [attr.aria-label]="c.name"
            [attr.aria-pressed]="activeColorId() === c.id"
            (click)="selectColor.emit(c.id)"
          >
            <span
              class="pdp__swatch"
              [style.background]="c.hex"
              [class.pdp__swatch--light]="isLight(c.hex)"
            ></span>
          </button>
          @if (admin.editMode()) {
            <lc-editable-text
              tag="p"
              [value]="c.name"
              (valueChange)="renameColor.emit({ colorId: c.id, name: $event })"
            />
          }
        </li>
      }
    </ul>
  `,
})
export class LcEditableColors {
  readonly admin = inject(AdminSessionService);
  readonly colors = input.required<ProductColor[]>();
  readonly activeColorId = input<string | null>(null);
  readonly label = input('Cores disponíveis');
  readonly selectColor = output<string>();
  readonly renameColor = output<{ colorId: string; name: string }>();

  isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 188;
  }
}
