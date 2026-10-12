import { of } from 'rxjs';
import { Admin3dPrefetchService } from './admin-3d-prefetch';

describe('Admin3dPrefetchService', () => {
  it('reuses one catalog request and one page import', () => {
    const list = jasmine.createSpy('list').and.returnValue(of([]));
    const listAdminProducts = jasmine.createSpy('listAdminProducts').and.returnValue(of([]));
    const listPublicProducts = jasmine.createSpy('listPublicProducts').and.returnValue(of([]));
    const loadJoias = jasmine.createSpy('loadJoias').and.returnValue(of([]));
    const service = Object.create(Admin3dPrefetchService.prototype) as Admin3dPrefetchService;
    Object.assign(service, {
      collectionsApi: { list, listAdminProducts, listPublicProducts },
      content: { loadJoias },
      joiasAdmin: { applyTo: (rows: unknown) => rows, list: () => [] },
      pageImport: null,
      catalog$: null,
    });

    const first = service.prefetchCatalog();
    const second = service.prefetchCatalog();
    expect(first).toBe(second);
    first.subscribe();
    expect(list).toHaveBeenCalledTimes(1);
  });
});
