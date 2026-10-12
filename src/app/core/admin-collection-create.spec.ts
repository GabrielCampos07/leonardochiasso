import { HttpErrorResponse } from '@angular/common/http';
import {
  COLLECTION_CREATE_CONFLICT,
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
  it('requires name and slug', () => {
    expect(validateCreateCollection('', '')).toEqual({ ok: false, error: COLLECTION_CREATE_REQUIRED });
    expect(validateCreateCollection('   ', '---')).toEqual({ ok: false, error: COLLECTION_CREATE_REQUIRED });
  });

  it('returns the create payload', () => {
    expect(validateCreateCollection('Nova Linha', 'Nova Linha')).toEqual({
      ok: true,
      payload: { name: 'Nova Linha', slug: 'nova-linha' },
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
