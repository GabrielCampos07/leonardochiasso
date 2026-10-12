import { Component, Input, signal } from '@angular/core';
import {
  COLLECTION_COVER_FALLBACK_DEEP,
  COLLECTION_COVER_FALLBACK_HEX,
  COLLECTION_COVER_FALLBACK_LIGHT,
} from '../../../core/collection-cover';

@Component({
  selector: 'lc-collection-cover',
  standalone: true,
  template: `
    <div
      class="lc-cover"
      [class.lc-cover--fallback]="!shown()"
      role="img"
      [attr.aria-label]="alt || null"
      [attr.aria-hidden]="alt ? null : true"
    >
      @if (shown(); as url) {
        <img [src]="url" [alt]="alt" (error)="onError()" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }
    .lc-cover {
      width: 100%;
      height: 100%;
      min-height: inherit;
      overflow: hidden;
      background: linear-gradient(
        165deg,
        ${COLLECTION_COVER_FALLBACK_LIGHT} 0%,
        ${COLLECTION_COVER_FALLBACK_HEX} 48%,
        ${COLLECTION_COVER_FALLBACK_DEEP} 100%
      );
    }
    .lc-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class CollectionCover {
  private readonly failed = signal(false);
  private url = '';

  @Input() alt = '';

  @Input()
  set src(value: string | null | undefined) {
    this.url = value?.trim() ?? '';
    this.failed.set(false);
  }

  shown(): string | null {
    if (this.failed() || !this.url) return null;
    return this.url;
  }

  onError(): void {
    this.failed.set(true);
  }
}
