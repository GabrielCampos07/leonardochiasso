import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AdminSessionService } from '../../../core/admin-session.service';

@Component({
  selector: 'lc-editable-text',
  standalone: true,
  template: `
    @if (admin.editMode()) {
      @switch (tag()) {
        @case ('h1') {
          <h1
            class="lc-editable"
            contenteditable="true"
            [textContent]="draft()"
            (blur)="onBlur($event)"
            (keydown.enter)="onEnter($event)"
          ></h1>
        }
        @default {
          <p
            class="lc-editable"
            contenteditable="true"
            [textContent]="draft()"
            (blur)="onBlur($event)"
          ></p>
        }
      }
    } @else {
      @switch (tag()) {
        @case ('h1') {
          <h1>{{ value() }}</h1>
        }
        @default {
          <p>{{ value() }}</p>
        }
      }
    }
  `,
  styles: `
    .lc-editable {
      outline: 2px dashed color-mix(in srgb, var(--lc-void) 28%, transparent);
      outline-offset: 4px;
      cursor: text;
      min-height: 1em;
    }
    .lc-editable:focus {
      outline-color: var(--lc-void);
    }
  `,
})
export class LcEditableText {
  readonly admin = inject(AdminSessionService);
  readonly tag = input<'h1' | 'p'>('p');
  readonly value = input.required<string>();
  readonly valueChange = output<string>();

  readonly draft = signal('');

  constructor() {
    effect(() => {
      this.draft.set(this.value());
    });
  }

  onBlur(event: FocusEvent): void {
    const el = event.target as HTMLElement;
    const text = el.textContent?.trim() ?? '';
    if (text && text !== this.value()) {
      this.valueChange.emit(text);
    }
    this.draft.set(text || this.value());
  }

  onEnter(event: Event): void {
    event.preventDefault();
    const el = event.target as HTMLElement;
    el.blur();
  }
}
