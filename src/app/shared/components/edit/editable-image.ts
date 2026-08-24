import { Component, inject, input, output } from '@angular/core';
import { AdminSessionService } from '../../../core/admin-session.service';

/**
 * Storefront image with optional swap control in edit mode.
 *
 * Contract: when the admin picks a file, `pick` emits the `File`.
 * The parent uploads (`ContentAdminService.uploadImage$`) and patches the URL —
 * this component does not upload or persist.
 */
@Component({
  selector: 'lc-editable-image',
  standalone: true,
  template: `
    <figure class="lc-editable-image" [class.is-editable]="admin.editMode()">
      <img [src]="src()" [alt]="alt()" />
      @if (admin.editMode()) {
        <button type="button" class="lc-editable-image__btn" (click)="fileInput.click()">
          Trocar
        </button>
        <input
          #fileInput
          type="file"
          accept="image/*"
          hidden
          (change)="onFileSelected($event)"
        />
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
  /** Emits the chosen image file; parent uploads + patches. */
  readonly pick = output<File>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.pick.emit(file);
  }
}
