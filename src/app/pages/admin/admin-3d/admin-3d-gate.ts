import { NgComponentOutlet } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, Type, inject, signal } from '@angular/core';
import { afterOverlayPaint } from '../../../core/after-overlay-paint';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';
import { Admin3dPrefetchService } from './admin-3d-prefetch';

/**
 * Eager, three.js-free route wrapper. Paints the boot overlay first, then
 * starts the scene chunk and catalog HTTP on the following frames.
 */
@Component({
  selector: 'lc-admin-3d-gate',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './admin-3d-gate.html',
  styleUrl: './admin-3d-gate.scss',
})
export class Admin3dGate implements AfterViewInit, OnDestroy {
  readonly boot = inject(Admin3dBootService);
  readonly page = signal<Type<unknown> | null>(null);

  private readonly prefetch = inject(Admin3dPrefetchService);
  private cancelled = false;

  constructor() {
    this.boot.begin();
  }

  ngAfterViewInit(): void {
    afterOverlayPaint(() => {
      if (this.cancelled) return;
      this.prefetch.prefetchCatalog();
      void this.prefetch.prefetchPage().then((cmp) => {
        if (!this.cancelled) this.page.set(cmp);
      });
    });
  }

  ngOnDestroy(): void {
    this.cancelled = true;
  }
}
