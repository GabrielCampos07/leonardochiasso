import { Component, input, output } from '@angular/core';

@Component({
  selector: 'lc-trash-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="lc-trash-btn"
      [class.lc-trash-btn--sm]="size() === 'sm'"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      (pointerdown)="$event.stopPropagation()"
      (click)="pressed.emit($event); $event.stopPropagation()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10 11v5M14 11v5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  `,
  styles: `
    :host {
      position: absolute;
      top: 2px;
      right: 2px;
      z-index: 6;
      display: block;
      line-height: 0;
      pointer-events: auto;
    }
    .lc-trash-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      padding: 0;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      background: color-mix(in srgb, var(--lc-void) 78%, transparent);
      color: var(--lc-white);
    }
    .lc-trash-btn--sm {
      width: 1.1rem;
      height: 1.1rem;
    }
    .lc-trash-btn svg {
      width: 0.72rem;
      height: 0.72rem;
    }
    .lc-trash-btn--sm svg {
      width: 0.62rem;
      height: 0.62rem;
    }
    .lc-trash-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
})
export class LcTrashButton {
  readonly ariaLabel = input('Remover');
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md'>('sm');
  readonly pressed = output<MouseEvent>();
}
