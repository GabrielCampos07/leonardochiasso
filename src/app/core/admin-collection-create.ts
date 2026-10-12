import { HttpErrorResponse } from '@angular/common/http';
import type { CreateCollectionPayload } from './admin-collections-api.service';

/** Same slug rules as the Coleções create form. */
export function slugifyCollection(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

export const COLLECTION_CREATE_REQUIRED = 'Nome e slug são obrigatórios.';
export const COLLECTION_CREATE_CONFLICT = 'Já existe uma coleção com este slug.';
export const COLLECTION_CREATE_FAILED = 'Não foi possível criar a coleção.';

export type CollectionCreateResult =
  | { ok: true; payload: CreateCollectionPayload }
  | { ok: false; error: string };

/** Validation used by the Coleções form and the 3D “Nova coleção” panel. */
export function validateCreateCollection(name: string, slug: string): CollectionCreateResult {
  const trimmedName = name.trim();
  const trimmedSlug = slugifyCollection(slug);
  if (!trimmedName || !trimmedSlug) {
    return { ok: false, error: COLLECTION_CREATE_REQUIRED };
  }
  return { ok: true, payload: { name: trimmedName, slug: trimmedSlug } };
}

export function formatCollectionCreateError(err: unknown, fallback = COLLECTION_CREATE_FAILED): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    const msg = body && typeof body === 'object' ? (body as { message?: string | string[] }).message : body;
    if (Array.isArray(msg) && msg.length) return msg.join(' ');
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (err.status === 409) return COLLECTION_CREATE_CONFLICT;
  }
  if (err && typeof err === 'object') {
    const status = (err as { status?: number }).status;
    const message = (err as { error?: { message?: string | string[] } }).error?.message;
    if (Array.isArray(message) && message.length) return message.join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    if (status === 409) return COLLECTION_CREATE_CONFLICT;
  }
  return fallback;
}
