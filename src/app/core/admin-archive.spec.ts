import { HttpErrorResponse } from '@angular/common/http';
import {
  ARCHIVE_PIECE_MESSAGE,
  ARCHIVE_UNDO_MS,
  ARCHIVE_UNAVAILABLE_MESSAGE,
  archiveAwareError,
  archiveCollectionMessage,
  filterArchivedList,
  isArchiveRouteUnavailable,
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
    expect(isArchivedAt(undefined)).toBeFalse();
  });
});

describe('old API compatibility during deploy', () => {
  it('maps 404/405 archive routes to a friendly toast and keeps other errors', () => {
    const notFound = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      url: '/api/admin/products/vestido/archive',
    });
    const methodNotAllowed = new HttpErrorResponse({
      status: 405,
      statusText: 'Method Not Allowed',
    });
    const unauthorized = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(isArchiveRouteUnavailable(notFound)).toBeTrue();
    expect(isArchiveRouteUnavailable(methodNotAllowed)).toBeTrue();
    expect(isArchiveRouteUnavailable(unauthorized)).toBeFalse();
    expect(archiveAwareError(notFound, 'Não foi possível arquivar.')).toBe(
      ARCHIVE_UNAVAILABLE_MESSAGE,
    );
    expect(archiveAwareError(methodNotAllowed, 'Não foi possível restaurar.')).toBe(
      ARCHIVE_UNAVAILABLE_MESSAGE,
    );
    expect(archiveAwareError(unauthorized, 'Sessão expirada.')).toBe('Sessão expirada.');

    const toast = new ToastService();
    toast.error(archiveAwareError(notFound, 'Não foi possível arquivar.'));
    expect(toast.message()?.text).toBe(ARCHIVE_UNAVAILABLE_MESSAGE);
  });

  it('keeps lists working when items lack archivedAt', () => {
    const fromOldApi = [{ slug: 'a' }, { slug: 'b', archivedAt: undefined }];
    expect(filterArchivedList(fromOldApi, false).map((i) => i.slug)).toEqual(['a', 'b']);
    expect(filterArchivedList(fromOldApi, true)).toEqual([]);
    expect(filterArchivedList(null, false)).toEqual([]);
  });

  it('does not break when ?archived=true is ignored (all items live)', () => {
    const ignoredFlag = [
      { slug: 'live-1', archivedAt: null },
      { slug: 'live-2' },
    ];
    expect(filterArchivedList(ignoredFlag, true)).toEqual([]);
    expect(filterArchivedList(ignoredFlag, false).length).toBe(2);
  });

  it('still splits a mixed list when the new API is up', () => {
    const mixed = [
      { slug: 'live', archivedAt: null },
      { slug: 'gone', archivedAt: '2026-10-12T12:00:00.000Z' },
    ];
    expect(filterArchivedList(mixed, false).map((i) => i.slug)).toEqual(['live']);
    expect(filterArchivedList(mixed, true).map((i) => i.slug)).toEqual(['gone']);
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
