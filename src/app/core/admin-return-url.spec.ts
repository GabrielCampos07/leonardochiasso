import {
  adminLoginDestination,
  adminLoginUrlTree,
  adminProductsListRedirect,
  leaveAdmin3dToList,
  safeAdminReturnUrl,
} from './admin-return-url';
import { ROUTES } from './routes';

describe('safeAdminReturnUrl', () => {
  it('keeps /admin/3d and other admin paths', () => {
    expect(safeAdminReturnUrl('/admin/3d')).toBe('/admin/3d');
    expect(safeAdminReturnUrl('/admin/produtos')).toBe('/admin/produtos');
    expect(safeAdminReturnUrl('/admin/produtos/vestido-longo')).toBe('/admin/produtos/vestido-longo');
  });

  it('rejects the login screen, off-site and non-admin paths', () => {
    expect(safeAdminReturnUrl('/admin')).toBeNull();
    expect(safeAdminReturnUrl('//evil.example/admin/3d')).toBeNull();
    expect(safeAdminReturnUrl('https://evil.example/admin/3d')).toBeNull();
    expect(safeAdminReturnUrl('/conta')).toBeNull();
    expect(safeAdminReturnUrl(null)).toBeNull();
    expect(safeAdminReturnUrl('')).toBeNull();
  });
});

describe('adminLoginDestination', () => {
  it('preserves returnUrl to /admin/3d after login', () => {
    expect(adminLoginDestination('/admin/3d')).toBe('/admin/3d');
  });

  it('falls back to the products list when returnUrl is missing or unsafe', () => {
    expect(adminLoginDestination(null)).toBe(ROUTES.adminProducts);
    expect(adminLoginDestination('/admin')).toBe(ROUTES.adminProducts);
  });
});

describe('adminLoginUrlTree', () => {
  it('sends the guard to /admin with the attempted url as returnUrl', () => {
    const tree = adminLoginUrlTree(
      {
        createUrlTree: (commands, extras) => ({ commands, extras }) as never,
      },
      '/admin/3d',
    );
    expect(tree).toEqual({
      commands: [ROUTES.admin],
      extras: { queryParams: { returnUrl: '/admin/3d' } },
    } as never);
  });
});

describe('adminProductsListRedirect', () => {
  it('opens /admin/3d when lc.admin.viewMode is 3d', () => {
    expect(adminProductsListRedirect('3d')).toBe(ROUTES.admin3d);
  });

  it('stays on the list when mode is list', () => {
    expect(adminProductsListRedirect('list')).toBeNull();
  });
});

describe('leaveAdmin3dToList', () => {
  it('writes list mode and navigates to the products list', () => {
    expect(leaveAdmin3dToList()).toEqual({ mode: 'list', url: ROUTES.adminProducts });
  });
});
