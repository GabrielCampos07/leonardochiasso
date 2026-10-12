import {
  ARCHIVE_PIECE_MESSAGE,
  ARCHIVE_UNDO_MS,
  archiveCollectionMessage,
  isArchivedAt,
  showArchiveUndo,
} from './admin-archive';
import { ToastService } from './feedback/toast.service';

describe('archiveCollectionMessage', () => {
  it('keeps pieces in the catalog when a collection is archived', () => {
    expect(archiveCollectionMessage(4)).toContain(ARCHIVE_PIECE_MESSAGE);
    expect(archiveCollectionMessage(4)).toContain(
      'As 4 peças continuam no catálogo, só saem desta coleção',
    );
    expect(archiveCollectionMessage(1)).toContain(
      'As 1 peças continuam no catálogo, só saem desta coleção',
    );
  });

  it('still mentions restore when the collection is empty', () => {
    expect(archiveCollectionMessage(0)).toContain('pode ser restaurada');
    expect(archiveCollectionMessage(0)).not.toContain('continuam no catálogo');
  });
});

describe('isArchivedAt', () => {
  it('treats a timestamp as archived', () => {
    expect(isArchivedAt('2026-10-12T12:00:00.000Z')).toBeTrue();
    expect(isArchivedAt(null)).toBeFalse();
    expect(isArchivedAt('')).toBeFalse();
  });
});

describe('showArchiveUndo', () => {
  it('shows Desfazer for 5 seconds', () => {
    const toast = new ToastService();
    const restore = jasmine.createSpy('restore');
    showArchiveUndo(toast, restore);
    const msg = toast.message();
    expect(msg?.text).toBe('Arquivado.');
    expect(msg?.action?.label).toBe('Desfazer');
    expect(ARCHIVE_UNDO_MS).toBe(5000);
    msg?.action?.run();
    expect(restore).toHaveBeenCalled();
  });
});
