import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../../core/feedback/confirm.service';

@Component({
  selector: 'lc-confirm-dialog',
  standalone: true,
  template: `
    @if (confirm.state(); as dlg) {
      <div class="lc-confirm" role="presentation">
        <button
          type="button"
          class="lc-confirm__scrim"
          aria-label="Cancelar"
          (click)="confirm.cancel()"
        ></button>
        <div class="lc-confirm__panel" role="alertdialog" aria-modal="true" [attr.aria-labelledby]="'lc-confirm-title'">
          <h2 id="lc-confirm-title" class="lc-confirm__title">{{ dlg.title }}</h2>
          <p class="lc-confirm__message">{{ dlg.message }}</p>
          <div class="lc-confirm__actions">
            <button type="button" class="lc-confirm__btn" (click)="confirm.cancel()">
              {{ dlg.cancelLabel }}
            </button>
            <button
              type="button"
              class="lc-confirm__btn"
              [class.lc-confirm__btn--danger]="dlg.destructive"
              (click)="confirm.accept()"
            >
              {{ dlg.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .lc-confirm {
      position: fixed;
      inset: 0;
      z-index: 1300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .lc-confirm__scrim {
      position: absolute;
      inset: 0;
      border: none;
      padding: 0;
      background: rgb(14 12 14 / 48%);
      cursor: pointer;
    }
    .lc-confirm__panel {
      position: relative;
      width: min(100%, 400px);
      padding: 24px;
      background: var(--lc-white);
      color: var(--lc-void);
      border: 1px solid color-mix(in srgb, var(--lc-void) 12%, transparent);
    }
    .lc-confirm__title {
      margin: 0 0 12px;
      font-family: var(--lc-font-display);
      font-weight: 400;
      font-size: 14px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .lc-confirm__message {
      margin: 0 0 20px;
      font-size: 14px;
      line-height: 1.55;
    }
    .lc-confirm__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .lc-confirm__btn {
      padding: 10px 16px;
      border: 1px solid color-mix(in srgb, var(--lc-void) 22%, transparent);
      background: transparent;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .lc-confirm__btn--danger {
      background: var(--lc-void);
      color: var(--lc-white);
      border-color: var(--lc-void);
    }
  `,
})
export class LcConfirmDialog {
  readonly confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.state()) this.confirm.cancel();
  }
}
