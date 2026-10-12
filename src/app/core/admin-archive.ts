import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmService } from './feedback/confirm.service';
import { ToastService } from './feedback/toast.service';

export const ARCHIVE_PIECE_MESSAGE =
  'A peça sai do site e do 3D, mas pode ser restaurada';

export const ARCHIVE_UNDO_MS = 5000;
export const ARCHIVE_TOAST_TEXT = 'Arquivado.';
export const ARCHIVE_UNDO_LABEL = 'Desfazer';
export const ARCHIVE_UNAVAILABLE_MESSAGE =
  'Arquivar ainda não está disponível, tente em instantes';

export function archiveCollectionMessage(pieceCount: number): string {
  const head = `${ARCHIVE_PIECE_MESSAGE}.`;
  if (pieceCount <= 0) {
    return `${head} A coleção sai do site e do 3D, mas pode ser restaurada.`;
  }
  return `${head} As ${pieceCount} peças continuam no catálogo, só saem desta coleção.`;
}

export function isArchivedAt(value: string | Date | null | undefined): boolean {
  if (value == null || value === '') return false;
  return true;
}

/** Old API during the 1–2 min deploy window: archive/restore routes are missing. */
export function isArchiveRouteUnavailable(err: unknown): boolean {
  const status =
    err instanceof HttpErrorResponse
      ? err.status
      : typeof err === 'object' && err && 'status' in err
        ? Number((err as { status?: number }).status)
        : 0;
  return status === 404 || status === 405;
}

export function archiveAwareError(err: unknown, otherwise: string): string {
  return isArchiveRouteUnavailable(err) ? ARCHIVE_UNAVAILABLE_MESSAGE : otherwise;
}

/**
 * Client-side filter so lists keep working when the old API ignores
 * `?archived=true` or omits `archivedAt` on items.
 */
export function filterArchivedList<T extends { archivedAt?: string | Date | null }>(
  items: T[] | null | undefined,
  archived: boolean,
): T[] {
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) =>
    archived ? isArchivedAt(item?.archivedAt) : !isArchivedAt(item?.archivedAt),
  );
}

export function confirmArchivePiece(confirm: ConfirmService): Promise<boolean> {
  return confirm.confirm({
    title: 'Arquivar',
    message: ARCHIVE_PIECE_MESSAGE,
    confirmLabel: 'Arquivar',
    destructive: true,
  });
}

export function confirmArchiveCollection(
  confirm: ConfirmService,
  pieceCount: number,
): Promise<boolean> {
  return confirm.confirm({
    title: 'Arquivar coleção',
    message: archiveCollectionMessage(pieceCount),
    confirmLabel: 'Arquivar',
    destructive: true,
  });
}

export function showArchiveUndo(toast: ToastService, restore: () => void): void {
  toast.success(ARCHIVE_TOAST_TEXT, {
    durationMs: ARCHIVE_UNDO_MS,
    action: { label: ARCHIVE_UNDO_LABEL, run: restore },
  });
}
