import { Component, inject } from '@angular/core';
import { AdminSessionService } from '../../../core/admin-session.service';

@Component({
  selector: 'lc-edit-toolbar',
  standalone: true,
  template: `
    @if (admin.editMode()) {
      <div class="edit-bar" role="status" aria-live="polite">
        <span class="edit-bar__label">Modo edição</span>
        <span class="edit-bar__hint">Clique nos campos destacados para editar · fotos por peça/cor no PDP</span>
        <button type="button" class="edit-bar__btn" (click)="admin.toggleEditMode()">Visualizar</button>
      </div>
    }
  `,
  styles: `
    .edit-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px 20px;
      padding: 10px 16px max(10px, env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--lc-void) 92%, transparent);
      color: var(--lc-white);
      font-family: var(--lc-font-body);
      font-size: 12px;
    }
    .edit-bar__label {
      font-family: var(--lc-font-display);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-size: 11px;
    }
    .edit-bar__hint {
      opacity: 0.72;
      text-align: center;
      max-width: 28rem;
      line-height: 1.4;
    }
    .edit-bar__btn {
      padding: 8px 14px;
      border: 1px solid color-mix(in srgb, var(--lc-white) 35%, transparent);
      background: transparent;
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .edit-bar__btn:hover {
      background: color-mix(in srgb, var(--lc-white) 12%, transparent);
    }
  `,
})
export class LcEditToolbar {
  readonly admin = inject(AdminSessionService);
}
