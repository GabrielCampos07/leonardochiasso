import { HttpErrorResponse } from '@angular/common/http';
import {
  COLLECTION_CREATE_CONFLICT,
  COLLECTION_CREATE_DUPLICATE,
  COLLECTION_CREATE_REQUIRED,
  formatCollectionCreateError,
  slugifyCollection,
  validateCreateCollection,
} from './admin-collection-create';

describe('slugifyCollection', () => {
  it('strips accents and matches the Coleções form', () => {
    expect(slugifyCollection('Organic Dreams')).toBe('organic-dreams');
    expect(slugifyCollection('  Coleção Verão  ')).toBe('colecao-verao');
  });
});

describe('validateCreateCollection', () => {
  it('requires a usable name', () => {
    expect(validateCreateCollection('')).toEqual({ ok: false, error: COLLECTION_CREATE_REQUIRED });
    expect(validateCreateCollection('   ')).toEqual({ ok: false, error: COLLECTION_CREATE_REQUIRED });
    expect(validateCreateCollection('---')).toEqual({ ok: false, error: COLLECTION_CREATE_REQUIRED });
  });

  it('returns the create payload', () => {
    expect(validateCreateCollection('Nova Linha')).toEqual({
      ok: true,
      payload: { name: 'Nova Linha', slug: 'nova-linha' },
    });
  });

  it('rejects a duplicate name or slug', () => {
    const existing = [{ name: 'Organic Dreams', slug: 'organic-dreams' }];
    expect(validateCreateCollection('organic dreams', existing)).toEqual({
      ok: false,
      error: COLLECTION_CREATE_DUPLICATE,
    });
    expect(validateCreateCollection('Organic-Dreams', existing)).toEqual({
      ok: false,
      error: COLLECTION_CREATE_CONFLICT,
    });
  });
});

describe('formatCollectionCreateError', () => {
  it('maps 409 to the collection conflict copy', () => {
    expect(
      formatCollectionCreateError(new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    ).toBe(COLLECTION_CREATE_CONFLICT);
  });

  it('joins API message arrays', () => {
    expect(
      formatCollectionCreateError({ error: { message: ['slug inválido'] }, status: 400 }),
    ).toBe('slug inválido');
  });
});
