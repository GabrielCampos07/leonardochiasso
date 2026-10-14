import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import {
  ADMIN_LOAD_TIMEOUT_MESSAGE,
  ADMIN_LOAD_TIMEOUT_MS,
  ARCHIVE_COLLECTION_MESSAGE,
  ARCHIVE_PIECE_MESSAGE,
  ARCHIVE_UNDO_MS,
  ARCHIVE_UNAVAILABLE_MESSAGE,
  adminAtelierSectionLabel,
  adminLoadErrorMessage,
  archiveAwareError,
  archiveCollectionMessage,
  endAdminLoad,
  filterArchivedList,
  insertAt,
  isArchiveRouteUnavailable,
  countActiveHangers,
  isArchivedAt,
  primaryCollectionLabel,
  removeBySlug,
  showArchiveUndo,
  upsertBySlug,
  visibleCollections,
} from './admin-archive';
import { ToastService } from './feedback/toast.service';

describe('archiveCollectionMessage', () => {
  it('uses collection copy and pluralizes pieces', () => {
    expect(archiveCollectionMessage(4)).toBe(
      `${ARCHIVE_COLLECTION_MESSAGE} As 4 peças dela continuam no catálogo.`,
    );
    expect(archiveCollectionMessage(2)).toContain('As 2 peças dela continuam no catálogo.');
    expect(archiveCollectionMessage(4)).not.toContain(ARCHIVE_PIECE_MESSAGE);
    expect(archiveCollectionMessage(4)).not.toContain('As 1 peças');
  });

  it('uses singular for one piece', () => {
    expect(archiveCollectionMessage(1)).toBe(
      `${ARCHIVE_COLLECTION_MESSAGE} A peça dela continua no catálogo.`,
    );
    expect(archiveCollectionMessage(1)).not.toContain('As 1 peças');
  });

  it('omits the pieces line when the collection is empty', () => {
    expect(archiveCollectionMessage(0)).toBe(ARCHIVE_COLLECTION_MESSAGE);
    expect(archiveCollectionMessage(0)).not.toContain('catálogo');
    expect(archiveCollectionMessage(0)).not.toContain(ARCHIVE_PIECE_MESSAGE);
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

describe('countActiveHangers', () => {
  it('counts only non-archived pieces on the rack', () => {
    const archivedAtBySlug = new Map<string, string | null>([
      ['viva', null],
      ['arquivo', '2026-10-12T12:00:00.000Z'],
    ]);
    expect(
      countActiveHangers(
        [{ slug: 'viva' }, { slug: 'arquivo' }, { slug: 'outra' }],
        archivedAtBySlug,
      ),
    ).toBe(2);
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

describe('endAdminLoad', () => {
  it('completes with ok on a value', (done) => {
    endAdminLoad(of(['a'])).subscribe((result) => {
      expect(result).toEqual({ ok: true, value: ['a'] });
      done();
    });
  });

  it('ends a hung request with an error after the timeout', fakeAsync(() => {
    let result: { ok: boolean; error?: unknown } | undefined;
    endAdminLoad(NEVER, ADMIN_LOAD_TIMEOUT_MS).subscribe((r) => (result = r));
    tick(ADMIN_LOAD_TIMEOUT_MS - 1);
    expect(result).toBeUndefined();
    tick(1);
    expect(ADMIN_LOAD_TIMEOUT_MS).toBe(10_000);
    expect(result?.ok).toBeFalse();
    expect(adminLoadErrorMessage(result?.error, 'falhou')).toBe(ADMIN_LOAD_TIMEOUT_MESSAGE);
  }));
});

describe('visibleCollections / primaryCollectionLabel', () => {
  it('hides archived collections from badges without dropping join slugs from the source', () => {
    const rows = [
      { slug: 'teste-col-ux-r', name: 'TESTE-COL-UX-R', archivedAt: '2026-10-12T12:00:00.000Z' },
      { slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null },
    ];
    expect(visibleCollections(rows).map((c) => c.slug)).toEqual(['organic-dreams']);
    expect(primaryCollectionLabel(rows).name).toBe('Organic Dreams');
    expect(rows.map((c) => c.slug)).toEqual(['teste-col-ux-r', 'organic-dreams']);
  });

  it('returns empty when every collection is archived', () => {
    expect(primaryCollectionLabel([{ slug: 'gone', name: 'Gone', archivedAt: '2026-10-12' }])).toEqual({
      name: '',
      slug: '',
    });
  });
});

describe('optimistic list helpers', () => {
  it('removes, inserts, and upserts by slug', () => {
    const list = [{ slug: 'a' }, { slug: 'b' }];
    expect(removeBySlug(list, 'a')).toEqual([{ slug: 'b' }]);
    expect(insertAt(list, 0, { slug: 'c' }).map((i) => i.slug)).toEqual(['c', 'a', 'b']);
    expect(upsertBySlug(list, { slug: 'b' })).toEqual([{ slug: 'a' }, { slug: 'b' }]);
    expect(upsertBySlug(list, { slug: 'z' }).map((i) => i.slug)).toEqual(['z', 'a', 'b']);
  });
});

describe('adminAtelierSectionLabel', () => {
  it('reflects the current admin section', () => {
    expect(adminAtelierSectionLabel('/admin/produtos')).toBe('produtos');
    expect(adminAtelierSectionLabel('/admin/colecoes/teste-col-ux-r')).toBe('coleções');
    expect(adminAtelierSectionLabel('/admin/joias?x=1')).toBe('joias');
    expect(adminAtelierSectionLabel('/admin/3d')).toBe('3D');
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
