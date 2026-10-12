import { ConfirmService } from './feedback/confirm.service';
import { ToastService } from './feedback/toast.service';

export const ARCHIVE_PIECE_MESSAGE =
  'A peça sai do site e do 3D, mas pode ser restaurada';

export const ARCHIVE_UNDO_MS = 5000;
export const ARCHIVE_TOAST_TEXT = 'Arquivado.';
export const ARCHIVE_UNDO_LABEL = 'Desfazer';

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
