import { Component, Input } from '@angular/core';

@Component({
  selector: 'lc-fabric-spec',
  standalone: true,
  template: `
    <article class="fabric">
      <p class="fabric__name">{{ name }}</p>
      <p class="fabric__weight">{{ weight }}</p>
      <p class="fabric__note">{{ note }}</p>
    </article>
  `,
  styles: `
    .fabric {
      border-top: 1px solid var(--lc-ash);
      padding: 20px 0;
    }
    .fabric__name {
      font-family: var(--lc-font-display);
      font-size: 14px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .fabric__weight {
      font-family: var(--lc-font-body);
      font-size: 15px;
      margin-bottom: 6px;
    }
    .fabric__note {
      font-family: var(--lc-font-body);
      font-size: 13px;
      color: var(--lc-ash);
      line-height: 1.45;
    }
  `,
})
export class LcFabricSpec {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) weight!: string;
  @Input() note = 'Seasonless';
}
