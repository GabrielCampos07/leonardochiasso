import { canOpenProductOnSite, productStatusForApi } from './product.model';

describe('productStatusForApi', () => {
  it('sends the DTO field values draft and published', () => {
    expect(productStatusForApi('draft', 'published')).toBe('draft');
    expect(productStatusForApi('published', 'draft')).toBe('published');
  });

  it('does not send archived from the form control — falls back', () => {
    expect(productStatusForApi('archived', 'draft')).toBe('draft');
    expect(productStatusForApi(undefined, 'published')).toBe('published');
  });
});

describe('canOpenProductOnSite', () => {
  it('is only true for a live published piece', () => {
    expect(canOpenProductOnSite('published')).toBeTrue();
    expect(canOpenProductOnSite('draft')).toBeFalse();
    expect(canOpenProductOnSite('archived')).toBeFalse();
    expect(canOpenProductOnSite('published', '2026-10-01T00:00:00.000Z')).toBeFalse();
    expect(canOpenProductOnSite('published', null)).toBeTrue();
  });
});
