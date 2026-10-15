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
        [attr.role]="msg.kind === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="msg.kind === 'error' ? 'assertive' : 'polite'"
      >
        <span>{{ msg.text }}</span>
        @if (msg.action; as action) {
          <button type="button" class="lc-toast__action" (click)="toast.runAction()">
            {{ action.label }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    .lc-toast {
      position: fixed;
      left: 50%;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      z-index: 2000;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
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
    .lc-toast:has(.lc-toast__action) {
      pointer-events: auto;
    }
    .lc-toast__action {
      padding: 0;
      border: none;
      background: none;
      color: ${TOAST_TEXT};
      font-family: var(--lc-font-display);
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: underline;
      cursor: pointer;
    }
    .lc-toast--top {
      top: calc(16px + env(safe-area-inset-top, 0px));
      bottom: auto;
    }
    .lc-toast--success {
      border-width: 2px;
      border-color: ${TOAST_TEXT};
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      box-shadow: 0 10px 36px rgb(14 12 14 / 22%);
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
