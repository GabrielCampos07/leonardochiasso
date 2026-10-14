import { Component, HostListener, input, output, signal } from '@angular/core';

export interface ListPickerOption {
  value: string;
  label: string;
}

function isEmptyPickerLabel(label: string, placeholder: string): boolean {
  const trimmed = label.trim();
  return !trimmed || trimmed === 'Coleção' || trimmed === placeholder;
}

@Component({
  selector: 'lc-list-picker',
  standalone: true,
  template: `
    <div class="lc-picker" [class.is-open]="open()">
      <button
        type="button"
        class="lc-picker__btn"
        [id]="controlId()"
        [attr.aria-label]="label() || null"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        [attr.aria-controls]="listId"
        (click)="toggle($event)"
      >
        <span class="lc-picker__value">{{ currentLabel() }}</span>
      </button>
      @if (open()) {
        <ul
          [id]="listId"
          class="lc-picker__list"
          role="listbox"
          [attr.aria-label]="label() || null"
          (click)="$event.stopPropagation()"
        >
          @for (opt of options(); track opt.value) {
            <li>
              <button
                type="button"
                role="option"
                [attr.aria-selected]="value() === opt.value"
                [class.is-on]="value() === opt.value"
                (click)="pick(opt.value, $event)"
              >
                {{ opt.label }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .lc-picker {
      position: relative;
    }
    .lc-picker__btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 48px;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--lc-ash) 55%, transparent);
      border-radius: 0;
      background: var(--lc-white);
      color: var(--lc-void);
      font-size: 1.1rem;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lc-picker__btn::after {
      content: '';
      flex: none;
      width: 0.45em;
      height: 0.45em;
      margin-left: 12px;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(45deg) translate(-2px, -2px);
    }
    .lc-picker.is-open .lc-picker__btn::after {
      transform: rotate(-135deg) translate(-2px, -2px);
    }
    .lc-picker__value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lc-picker__list {
      position: absolute;
      top: calc(100% - 1px);
      left: 0;
      right: 0;
      z-index: 6;
      max-height: 260px;
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;
      border: 1px solid color-mix(in srgb, var(--lc-ash) 55%, transparent);
      background: var(--lc-white);
    }
    .lc-picker__list button {
      display: block;
      width: 100%;
      min-height: 48px;
      padding: 10px 12px;
      border: none;
      background: transparent;
      color: var(--lc-void);
      font-size: 1.1rem;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lc-picker__list button.is-on,
    .lc-picker__list button:hover {
      background: color-mix(in srgb, var(--lc-ash) 10%, var(--lc-white));
    }
    @media (max-width: 768px) {
      .lc-picker__btn,
      .lc-picker__list button {
        min-height: 52px;
      }
    }
  `,
})
export class LcListPicker {
  readonly options = input.required<ReadonlyArray<ListPickerOption>>();
  readonly value = input('');
  readonly placeholder = input('Selecione');
  readonly label = input('');
  readonly controlId = input('lc-list-picker');
  /** Name resolved from the catalog — used so a preselected `?colecao=` shows after refresh. */
  readonly resolvedLabel = input('');
  readonly valueChange = output<string>();
  readonly opened = output<void>();

  readonly open = signal(false);

  get listId(): string {
    return `${this.controlId()}-list`;
  }

  currentLabel(): string {
    const current = this.value().trim();
    const resolved = this.resolvedLabel().trim();
    const match = this.options().find((opt) => opt.value === current);
    if (resolved && !isEmptyPickerLabel(resolved, this.placeholder())) return resolved;
    if (match?.label && !isEmptyPickerLabel(match.label, this.placeholder())) {
      return match.label;
    }
    if (current) return current;
    return this.placeholder();
  }

  toggle(event: Event): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) this.opened.emit();
  }

  pick(value: string, event: Event): void {
    event.stopPropagation();
    this.open.set(false);
    if (value !== this.value()) this.valueChange.emit(value);
  }

  @HostListener('document:click')
  closeOnOutsideClick(): void {
    if (this.open()) this.open.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  closeOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.open()) return;
    event.preventDefault();
    this.open.set(false);
  }
}
