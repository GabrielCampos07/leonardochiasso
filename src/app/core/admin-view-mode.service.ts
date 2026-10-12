import { Injectable, signal } from '@angular/core';

export type AdminViewMode = 'list' | '3d';

export const ADMIN_VIEW_MODE_KEY = 'lc.admin.viewMode';

export function parseAdminViewMode(value: unknown): AdminViewMode | null {
  return value === 'list' || value === '3d' ? value : null;
}

export function readAdminViewMode(
  storage: Pick<Storage, 'getItem'> | null = defaultStorage(),
): AdminViewMode {
  if (!storage) return 'list';
  try {
    return parseAdminViewMode(storage.getItem(ADMIN_VIEW_MODE_KEY)) ?? 'list';
  } catch {
    return 'list';
  }
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AdminViewModeService {
  private readonly storage = defaultStorage();
  readonly mode = signal<AdminViewMode>(readAdminViewMode(this.storage));

  setMode(mode: AdminViewMode): void {
    this.mode.set(mode);
    try {
      this.storage?.setItem(ADMIN_VIEW_MODE_KEY, mode);
    } catch {
      /* private mode / quota */
    }
  }
}
