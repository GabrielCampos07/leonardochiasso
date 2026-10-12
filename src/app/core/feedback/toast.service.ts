import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

const DISMISS_MS = 3200;
export const SAVE_TOAST_MS = 4000;

export interface ToastOptions {
  durationMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<ToastMessage | null>(null);

  success(text: string, opts?: ToastOptions): void {
    this.show('success', text, opts?.durationMs);
  }

  error(text: string, opts?: ToastOptions): void {
    this.show('error', text, opts?.durationMs);
  }

  info(text: string, opts?: ToastOptions): void {
    this.show('info', text, opts?.durationMs);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.message.set(null);
  }

  private show(kind: ToastKind, text: string, durationMs = DISMISS_MS): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.timer) clearTimeout(this.timer);

    const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : DISMISS_MS;
    this.message.set({ id: ++this.seq, kind, text: trimmed });
    this.timer = setTimeout(() => {
      this.message.set(null);
      this.timer = null;
    }, ms);
  }
}
