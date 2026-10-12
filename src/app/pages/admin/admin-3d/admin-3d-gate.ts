import { NgComponentOutlet } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, Type, inject, signal } from '@angular/core';
import { Admin3dBootService } from '../../../core/admin-3d-boot.service';

/**
 * Eager, three.js-free route wrapper. Paints the atelier spinner on first paint,
 * then dynamically imports the heavy scene page.
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

  private cancelled = false;

  constructor() {
    this.boot.begin();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      if (this.cancelled) return;
      void import('./admin-3d-page').then((m) => {
        if (!this.cancelled) this.page.set(m.Admin3dPage);
      });
    });
  }

  ngOnDestroy(): void {
    this.cancelled = true;
  }
}
