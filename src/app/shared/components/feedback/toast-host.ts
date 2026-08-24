import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/feedback/toast.service';

@Component({
  selector: 'lc-toast-host',
  standalone: true,
  template: `
    @if (toast.message(); as msg) {
      <div
        class="lc-toast"
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
}
