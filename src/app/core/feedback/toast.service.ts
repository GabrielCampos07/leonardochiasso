import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

const DISMISS_MS = 3200;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<ToastMessage | null>(null);

  success(text: string): void {
    this.show('success', text);
  }

  error(text: string): void {
    this.show('error', text);
  }

  info(text: string): void {
    this.show('info', text);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.message.set(null);
  }

  private show(kind: ToastKind, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.timer) clearTimeout(this.timer);

    this.message.set({ id: ++this.seq, kind, text: trimmed });
    this.timer = setTimeout(() => {
      this.message.set(null);
      this.timer = null;
    }, DISMISS_MS);
  }
}
