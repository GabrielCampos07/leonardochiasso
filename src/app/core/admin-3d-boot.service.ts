import { Injectable, signal } from '@angular/core';

export const ADMIN_3D_TTFF_LOG = '[admin-3d] time-to-first-frame';
export const ADMIN_3D_SCENE_COMPLETE_LOG = '[admin-3d] scene-complete';

/**
 * Boot overlay state for `/admin/3d`. Lives outside the lazy three.js chunk so the
 * shell / gate can paint a spinner from the first navigation frame.
 */
@Injectable({ providedIn: 'root' })
export class Admin3dBootService {
  readonly ready = signal(false);
  readonly startedAt = signal(0);
  readonly lastTtffMs = signal<number | null>(null);
  readonly lastCompleteMs = signal<number | null>(null);

  begin(): void {
    this.ready.set(false);
    this.lastTtffMs.set(null);
    this.lastCompleteMs.set(null);
    this.startedAt.set(typeof performance === 'undefined' ? 0 : performance.now());
    showStaticAtelierBoot();
  }

  markFirstFrame(): number {
    if (this.ready()) return this.lastTtffMs() ?? 0;
    const started = this.startedAt();
    const ms = typeof performance === 'undefined' ? 0 : Math.max(0, performance.now() - started);
    this.lastTtffMs.set(ms);
    this.ready.set(true);
    hideStaticAtelierBoot();
    if (typeof console !== 'undefined') {
      console.info(`${ADMIN_3D_TTFF_LOG} ${Math.round(ms)}ms`);
    }
    return ms;
  }

  markSceneComplete(): number {
    if (this.lastCompleteMs() != null) return this.lastCompleteMs() ?? 0;
    const started = this.startedAt();
    const ms = typeof performance === 'undefined' ? 0 : Math.max(0, performance.now() - started);
    this.lastCompleteMs.set(ms);
    if (typeof console !== 'undefined') {
      console.info(`${ADMIN_3D_SCENE_COMPLETE_LOG} ${Math.round(ms)}ms`);
    }
    return ms;
  }

  reset(): void {
    this.ready.set(false);
    this.lastTtffMs.set(null);
    this.lastCompleteMs.set(null);
    hideStaticAtelierBoot();
  }
}

export function showStaticAtelierBoot(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('lc-atelier-booting');
  document.getElementById('lc-atelier-boot')?.classList.add('is-on');
}

export function hideStaticAtelierBoot(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('lc-atelier-booting');
  document.getElementById('lc-atelier-boot')?.classList.remove('is-on');
}
