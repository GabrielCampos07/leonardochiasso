import { routes } from './app.routes';
import { PATH } from './core/routes';

describe('public collection alias', () => {
  it('redirects /colecoes/:slug to /colecao/:slug and keeps the slug param', () => {
    const shell = routes.find((route) => route.path === PATH.home && route.children);
    const alias = shell?.children?.find((route) => route.path === 'colecoes/:collectionSlug');
    const plp = shell?.children?.find((route) => route.path === `${PATH.collection}/:collectionSlug`);
    expect(PATH.collection).toBe('colecao');
    expect(alias?.redirectTo).toBe(`${PATH.collection}/:collectionSlug`);
    expect(alias?.pathMatch).toBe('full');
    expect(plp?.loadComponent).toBeTruthy();
  });

  it('leaves /admin/colecoes/:slug on the collection edit page', () => {
    const admin = routes.find((route) => route.path === PATH.admin);
    const edit = admin?.children?.find((route) => route.path === 'colecoes/:slug');
    expect(edit?.redirectTo).toBeUndefined();
    expect(edit?.loadComponent).toBeTruthy();
  });
});
