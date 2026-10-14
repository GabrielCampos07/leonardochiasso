import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
  action?: ToastAction;
}

const DISMISS_MS = 3200;
export const SAVE_TOAST_MS = 4000;
export const ERROR_TOAST_MS = 8000;

export interface ToastOptions {
  durationMs?: number;
  action?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly message = signal<ToastMessage | null>(null);

  success(text: string, opts?: ToastOptions): void {
    this.show('success', text, opts?.durationMs, opts?.action);
  }

  error(text: string, opts?: ToastOptions): void {
    this.show('error', text, opts?.durationMs, opts?.action);
  }

  info(text: string, opts?: ToastOptions): void {
    this.show('info', text, opts?.durationMs, opts?.action);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.message.set(null);
  }

  runAction(): void {
    const current = this.message();
    const action = current?.action;
    this.dismiss();
    action?.run();
  }

  private show(kind: ToastKind, text: string, durationMs = DISMISS_MS, action?: ToastAction): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    const current = this.message();
    if (kind === 'success' && current?.kind === 'error') {
      return;
    }

    if (this.timer) clearTimeout(this.timer);

    const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : DISMISS_MS;
    const nextAction = action?.label.trim() ? action : undefined;
    if (current && current.kind === kind && current.text === trimmed) {
      if (current.action !== nextAction) {
        this.message.set({ id: current.id, kind, text: trimmed, action: nextAction });
      }
      this.timer = setTimeout(() => {
        this.message.set(null);
        this.timer = null;
      }, ms);
      return;
    }

    this.message.set({
      id: ++this.seq,
      kind,
      text: trimmed,
      action: nextAction,
    });
    this.timer = setTimeout(() => {
      this.message.set(null);
      this.timer = null;
    }, ms);
  }
}
