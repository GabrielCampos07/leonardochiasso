import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lc-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (href && isExternal) {
      <a
        class="btn"
        [class.btn--ghost]="variant === 'ghost'"
        [class.btn--light]="light"
        [href]="href"
        [attr.aria-disabled]="disabled || null"
      >
        {{ label }}
      </a>
    } @else if (href) {
      <a
        class="btn"
        [class.btn--ghost]="variant === 'ghost'"
        [class.btn--light]="light"
        [routerLink]="href"
        [queryParams]="queryParams"
        [attr.aria-disabled]="disabled || null"
      >
        {{ label }}
      </a>
    } @else {
      <button
        class="btn"
        [class.btn--ghost]="variant === 'ghost'"
        [class.btn--light]="light"
        [disabled]="disabled"
        [type]="type"
      >
        {{ label }}
      </button>
    }
  `,
  styles: `
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 28px;
      background: var(--lc-void);
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-weight: 400;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
    }
    .btn:hover:not(:disabled) {
      opacity: 0.85;
    }
    .btn:disabled,
    .btn[aria-disabled='true'] {
      opacity: 0.4;
      pointer-events: none;
    }
    .btn--ghost {
      background: transparent;
      color: var(--lc-void);
      border: 1px solid var(--lc-void);
    }
    .btn--light {
      background: var(--lc-white);
      color: var(--lc-void);
    }
    .btn--ghost.btn--light {
      background: transparent;
      color: var(--lc-white);
      border-color: var(--lc-white);
    }
  `,
})
export class LcButton {
  @Input() label = '';
  @Input() variant: 'primary' | 'ghost' = 'primary';
  @Input() href: string | null = null;
  @Input() queryParams: Record<string, string> | null = null;
  @Input() disabled = false;
  @Input() light = false;
  @Input() type: 'button' | 'submit' = 'button';

  get isExternal(): boolean {
    return !!this.href && /^(https?:|mailto:)/i.test(this.href);
  }
}
