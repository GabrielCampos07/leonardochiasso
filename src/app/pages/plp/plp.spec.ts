import { isCollectionNotFound, resolvePlpCollectionSlug } from './plp';

describe('resolvePlpCollectionSlug', () => {
  it('keeps a custom slug instead of mapping it to organic-dreams', () => {
    expect(resolvePlpCollectionSlug('teste-colecao2')).toBe('teste-colecao2');
    expect(resolvePlpCollectionSlug('organic-dreams')).toBe('organic-dreams');
  });

  it('does not invent a collection when the param is missing', () => {
    expect(resolvePlpCollectionSlug(null)).toBe('');
    expect(resolvePlpCollectionSlug('  ')).toBe('');
  });
});

describe('isCollectionNotFound', () => {
  it('is true for an unknown slug with no meta and no products', () => {
    expect(isCollectionNotFound('teste-colecao2', null, 0)).toBeTrue();
  });

  it('is false when the API returned the collection or its products', () => {
    expect(isCollectionNotFound('teste-colecao2', { slug: 'teste-colecao2' }, 0)).toBeFalse();
    expect(isCollectionNotFound('teste-colecao2', null, 2)).toBeFalse();
  });

  it('is false for an official slug with an empty product list', () => {
    expect(isCollectionNotFound('organic-dreams', null, 0)).toBeFalse();
  });
});
