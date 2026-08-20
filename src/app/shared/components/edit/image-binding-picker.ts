import { Component, input, output } from '@angular/core';

@Component({
  selector: 'lc-image-binding-picker',
  standalone: true,
  template: `
    @if (open()) {
      <div class="lc-binding-picker" role="dialog" aria-label="Escolher imagem">
        <header class="lc-binding-picker__head">
          <p>{{ title() }}</p>
          <button type="button" (click)="closed.emit()">Fechar</button>
        </header>
        <div class="lc-binding-picker__grid">
          @for (img of gallery(); track img; let i = $index) {
            <button type="button" (click)="pick.emit(i)">
              <img [src]="img" [alt]="'Foto ' + (i + 1)" />
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .lc-binding-picker {
      position: fixed;
      inset: auto 1rem 5rem 1rem;
      z-index: 1200;
      background: var(--lc-paper);
      border: 1px solid color-mix(in srgb, var(--lc-void) 18%, transparent);
      padding: 1rem;
      max-height: 50vh;
      overflow: auto;
      box-shadow: 0 12px 40px rgb(0 0 0 / 12%);
    }
    .lc-binding-picker__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .lc-binding-picker__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 0.5rem;
    }
    .lc-binding-picker__grid button {
      padding: 0;
      border: 1px solid transparent;
      background: none;
      cursor: pointer;
    }
    .lc-binding-picker__grid button:hover {
      border-color: var(--lc-void);
    }
    .lc-binding-picker__grid img {
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: cover;
    }
  `,
})
export class LcImageBindingPicker {
  readonly open = input(false);
  readonly title = input('Vincular foto');
  readonly gallery = input<string[]>([]);
  readonly pick = output<number>();
  readonly closed = output<void>();
}
