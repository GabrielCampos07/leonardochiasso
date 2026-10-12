import { NgComponentOutlet } from '@angular/common';
import { Component, OnDestroy, Type, inject, signal } from '@angular/core';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';
import { Admin3dPrefetchService } from './admin-3d-prefetch';

/**
 * Eager, three.js-free route wrapper. Starts the scene chunk and catalog HTTP
 * immediately, then swaps in the heavy page when the import resolves.
 */
@Component({
  selector: 'lc-admin-3d-gate',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './admin-3d-gate.html',
  styleUrl: './admin-3d-gate.scss',
})
export class Admin3dGate implements OnDestroy {
  readonly boot = inject(Admin3dBootService);
  readonly page = signal<Type<unknown> | null>(null);

  private cancelled = false;

  constructor() {
    this.boot.begin();
    const prefetch = inject(Admin3dPrefetchService);
    prefetch.prefetchCatalog();
    void prefetch.prefetchPage().then((cmp) => {
      if (!this.cancelled) this.page.set(cmp);
    });
  }

  ngOnDestroy(): void {
    this.cancelled = true;
  }
}
