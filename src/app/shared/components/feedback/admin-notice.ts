import { Component, input } from '@angular/core';

/**
 * Persistent admin status / alert strip (Lista, coleção, 3D).
 * Use this instead of a raw `<p>` / `<div role="status">`.
 */
@Component({
  selector: 'lc-admin-notice',
  standalone: true,
  template: `<ng-content />`,
  host: {
    class: 'lc-admin-notice',
    '[class.lc-admin-notice--compact]': 'compact()',
    '[attr.role]': 'role()',
  },
  styles: `
    :host {
      display: block;
      margin: 0 0 var(--lc-space-16);
      padding: 12px 14px;
      font-size: 1.05rem;
      line-height: 1.4;
      border: 1px solid color-mix(in srgb, var(--lc-void) 14%, transparent);
      background: color-mix(in srgb, var(--lc-void) 6%, var(--lc-white));
    }
    :host.lc-admin-notice--compact {
      flex: none;
      margin: 0;
      padding: 6px 10px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: color-mix(in srgb, var(--lc-ash) 12%, var(--lc-white));
    }
  `,
})
export class LcAdminNotice {
  readonly role = input<'status' | 'alert'>('status');
  readonly compact = input(false);
}
