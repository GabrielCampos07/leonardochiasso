import { isAdmin3dMockEnabled, shouldUseLocalAdmin3dCatalog } from './admin-3d-guards';

describe('isAdmin3dMockEnabled', () => {
  it('is always false in production, even with query, storage and env flags', () => {
    expect(
      isAdmin3dMockEnabled({
        production: true,
        envMock: true,
        queryMock: '1',
        storageMock: '1',
      }),
    ).toBeFalse();
  });

  it('honours env, query and storage flags in development', () => {
    expect(isAdmin3dMockEnabled({ production: false, envMock: true })).toBeTrue();
    expect(isAdmin3dMockEnabled({ production: false, queryMock: '1' })).toBeTrue();
    expect(isAdmin3dMockEnabled({ production: false, queryMock: 'true' })).toBeTrue();
    expect(isAdmin3dMockEnabled({ production: false, queryMock: 'full' })).toBeTrue();
    expect(isAdmin3dMockEnabled({ production: true, queryMock: 'full' })).toBeFalse();
    expect(isAdmin3dMockEnabled({ production: false, storageMock: '1' })).toBeTrue();
    expect(isAdmin3dMockEnabled({ production: false })).toBeFalse();
    expect(isAdmin3dMockEnabled({ production: false, queryMock: '0', storageMock: '0' })).toBeFalse();
  });
});

describe('shouldUseLocalAdmin3dCatalog', () => {
  it('never falls back to the local catalog in production', () => {
    expect(shouldUseLocalAdmin3dCatalog({ production: true, useApi: false })).toBeFalse();
    expect(shouldUseLocalAdmin3dCatalog({ production: true, useApi: true })).toBeFalse();
  });

  it('uses the local catalog in development only when the API is off', () => {
    expect(shouldUseLocalAdmin3dCatalog({ production: false, useApi: false })).toBeTrue();
    expect(shouldUseLocalAdmin3dCatalog({ production: false, useApi: true })).toBeFalse();
  });
});
