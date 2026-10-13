import { Component, input, output } from '@angular/core';

export interface SegmentedOption {
  value: string;
  label: string;
}

@Component({
  selector: 'lc-segmented',
  standalone: true,
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="label() || null">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="seg__btn"
          role="radio"
          [attr.aria-checked]="value() === opt.value"
          [class.is-on]="value() === opt.value"
          [class.is-pulse]="pulse() && value() !== opt.value"
          (click)="select(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      display: inline-flex;
      flex-wrap: nowrap;
      gap: 0;
      border: 1px solid color-mix(in srgb, var(--lc-ash) 55%, transparent);
      background: var(--lc-white);
    }
    .seg__btn {
      min-height: 48px;
      padding: 0 16px;
      border: none;
      border-right: 1px solid color-mix(in srgb, var(--lc-ash) 55%, transparent);
      background: transparent;
      color: var(--lc-void);
      font-family: var(--lc-font-display);
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .seg__btn:last-child {
      border-right: none;
    }
    .seg__btn.is-on {
      background: var(--lc-void);
      color: var(--lc-white);
    }
    .seg__btn.is-pulse {
      animation: lc-seg-pulse 0.9s ease 0s 2;
    }
    @keyframes lc-seg-pulse {
      0%,
      100% {
        box-shadow: none;
      }
      50% {
        box-shadow: inset 0 0 0 2px var(--lc-void);
      }
    }
    @media (max-width: 768px) {
      .seg {
        display: flex;
        width: 100%;
      }
      .seg__btn {
        flex: 1 1 0;
        min-height: 52px;
        font-size: 0.8rem;
        padding: 0 10px;
      }
    }
  `,
})
export class LcSegmented {
  readonly options = input.required<ReadonlyArray<SegmentedOption>>();
  readonly value = input('');
  readonly label = input('');
  readonly pulse = input(false);
  readonly valueChange = output<string>();

  select(next: string): void {
    if (next === this.value()) return;
    this.valueChange.emit(next);
  }
}
