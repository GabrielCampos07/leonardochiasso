import {
  applyProductIdOrder,
  canReorderWithFilter,
  groupShopProducts,
  isFeminineThenMasculine,
  matchesGenderFilter,
  matchesPublicGenderHub,
  MASCULINO_UNISSEX_NOTICE,
  orderProductId,
  productGender,
  publicGenderBlock,
  storefrontCategory,
} from './product-gender';

function piece(
  slug: string,
  gender: string,
  over: { productId?: string; id?: string; category?: string } = {},
) {
  return {
    slug,
    gender,
    category: over.category ?? (gender === 'masculino' ? 'masculino' : 'feminino'),
    productId: over.productId,
    id: over.id,
  };
}

describe('productGender', () => {
  it('prefers gender and falls back to category', () => {
    expect(productGender({ slug: 'a', gender: 'unissex', category: 'masculino' })).toBe('unissex');
    expect(productGender({ slug: 'a', category: 'masculino' })).toBe('masculino');
    expect(productGender({ slug: 'a', category: 'feminino' })).toBe('feminino');
    expect(productGender({ slug: 'a' })).toBe('feminino');
  });

  it('maps unissex to the feminine storefront hub', () => {
    expect(storefrontCategory({ slug: 'a', gender: 'unissex' })).toBe('feminino');
    expect(publicGenderBlock({ slug: 'a', gender: 'unissex' })).toBe('feminino');
    expect(publicGenderBlock({ slug: 'a', gender: 'masculino' })).toBe('masculino');
  });
});

describe('matchesGenderFilter', () => {
  const fem = piece('vestido', 'feminino');
  const masc = piece('terno', 'masculino');
  const uni = piece('trench', 'unissex');

  it('includes unissex in both Masculino and Feminino admin filters', () => {
    expect(matchesGenderFilter(fem, 'feminino')).toBeTrue();
    expect(matchesGenderFilter(uni, 'feminino')).toBeTrue();
    expect(matchesGenderFilter(masc, 'feminino')).toBeFalse();
    expect(matchesGenderFilter(masc, 'masculino')).toBeTrue();
    expect(matchesGenderFilter(uni, 'masculino')).toBeTrue();
    expect(matchesGenderFilter(fem, 'masculino')).toBeFalse();
    expect(matchesGenderFilter(uni, 'todos')).toBeTrue();
  });

  it('shows unissex once on the site — feminine hub only', () => {
    expect(matchesPublicGenderHub(uni, 'feminino')).toBeTrue();
    expect(matchesPublicGenderHub(fem, 'feminino')).toBeTrue();
    expect(matchesPublicGenderHub(masc, 'feminino')).toBeFalse();
    expect(matchesPublicGenderHub(uni, 'masculino')).toBeFalse();
    expect(matchesPublicGenderHub(masc, 'masculino')).toBeTrue();
  });
});

describe('canReorderWithFilter', () => {
  it('allows drag only with Masculino or Feminino', () => {
    expect(canReorderWithFilter('todos')).toBeFalse();
    expect(canReorderWithFilter('masculino')).toBeTrue();
    expect(canReorderWithFilter('feminino')).toBeTrue();
  });
});

describe('orderProductId / applyProductIdOrder', () => {
  it('prefers the API UUID', () => {
    expect(orderProductId({ slug: 'vestido', productId: 'uuid-1', id: 'vestido' })).toBe('uuid-1');
    expect(orderProductId({ slug: 'vestido', id: 'vestido' })).toBe('vestido');
  });

  it('orders the filtered list by the GET productIds', () => {
    const a = piece('a', 'feminino', { productId: 'id-a' });
    const b = piece('b', 'unissex', { productId: 'id-b' });
    const c = piece('c', 'feminino', { productId: 'id-c' });
    expect(applyProductIdOrder([a, b, c], ['id-c', 'id-a', 'id-b']).map((p) => p.slug)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
});

describe('groupShopProducts', () => {
  const fem = piece('vestido-assimetrico-rasgo', 'feminino');
  const uni = piece('trench-coat', 'unissex');
  const masc = piece('jaqueta-jeans-camiseta-calca-slean', 'masculino');

  it('keeps an already feminine-then-masculine list (API order)', () => {
    const apiOrder = [uni, fem, masc];
    expect(isFeminineThenMasculine(apiOrder)).toBeTrue();
    expect(groupShopProducts(apiOrder)).toEqual(apiOrder);
  });

  it('groups interleaved lists: feminine block (incl. unissex) then masculine', () => {
    const grouped = groupShopProducts([masc, uni, fem]);
    expect(grouped.map((p) => p.slug)).toEqual([
      'vestido-assimetrico-rasgo',
      'trench-coat',
      'jaqueta-jeans-camiseta-calca-slean',
    ]);
    expect(grouped.filter((p) => p.gender === 'unissex')).toHaveSize(1);
  });

  it('places unissex once, in the feminine block', () => {
    const grouped = groupShopProducts([masc, uni, fem]);
    const uniIndex = grouped.findIndex((p) => p.gender === 'unissex');
    const firstMasc = grouped.findIndex((p) => p.gender === 'masculino');
    expect(grouped.filter((p) => p.gender === 'unissex')).toHaveSize(1);
    expect(uniIndex).toBeGreaterThan(-1);
    expect(uniIndex).toBeLessThan(firstMasc);
  });
});

describe('masculino notice copy', () => {
  it('uses the confirmed storefront warning', () => {
    expect(MASCULINO_UNISSEX_NOTICE).toBe('peças unissex aparecem no site no bloco feminino');
  });
});
