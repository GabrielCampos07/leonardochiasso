import { Component, inject, input, output } from '@angular/core';
import { AdminSessionService } from '../../../core/admin-session.service';

@Component({
  selector: 'lc-editable-image',
  standalone: true,
  template: `
    <figure class="lc-editable-image" [class.is-editable]="admin.editMode()">
      <img [src]="src()" [alt]="alt()" />
      @if (admin.editMode()) {
        <button type="button" class="lc-editable-image__btn" (click)="pick.emit()">
          Trocar imagem
        </button>
      }
    </figure>
  `,
  styles: `
    .lc-editable-image {
      position: relative;
      margin: 0;
    }
    .lc-editable-image.is-editable img {
      outline: 2px dashed color-mix(in srgb, var(--lc-void) 28%, transparent);
      outline-offset: 4px;
    }
    .lc-editable-image__btn {
      position: absolute;
      right: 8px;
      bottom: 8px;
      font: inherit;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.35rem 0.6rem;
      border: 1px solid currentColor;
      background: color-mix(in srgb, var(--lc-paper) 92%, transparent);
      cursor: pointer;
    }
  `,
})
export class LcEditableImage {
  readonly admin = inject(AdminSessionService);
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly pick = output<void>();
}
