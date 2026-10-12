import { Component, inject, input } from '@angular/core';
import { ToastService } from '../../../core/feedback/toast.service';
import { TOAST_BG, TOAST_ERROR_BG, TOAST_ERROR_TEXT, TOAST_TEXT } from './contrast';

@Component({
  selector: 'lc-toast-host',
  standalone: true,
  template: `
    @if (toast.message(); as msg) {
      <div
        class="lc-toast"
        [class.lc-toast--top]="placement() === 'top'"
        [class.lc-toast--success]="msg.kind === 'success'"
        [class.lc-toast--error]="msg.kind === 'error'"
        [class.lc-toast--info]="msg.kind === 'info'"
        role="status"
        aria-live="polite"
      >
        {{ msg.text }}
      </div>
    }
  `,
  styles: `
    .lc-toast {
      position: fixed;
      left: 50%;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      z-index: 1200;
      transform: translateX(-50%);
      max-width: min(92vw, 420px);
      padding: 14px 20px;
      font-family: var(--lc-font-body);
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.4;
      text-align: center;
      border: 1px solid ${TOAST_TEXT};
      background: ${TOAST_BG};
      color: ${TOAST_TEXT};
      box-shadow: 0 8px 32px rgb(14 12 14 / 16%);
      pointer-events: none;
    }
    .lc-toast--top {
      top: calc(16px + env(safe-area-inset-top, 0px));
      bottom: auto;
    }
    .lc-toast--success {
      border-color: ${TOAST_TEXT};
    }
    .lc-toast--error {
      border-color: ${TOAST_ERROR_TEXT};
      background: ${TOAST_ERROR_BG};
      color: ${TOAST_ERROR_TEXT};
    }
    .lc-toast--info {
      border-color: ${TOAST_TEXT};
    }
  `,
})
export class LcToastHost {
  readonly toast = inject(ToastService);
  /** Admin uses top so the notice never covers the sticky form footer. */
  readonly placement = input<'top' | 'bottom'>('bottom');
}
