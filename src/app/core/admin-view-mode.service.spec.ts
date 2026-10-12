import { adminProductsListRedirect } from './admin-return-url';
import { ROUTES } from './routes';
import {
  ADMIN_VIEW_MODE_KEY,
  AdminViewModeService,
  parseAdminViewMode,
  readAdminViewMode,
} from './admin-view-mode.service';

describe('parseAdminViewMode', () => {
  it('accepts list and 3d', () => {
    expect(parseAdminViewMode('list')).toBe('list');
    expect(parseAdminViewMode('3d')).toBe('3d');
  });

  it('rejects unknown values', () => {
    expect(parseAdminViewMode('grid')).toBeNull();
    expect(parseAdminViewMode('')).toBeNull();
    expect(parseAdminViewMode(null)).toBeNull();
  });
});

describe('readAdminViewMode', () => {
  it('defaults to list when storage is empty or missing', () => {
    expect(readAdminViewMode(null)).toBe('list');
    expect(readAdminViewMode({ getItem: () => null })).toBe('list');
  });

  it('reads a stored 3d preference', () => {
    expect(readAdminViewMode({ getItem: () => '3d' })).toBe('3d');
  });

  it('falls back when storage throws', () => {
    expect(
      readAdminViewMode({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('list');
  });
});

describe('AdminViewModeService', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_VIEW_MODE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(ADMIN_VIEW_MODE_KEY);
  });

  it('starts on list and persists 3d to lc.admin.viewMode', () => {
    const service = new AdminViewModeService();
    expect(service.mode()).toBe('list');
    service.setMode('3d');
    expect(service.mode()).toBe('3d');
    expect(localStorage.getItem(ADMIN_VIEW_MODE_KEY)).toBe('3d');
  });

  it('hydrates from localStorage on a new instance', () => {
    localStorage.setItem(ADMIN_VIEW_MODE_KEY, '3d');
    const service = new AdminViewModeService();
    expect(service.mode()).toBe('3d');
  });

  it('redirects /admin/produtos to /admin/3d when the stored mode is 3d', () => {
    localStorage.setItem(ADMIN_VIEW_MODE_KEY, '3d');
    const service = new AdminViewModeService();
    expect(adminProductsListRedirect(service.mode())).toBe(ROUTES.admin3d);
    service.setMode('list');
    expect(localStorage.getItem(ADMIN_VIEW_MODE_KEY)).toBe('list');
    expect(adminProductsListRedirect(service.mode())).toBeNull();
  });
});
