import { Component, inject, input } from '@angular/core';
import { ToastService } from '../../../core/feedback/toast.service';

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
      z-index: 1200;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      max-width: min(92vw, 420px);
      padding: 12px 18px;
      font-family: var(--lc-font-body);
      font-size: 13px;
      line-height: 1.45;
      text-align: center;
      border: 1px solid color-mix(in srgb, var(--lc-void) 18%, transparent);
      background: color-mix(in srgb, var(--lc-white) 96%, transparent);
      color: var(--lc-void);
      box-shadow: 0 8px 32px rgb(14 12 14 / 12%);
      pointer-events: none;
    }
    .lc-toast:has(.lc-toast__action) {
      pointer-events: auto;
    }
    .lc-toast__action {
      padding: 0;
      border: none;
      background: none;
      color: var(--lc-void);
      font-family: var(--lc-font-display);
      font-size: 11px;
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
      border-color: color-mix(in srgb, var(--lc-void) 28%, transparent);
    }
    .lc-toast--error {
      border-color: color-mix(in srgb, #8b2e2e 45%, transparent);
      background: color-mix(in srgb, #fff5f5 92%, var(--lc-white));
    }
    .lc-toast--info {
      border-color: color-mix(in srgb, var(--lc-ash) 55%, transparent);
    }
  `,
})
export class LcToastHost {
  readonly toast = inject(ToastService);
  /** Admin uses top so the notice never covers the sticky form footer. */
  readonly placement = input<'top' | 'bottom'>('bottom');
}
