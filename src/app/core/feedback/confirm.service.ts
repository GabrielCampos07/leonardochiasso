import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    if (this.state()) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      this.state.set({
        title: options.title ?? 'Confirmar',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        destructive: options.destructive ?? false,
        resolve,
      });
    });
  }

  accept(): void {
    const current = this.state();
    if (!current) return;
    this.state.set(null);
    current.resolve(true);
  }

  cancel(): void {
    const current = this.state();
    if (!current) return;
    this.state.set(null);
    current.resolve(false);
  }
}
