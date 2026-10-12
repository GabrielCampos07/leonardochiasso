import {
  findAdminCollection,
  productsInCollection,
} from './admin-collection-edit';

describe('findAdminCollection', () => {
  const live = [{ slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null }];
  const archived = [
    {
      slug: 'teste-col-ux-r',
      name: 'TESTE-COL-UX-R',
      archivedAt: '2026-10-12T12:00:00.000Z',
    },
  ];

  it('finds a live collection in the live list', () => {
    expect(findAdminCollection('organic-dreams', live as never, archived as never)?.name).toBe(
      'Organic Dreams',
    );
  });

  it('loads an archived collection from the archived list (live list excludes it)', () => {
    expect(findAdminCollection('teste-col-ux-r', live as never, [] as never)).toBeUndefined();
    expect(findAdminCollection('teste-col-ux-r', live as never, archived as never)?.name).toBe(
      'TESTE-COL-UX-R',
    );
  });
});

describe('productsInCollection', () => {
  it('keeps products linked to an archived collection via the join', () => {
    const admin = [
      {
        slug: 'vestido',
        collections: [{ slug: 'teste-col-ux-r', name: 'TESTE-COL-UX-R' }],
      },
      { slug: 'outro', collections: [{ slug: 'organic-dreams', name: 'Organic Dreams' }] },
    ];
    const rows = productsInCollection('teste-col-ux-r', admin as never, []);
    expect(rows.map((p) => p.slug)).toEqual(['vestido']);
  });
});
