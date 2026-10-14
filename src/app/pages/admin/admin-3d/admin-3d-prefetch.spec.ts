import { of, throwError } from 'rxjs';
import { Admin3dCatalogSnapshot, Admin3dPrefetchService } from './admin-3d-prefetch';

function serviceWith(deps: {
  list?: jasmine.Spy;
  listAdminProducts?: jasmine.Spy;
  joiasList$?: jasmine.Spy;
  joiasList?: () => unknown[];
}): {
  service: Admin3dPrefetchService;
  listPublicProducts: jasmine.Spy;
  getPublicDetail: jasmine.Spy;
} {
  const listPublicProducts = jasmine.createSpy('listPublicProducts').and.returnValue(of([]));
  const getPublicDetail = jasmine.createSpy('getPublicDetail').and.callFake(() => {
    throw new Error('admin 3D must not GET /api/collections/:slug');
  });
  const service = Object.create(Admin3dPrefetchService.prototype) as Admin3dPrefetchService;
  Object.assign(service, {
    collectionsApi: {
      list: deps.list ?? jasmine.createSpy('list').and.returnValue(of([])),
      listAdminProducts: deps.listAdminProducts ?? jasmine.createSpy('listAdminProducts').and.returnValue(of([])),
      listPublicProducts,
      getPublicDetail,
    },
    joiasAdmin: {
      list$: deps.joiasList$ ?? jasmine.createSpy('list$').and.returnValue(of([])),
      list: deps.joiasList ?? (() => []),
    },
    pageImport: null,
    catalog$: null,
  });
  return { service, listPublicProducts, getPublicDetail };
}

describe('Admin3dPrefetchService', () => {
  it('reuses one catalog request and one page import', () => {
    const list = jasmine.createSpy('list').and.returnValue(of([]));
    const { service } = serviceWith({ list });
    const first = service.prefetchCatalog();
    const second = service.prefetchCatalog();
    expect(first).toBe(second);
    first.subscribe();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('loads only the admin endpoints, keeping drafts and dropping archived products', () => {
    const products = [
      { slug: 'rascunho', status: 'draft', stockQty: 2, archivedAt: null },
      { slug: 'esgotado', status: 'published', stockQty: 0, archivedAt: null },
      { slug: 'arquivado', status: 'published', stockQty: 1, archivedAt: '2026-10-01T00:00:00.000Z' },
    ];
    const joiasList$ = jasmine.createSpy('list$').and.returnValue(of([{ slug: 'colar' }]));
    const { service, listPublicProducts, getPublicDetail } = serviceWith({
      listAdminProducts: jasmine.createSpy('listAdminProducts').and.returnValue(of(products)),
      joiasList$,
    });
    let snap: Admin3dCatalogSnapshot | undefined;
    service.prefetchCatalog().subscribe((s) => (snap = s));
    expect(listPublicProducts).not.toHaveBeenCalled();
    expect(getPublicDetail).not.toHaveBeenCalled();
    expect(joiasList$).toHaveBeenCalledTimes(1);
    expect(snap!.products.map((p) => p.slug)).toEqual(['rascunho', 'esgotado']);
    expect(snap!.joias.map((j) => j.slug)).toEqual(['colar']);
    expect(Object.keys(snap!)).not.toContain('storefront');
  });

  it('falls back to the local joias overlay when the admin joias request fails', () => {
    const { service } = serviceWith({
      joiasList$: jasmine.createSpy('list$').and.returnValue(throwError(() => new Error('401'))),
      joiasList: () => [{ slug: 'local' }],
    });
    let snap: Admin3dCatalogSnapshot | undefined;
    service.prefetchCatalog().subscribe((s) => (snap = s));
    expect(snap!.joias.map((j) => j.slug)).toEqual(['local']);
  });
});
