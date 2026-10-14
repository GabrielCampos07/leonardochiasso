import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { ROUTES } from './routes';
import { ConfirmService } from './feedback/confirm.service';
import { ToastService } from './feedback/toast.service';

export const ARCHIVE_PIECE_MESSAGE =
  'A peça sai do site e do 3D, mas pode ser restaurada';

export const ARCHIVE_UNDO_MS = 5000;
export const ARCHIVE_TOAST_TEXT = 'Arquivado.';
export const ARCHIVE_UNDO_LABEL = 'Desfazer';
export const ARCHIVE_UNAVAILABLE_MESSAGE =
  'Arquivar ainda não está disponível, tente em instantes';

export const ARCHIVE_COLLECTION_MESSAGE =
  'A coleção sai do site e do 3D e pode ser restaurada.';

export function archiveCollectionPiecesLine(pieceCount: number): string {
  if (pieceCount <= 0) return '';
  if (pieceCount === 1) return 'A peça dela continua no catálogo.';
  return `As ${pieceCount} peças dela continuam no catálogo.`;
}

export function archiveCollectionMessage(pieceCount: number): string {
  const pieces = archiveCollectionPiecesLine(pieceCount);
  return pieces ? `${ARCHIVE_COLLECTION_MESSAGE} ${pieces}` : ARCHIVE_COLLECTION_MESSAGE;
}

export const ADMIN_LOAD_TIMEOUT_MS = 15_000;
export const ADMIN_LOAD_TIMEOUT_MESSAGE = 'A lista demorou demais. Tente de novo.';

export type AdminLoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export function endAdminLoad<T>(
  source: Observable<T>,
  timeoutMs = ADMIN_LOAD_TIMEOUT_MS,
): Observable<AdminLoadResult<T>> {
  return source.pipe(
    timeout({ first: timeoutMs }),
    map((value) => ({ ok: true as const, value })),
    catchError((error) => of({ ok: false as const, error })),
  );
}

export function adminLoadErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'TimeoutError') {
    return ADMIN_LOAD_TIMEOUT_MESSAGE;
  }
  return fallback;
}

export function visibleCollections<T extends { archivedAt?: string | Date | null }>(
  collections: T[] | null | undefined,
): T[] {
  return (collections ?? []).filter((c) => !isArchivedAt(c.archivedAt));
}

export function primaryCollectionLabel(
  collections?: { slug: string; name: string; archivedAt?: string | Date | null }[] | null,
  fallback = '',
): { name: string; slug: string } {
  const live = visibleCollections(collections);
  return { name: live[0]?.name ?? fallback, slug: live[0]?.slug ?? '' };
}

export function findBySlug<T extends { slug: string }>(
  items: T[] | null | undefined,
  slug: string,
): T | undefined {
  return (items ?? []).find((item) => item.slug === slug);
}

export function removeBySlug<T extends { slug: string }>(items: T[], slug: string): T[] {
  return items.filter((item) => item.slug !== slug);
}

export function upsertBySlug<T extends { slug: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((row) => row.slug === item.slug);
  if (index < 0) return [item, ...items];
  const next = [...items];
  next[index] = item;
  return next;
}

export function insertAt<T>(items: T[], index: number, item: T): T[] {
  const next = [...items];
  const at = Math.max(0, Math.min(index, next.length));
  next.splice(at, 0, item);
  return next;
}

export function adminAtelierSectionLabel(url: string): string {
  const path = (url.split('?')[0] ?? '').split('#')[0] ?? '';
  if (path.startsWith(ROUTES.admin3d)) return '3D';
  if (path.startsWith(ROUTES.adminCollections)) return 'coleções';
  if (path.startsWith(ROUTES.adminJoias)) return 'joias';
  if (path.startsWith(ROUTES.adminProducts)) return 'produtos';
  return 'produtos';
}

export function isArchivedAt(value: string | Date | null | undefined): boolean {
  if (value == null || value === '') return false;
  return true;
}

/** Archive-collection copy counts only live hangers (archived pieces stay in the catalog). */
export function countActiveHangers(
  hangers: ReadonlyArray<{ slug: string }>,
  archivedAtBySlug: ReadonlyMap<string, string | Date | null | undefined>,
): number {
  return hangers.filter((hanger) => !isArchivedAt(archivedAtBySlug.get(hanger.slug))).length;
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

export function confirmDeletePiece(confirm: ConfirmService, name: string): Promise<boolean> {
  return confirm.confirm({
    title: 'Excluir peça',
    message: `Excluir “${name}”? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    destructive: true,
  });
}

export function confirmDeleteCollection(confirm: ConfirmService, name: string): Promise<boolean> {
  return confirm.confirm({
    title: 'Excluir coleção',
    message: `Excluir “${name}”? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    destructive: true,
  });
}

export function showArchiveUndo(toast: ToastService, restore: () => void): void {
  toast.success(ARCHIVE_TOAST_TEXT, {
    durationMs: ARCHIVE_UNDO_MS,
    action: { label: ARCHIVE_UNDO_LABEL, run: restore },
  });
}
