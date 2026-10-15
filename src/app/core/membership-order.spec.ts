import {
  compareMembershipSortOrder,
  membershipSortOrder,
  sortByMembershipSortOrder,
} from './membership-order';

describe('membership order (Lista == public API)', () => {
  const collection = 'organic-dreams';

  function piece(
    id: string,
    slug: string,
    sortOrder: number,
  ): { id: string; slug: string; collections: { slug: string; sortOrder: number }[] } {
    return { id, slug, collections: [{ slug: collection, sortOrder }] };
  }

  it('sorts by sortOrder then productId, matching the public API comparator', () => {
    // Same fixture as GET /api/collections/:slug and GET /api/products?collection=
    const publicApiOrder = [
      piece('id-mosaico', 'vestido-longo-mosaico-textil', 0),
      piece('id-assim', 'vestido-lg-assimetrico', 1),
      piece('id-rasgo', 'pantalona-rasgo', 1),
    ];
    const listaInput = [
      piece('id-rasgo', 'pantalona-rasgo', 1),
      piece('id-assim', 'vestido-lg-assimetrico', 1),
      piece('id-mosaico', 'vestido-longo-mosaico-textil', 0),
    ];

    const lista = sortByMembershipSortOrder(listaInput, collection);
    const publicApi = [...publicApiOrder].sort((a, b) =>
      compareMembershipSortOrder(a, b, collection),
    );

    expect(lista.map((p) => p.slug)).toEqual(publicApi.map((p) => p.slug));
    expect(lista.map((p) => p.slug)).toEqual([
      'vestido-longo-mosaico-textil',
      'vestido-lg-assimetrico',
      'pantalona-rasgo',
    ]);
    expect(compareMembershipSortOrder(listaInput[2]!, listaInput[1]!, collection)).toBeLessThan(0);
    expect(membershipSortOrder(listaInput[0]!, collection)).toBe(1);
  });

  it('breaks a shared sortOrder on productId (tie)', () => {
    const tied = [
      piece('id-z', 'pantalona-rasgo', 4),
      piece('id-a', 'vestido-lg-assimetrico', 4),
    ];
    expect(sortByMembershipSortOrder(tied, collection).map((p) => p.slug)).toEqual([
      'vestido-lg-assimetrico',
      'pantalona-rasgo',
    ]);
  });
});
